const express = require('express');
const router = express.Router();
const { 
  getAuthUrl, 
  storeTokensForUser, 
  getTokensForUser, 
  getOAuthClientForUser,
  sendEmail,
  listCalendarEvents,
  createCalendarEvent
} = require('../services/google_integration');
const pool = require('../db');
const { google } = require('googleapis');

// get auth url for scopes (client can redirect user to this URL)
router.get('/auth-url', async (req,res)=>{
  try{
    const scopeType = req.query.scope || 'gmail,calendar';
    const scopes = [];
    if(scopeType.includes('gmail')) scopes.push('https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly');
    if(scopeType.includes('calendar')) scopes.push('https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.readonly');
    const url = await getAuthUrl(scopes, JSON.stringify({user_id: req.user.id}));
    res.json({url});
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// exchange code (frontend posts code to server) and store tokens
router.post('/exchange', async (req,res)=>{
  try{
    const {code} = req.body;
    if(!code) return res.status(400).json({error:'Missing code'});
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google/callback');
    const {tokens} = await oauth2Client.getToken(code);
    await storeTokensForUser(req.user.id, tokens, req.tenant_id);
    res.json({ok:true});
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// optional endpoint to check stored tokens
router.get('/tokens', async (req,res)=>{
  try{
    const t = await getTokensForUser(req.user.id, req.tenant_id);
    res.json({tokens: !!t});
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

// Send email via Gmail
router.post('/gmail/send', async (req, res) => {
  try {
    const { to, subject, body, contact_id } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' });
    }
    
    const result = await sendEmail({
      user_id: req.user.id,
      to,
      subject,
      body
    });
    
    // Log email activity
    if (contact_id) {
      await pool.query(
        'INSERT INTO activity_timeline (contact_id, user_id, activity_type, title, description, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [contact_id, req.user.id, 'email', `Email sent to ${to}`, subject, JSON.stringify({ message_id: result.id }), req.tenant_id]
      );
    }
    
    res.json({ ok: true, message_id: result.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// List calendar events
router.get('/calendar/events', async (req, res) => {
  try {
    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax = req.query.timeMax;
    const maxResults = parseInt(req.query.maxResults) || 50;
    
    const events = await listCalendarEvents({
      user_id: req.user.id,
      timeMin,
      timeMax,
      maxResults
    });
    
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create calendar event
router.post('/calendar/events', async (req, res) => {
  try {
    const { summary, start, end, attendees, contact_id } = req.body;
    if (!summary || !start || !end) {
      return res.status(400).json({ error: 'summary, start, and end are required' });
    }
    
    const event = await createCalendarEvent({
      user_id: req.user.id,
      summary,
      start,
      end,
      attendees: attendees || []
    });
    
    // Log activity
    if (contact_id) {
      await pool.query(
        'INSERT INTO activity_timeline (contact_id, user_id, activity_type, title, description, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [contact_id, req.user.id, 'meeting', `Meeting: ${summary}`, `Meeting scheduled from ${start} to ${end}`, JSON.stringify({ event_id: event.id }), req.tenant_id]
      );
    }
    
    res.json({ ok: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Sync Gmail messages (list recent emails)
router.get('/gmail/messages', async (req, res) => {
  try {
    const oauth2Client = await getOAuthClientForUser(req.user.id);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const maxResults = parseInt(req.query.maxResults) || 10;
    const query = req.query.q || '';
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query
    });
    
    const messages = response.data.messages || [];
    const messageDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        return detail.data;
      })
    );
    
    res.json({ messages: messageDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
