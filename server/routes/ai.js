const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.use(protect);

router.get('/status', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
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

    // 🔑 රික්වෙස්ට් එක එන වෙලාවෙම API Key එක තියෙනවාද කියලා Double-Check කරනවා
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server Configuration Error: GEMINI_API_KEY is missing on Render.' 
      });
    }

    // 🚀 හැමවෙලේම නිවැරදිව Client එක මෙතනදී Initialize වෙනවා
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is missing.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `You are an expert AI medical assistant. Analyze the following symptoms for a ${age} years old ${gender}. Symptoms: ${symptoms}. Provide a possible analysis and recommend next steps or precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is missing.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `A patient has the following medical conditions: ${conditions ? conditions.join(', ') : 'None'} and takes these medications: ${medications ? medications.join(', ') : 'None'}. Provide general health recommendations, lifestyle tips, and precautions.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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