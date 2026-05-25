
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// All AI routes require login
router.use(protect);

// ── Health check for AI service ───────────────────────────────────────────────
router.get('/status', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.json({ success: false, aiService: 'offline', message: 'API Key missing' });
  }
  res.json({ success: true, aiService: 'online', model: 'gemini-2.5-flash' });
});

// ── Chat with Gemini ──────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // 🚀 කෙලින්ම Node.js එකෙන් Gemini 2.5 Flash වෙත කතා කිරීම
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
    });

    res.json({
      success: true,
      reply: response.text
    });

  } catch (error) {
    console.error('Gemini chat error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI සේවාව තාවකාලිකව අක්‍රීයයි. කරුණාවෙන් පසුව උත්සාහ කරන්න.',
    });
  }
});

// ── Symptom analysis ──────────────────────────────────────────────────────────
router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;

    const prompt = `You are an expert AI medical assistant. Analyze the following symptoms for a ${age} years old ${gender}. 
    Symptoms: ${symptoms}. Provide a possible analysis and recommend next steps or precautions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      analysis: response.text
    });

  } catch (error) {
    console.error('Symptom analysis error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

// ── Health recommendations ────────────────────────────────────────────────────
router.post('/recommendations', async (req, res) => {
  try {
    const { conditions, medications } = req.body;

    const prompt = `A patient has the following medical conditions: ${conditions.join(', ')} and takes these medications: ${medications.join(', ')}. 
    Provide general health recommendations, lifestyle tips, and precautions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      recommendations: response.text
    });

  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

module.exports = router;