const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const Groq = require("groq-sdk");

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY.trim() })
  : null;

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are HealthAssist AI, an intelligent healthcare assistant built into the HealthChat platform.
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
  if (!groq) return res.json({ success: false, aiService: 'offline', message: 'GROQ_API_KEY missing' });
  res.json({ success: true, aiService: 'online', model: MODEL });
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    if (!groq) return res.status(500).json({ success: false, message: 'GROQ_API_KEY is not configured' });

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    for (const h of (history || []).slice(-10)) {
      if (h.content?.trim()) {
        messages.push({
          role: h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user',
          content: h.content
        });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    res.json({ success: true, reply: response.choices[0].message.content });

  } catch (error) {
    console.error('Groq chat error:', error.message);
    res.status(503).json({ success: false, message: 'AI සේවාව තාවකාලිකව අක්‍රීයයි. කරුණාවෙන් පසුව උත්සාහ කරන්න.' });
  }
});

router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms) return res.status(400).json({ success: false, message: 'Symptoms are required' });
    if (!groq) return res.status(500).json({ success: false, message: 'GROQ_API_KEY is not configured' });

    const prompt = `A ${age || 'unknown age'} year old ${gender || 'person'} has these symptoms: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}. Provide a helpful health assessment and recommend next steps. Remind them to consult a doctor.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    res.json({ success: true, analysis: response.choices[0].message.content });

  } catch (error) {
    console.error('Groq symptom error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

router.post('/recommendations', async (req, res) => {
  try {
    const { conditions, medications } = req.body;
    if (!groq) return res.status(500).json({ success: false, message: 'GROQ_API_KEY is not configured' });

    const prompt = `A patient has conditions: ${conditions?.join(', ') || 'None'} and takes medications: ${medications?.join(', ') || 'None'}. Provide general health recommendations, lifestyle tips, and precautions.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    res.json({ success: true, recommendations: response.choices[0].message.content });

  } catch (error) {
    console.error('Groq recommendations error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

module.exports = router;