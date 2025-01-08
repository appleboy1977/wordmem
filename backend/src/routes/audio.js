const express = require('express');
const fs = require('fs');
const router = express.Router();
const axios = require('axios');
const path = require('path');

const audio_root = path.resolve(__dirname, '../../data/words_audio');
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    //get 
    const audio_file = path.join(audio_root, url);
    const response = fs.readFileSync(audio_file);
    //return audio file

    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.length);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the audio data
    res.send(response);
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

module.exports = router; 