const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey): null;

router.use(protect);

router.get('/status', async (req, res) => {
  if (!apiKey || !genAI) {
    return res.json({ success: false, aiService: 'offline', message: 'GEMINI_API_KEY missing or invalid' });
  }
  res.json({ success: true, aiService: 'online', model: 'gemini-2.0-flash' });
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!apiKey || !genAI) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: GEMINI_API_KEY is required',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      reply: text
    });

  } catch (error) {
    console.error('Gemini chat error:', error.message);
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

    if (!apiKey || !genAI) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: GEMINI_API_KEY is required' });
    }

    const prompt = `You are an expert AI medical assistant. Analyze the following symptoms for a ${age} years old ${gender}. Symptoms: ${symptoms}. Provide a possible analysis and recommend next steps or precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    res.json({
      success: true,
      analysis: response.text()
    });

  } catch (error) {
    console.error('Symptom analysis error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

router.post('/recommendations', async (req, res) => {
  try {
    const { conditions, medications } = req.body;

    if (!apiKey || !genAI) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: GEMINI_API_KEY is required' });
    }

    const prompt = `A patient has the following medical conditions: ${conditions ? conditions.join(', ') : 'None'} and takes these medications: ${medications ? medications.join(', ') : 'None'}. Provide general health recommendations, lifestyle tips, and precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    res.json({
      success: true,
      recommendations: response.text()
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
