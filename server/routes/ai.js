const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
let genAI = null;
try {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set in environment');
  } else {
    // Construct client with an options object (API expects a named param)
    genAI = new GoogleGenerativeAI({ apiKey });
  }
} catch (err) {
  console.error('Failed to initialize GoogleGenerativeAI client:', err && err.message ? err.message : err);
}

router.use(protect);

router.get('/status', async (req, res) => {
  if (!apiKey) {
    return res.json({ success: false, aiService: 'offline', message: 'API Key missing' });
  }
  res.json({ success: true, aiService: 'online', model: 'gemini-1.5-flash' });
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!genAI) throw new Error('Generative AI client not initialized');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      reply: text
    });

  } catch (error) {
    // Log full error where possible to help debugging 403 issues
    console.error('Gemini chat error:', error && error.message ? error.message : error);
    if (error && error.response) {
      try { console.error('Gemini response data:', JSON.stringify(error.response.data || error.response, null, 2)); } catch (e) {}
    }
    // Fallback: proxy the request to the separate Python ai-service if configured
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const fallback = await axios.post(`${aiServiceUrl}/ai/chat`, { message }, { timeout: 15000 });
      if (fallback && fallback.data) {
        const reply = fallback.data.response || fallback.data.reply || fallback.data;
        return res.json({ success: true, reply });
      }
    } catch (fallbackErr) {
      console.error('Fallback to ai-service failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
    }
    res.status(503).json({
      success: false,
      message: 'AI සේවාව තාවකාලිකව අක්‍රීයයි. කරුණාවෙන් පසුව උත්සාහ කරන්න.',
    });
  }
});

router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;

    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    const prompt = `You are an expert AI medical assistant. Analyze the following symptoms for a ${age} years old ${gender}. Symptoms: ${symptoms}. Provide a possible analysis and recommend next steps or precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    res.json({
      success: true,
      analysis: response.text()
    });

  } catch (error) {
    console.error('Symptom analysis error:', error && error.message ? error.message : error);
    // Fallback to Python ai-service
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const fallback = await axios.post(`${aiServiceUrl}/ai/analyze-symptoms`, { symptoms, age, gender }, { timeout: 15000 });
      if (fallback && fallback.data) {
        return res.json(fallback.data);
      }
    } catch (fallbackErr) {
      console.error('Fallback to ai-service failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
    }
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

router.post('/recommendations', async (req, res) => {
  try {
    const { conditions, medications } = req.body;

    const prompt = `A patient has the following medical conditions: ${conditions ? conditions.join(', ') : 'None'} and takes these medications: ${medications ? medications.join(', ') : 'None'}. Provide general health recommendations, lifestyle tips, and precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    res.json({
      success: true,
      recommendations: response.text()
    });

  } catch (error) {
    console.error('Recommendations error:', error && error.message ? error.message : error);
    // Fallback to Python ai-service
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const fallback = await axios.post(`${aiServiceUrl}/ai/recommendations`, { conditions, medications }, { timeout: 15000 });
      if (fallback && fallback.data) {
        return res.json(fallback.data);
      }
    } catch (fallbackErr) {
      console.error('Fallback to ai-service failed:', fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr);
    }
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

module.exports = router;