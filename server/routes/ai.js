const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_PROMPT = `You are HealthAssist AI, an intelligent healthcare assistant.
Help users with symptom assessment, health information, medication info, and wellness tips.
RULES:
- NEVER diagnose diseases — always say "consult a licensed physician"
- NEVER prescribe medications or dosages
- For emergencies (chest pain, stroke, severe bleeding) → say "Call emergency services immediately"
- Always remind users you are an AI, not a real doctor
- Be empathetic, warm, and professional
- Respond in the same language the user writes in`;

router.use(protect);

router.get('/status', (req, res) => {
  if (!apiKey || !ai) return res.json({ success: false, aiService: 'offline', message: 'GEMINI_API_KEY missing' });
  res.json({ success: true, aiService: 'online', model: 'gemini-2.0-flash' });
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    if (!apiKey || !ai) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured' });

    // Build conversation history
    const contents = [];
    for (const h of (history || []).slice(-10)) {
      if (h.content?.trim()) {
        contents.push({ role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user', parts: [{ text: h.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    res.json({ success: true, reply: response.text });

  } catch (error) {
    console.error('Gemini chat error:', error.message);
    res.status(503).json({ success: false, message: 'AI සේවාව තාවකාලිකව අක්‍රීයයි. කරුණාවෙන් පසුව උත්සාහ කරන්න.' });
  }
});

router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'Symptoms are required' });
    if (!apiKey || !ai) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured' });

    const prompt = `You are a medical AI assistant. A ${age || 'unknown age'} year old ${gender || 'person'} has these symptoms: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}. Provide a helpful health assessment and recommend next steps. Remind them to consult a doctor.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7, maxOutputTokens: 1024 },
    });

    res.json({ success: true, analysis: response.text });

  } catch (error) {
    console.error('Symptom analysis error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

router.post('/recommendations', async (req, res) => {
  try {
    const { conditions, medications } = req.body;
    if (!apiKey || !ai) return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured' });

    const prompt = `A patient has conditions: ${conditions?.join(', ') || 'None'} and takes medications: ${medications?.join(', ') || 'None'}. Provide general health recommendations, lifestyle tips, and precautions.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.7, maxOutputTokens: 1024 },
    });

    res.json({ success: true, recommendations: response.text });

  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

module.exports = router;