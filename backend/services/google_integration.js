const {google} = require('googleapis');
const pool = require('../db');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google/callback';

if(!CLIENT_ID || !CLIENT_SECRET){
  console.warn('Google client ID/secret not set in environment variables.');
}

function createOAuthClient(redirectUri = REDIRECT_URI){
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

async function getAuthUrl(scopes, state){
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state,
  });
  return url;
}

// store tokens for a user
async function storeTokensForUser(user_id, tokens, tenant_id = null){
  const {access_token, refresh_token, scope, token_type, expiry_date} = tokens;
  // upsert into google_tokens
  const [rows] = await pool.query('SELECT id FROM google_tokens WHERE user_id = ? AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1', [user_id, tenant_id]);
  if(rows.length === 0){
    await pool.query('INSERT INTO google_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, tenant_id) VALUES (?,?,?,?,?,?,?)', [user_id, access_token, refresh_token, scope, token_type, expiry_date, tenant_id]);
  } else {
    await pool.query('UPDATE google_tokens SET access_token=?, refresh_token = COALESCE(?, refresh_token), scope=?, token_type=?, expiry_date=?, tenant_id=? WHERE user_id=? AND (tenant_id = ? OR tenant_id IS NULL)', [access_token, refresh_token, scope, token_type, expiry_date, tenant_id, user_id, tenant_id]);
  }
  return true;
}

// get tokens for user
async function getTokensForUser(user_id, tenant_id = null){
  const [rows] = await pool.query('SELECT * FROM google_tokens WHERE user_id = ? AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1', [user_id, tenant_id]);
  return rows.length ? rows[0] : null;
}

// helper to get authenticated oauth2 client for a user (refreshes if needed)
async function getOAuthClientForUser(user_id){
  const tokens = await getTokensForUser(user_id);
  if(!tokens) throw new Error('No tokens for user');
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date ? Number(tokens.expiry_date) : null,
  });

  // Try to refresh if expired or about to expire
  try{
    // getAccessToken will auto-refresh using refresh_token when necessary
    const at = await oauth2Client.getAccessToken();
    if(at && at.token){
      oauth2Client.credentials.access_token = at.token;
      // persist refreshed token expiry (and access token)
      await storeTokensForUser(user_id, {...oauth2Client.credentials, access_token: at.token});
    }
  }catch(err){
    console.warn('Failed to refresh token for user', user_id, err.message || err.toString());
    // proceed; some calls may fail and be handled upstream
  }
  return oauth2Client;
}

// Send email using Gmail API on behalf of a user
async function sendEmail({user_id, to, subject, body}){
  const oauth2Client = await getOAuthClientForUser(user_id);
  const gmail = google.gmail({version:'v1', auth: oauth2Client});

  // build raw RFC 2822 message and base64url encode
  const messageParts = [
    `From: me`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ];
  const message = messageParts.join('\n');
  const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const res = await gmail.users.messages.send({userId:'me', requestBody: { raw: encoded }});
  return res.data;
}

// List calendar events for a user in a time range
async function listCalendarEvents({user_id, timeMin, timeMax, maxResults=50}){
  const oauth2Client = await getOAuthClientForUser(user_id);
  const calendar = google.calendar({version:'v3', auth: oauth2Client});
  const res = await calendar.events.list({calendarId:'primary', timeMin, timeMax, maxResults, singleEvents:true, orderBy:'startTime'});
  return res.data.items || [];
}

// Create a calendar event for a user
async function createCalendarEvent({user_id, summary, start, end, attendees=[]}){
  const oauth2Client = await getOAuthClientForUser(user_id);
  const calendar = google.calendar({version:'v3', auth: oauth2Client});
  const event = {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    attendees: attendees.map(email=>({email})),
  };
  const res = await calendar.events.insert({calendarId:'primary', requestBody: event});
  return res.data;
}

module.exports = {
  getAuthUrl,
  storeTokensForUser,
  getTokensForUser,
  getOAuthClientForUser,
  sendEmail,
  listCalendarEvents,
  createCalendarEvent
};
