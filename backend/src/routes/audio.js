const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Set appropriate headers
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Length', response.headers['content-length']);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the audio data
    res.send(response.data);
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

module.exports = router; 