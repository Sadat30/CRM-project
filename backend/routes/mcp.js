const express = require('express');
const router = express.Router();
const pool = require('../db');

// very small MCP handler: summarize a contact
router.post('/query', async (req,res)=>{
  try{
    const {intent, target} = req.body;
    if(intent === 'summarize_customer' && target?.type === 'contact'){
      const [rows] = await pool.query('SELECT * FROM contacts WHERE id = ? LIMIT 1', [target.id]);
      if(rows.length === 0) return res.status(404).json({error:'Contact not found'});
      const contact = rows[0];
      // build a tiny summary
      const summary = `Name: ${contact.name} | Company: ${contact.company || '-'} | Email: ${contact.email || '-'} | Phone: ${contact.phone || '-'}. Notes: ${contact.notes ? contact.notes.substring(0,200) : '-'}`;
      return res.json({status:'ok', summary, sources:[{table:'contacts', id: contact.id}]});
    }
    res.status(400).json({error:'Unsupported intent or target'});
  }catch(err){ console.error(err); res.status(500).json({error: err.message});}
});

module.exports = router;
