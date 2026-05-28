const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are HealthAssist AI, an intelligent healthcare assistant built into the HealthChat platform.
You help patients and doctors with:
- Symptom assessment and health triage
- General health information and medical education
- Medication information and reminders
- Appointment scheduling guidance
- Healthy lifestyle and wellness recommendations
- Explaining medical terminology in simple language

STRICT RULES — follow these always:
1. NEVER diagnose diseases — always say "consult a licensed physician"
2. NEVER prescribe medications or specific dosages
3. For ANY emergency symptoms (chest pain, stroke signs, severe bleeding, unconsciousness) → immediately say "Call emergency services now"
4. Always be empathetic, warm, and professional
5. Use simple, easy-to-understand language
6. Always remind the user you are an AI, not a real doctor
7. Keep responses concise but thorough — use bullet points when listing items
You ONLY use Google Gemini AI. Respond in the same language the user writes in.`;

// Helper: Get Gemini model instance (request time එකේදීම init කරනවා — Render restart after inactivity fix)
const getModel = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  });
};

router.use(protect);

// ── GET /api/ai/status ───────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  const keySet = !!(process.env.GEMINI_API_KEY || '').trim();
  res.json({
    success: true,
    aiService: keySet ? 'online' : 'offline',
    model: 'gemini-1.5-flash',
    message: keySet ? 'Gemini AI ready' : 'GEMINI_API_KEY missing',
  });
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const model = getModel();

    // History එක Gemini format එකට හදනවා (last 10 messages only — token limit)
    const geminiHistory = (history || [])
      .slice(-10)
      .filter(h => h && h.content && h.content.trim())
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

    const chatSession = model.startChat({ history: geminiHistory });
    const result = await chatSession.sendMessage(message.trim());
    const reply = result.response.text();

    res.json({ success: true, reply, response: reply });
  } catch (error) {
    console.error('Gemini chat error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service is temporarily unavailable. Please try again shortly.',
    });
  }
});

// ── POST /api/ai/analyze-symptoms ────────────────────────────────────────────
router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, age, gender } = req.body;
    if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    const symptomsText = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;
    const ageStr = age ? `${age} year old` : 'unknown age';
    const genderStr = gender || 'person';

    const prompt = `A ${ageStr} ${genderStr} is experiencing these symptoms: ${symptomsText}.
Please provide a structured health assessment:
1. Possible causes (list top 3)
2. Urgency level (Low / Medium / High) with reason
3. Recommended next steps
4. Home care tips if applicable
Remember to include a disclaimer to consult a doctor.`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    res.json({
      success: true,
      analysis: { analysis, symptoms_evaluated: symptomsText },
      disclaimer: '⚠️ This is AI-generated for informational purposes only. Please consult a licensed healthcare provider.',
    });
  } catch (error) {
    console.error('Symptom analysis error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

// ── POST /api/ai/recommendations ─────────────────────────────────────────────
router.post('/recommendations', async (req, res) => {
  try {
    const { conditions = [], medications = [] } = req.body;
    const condStr = conditions.length ? conditions.join(', ') : 'None reported';
    const medStr = medications.length ? medications.join(', ') : 'None';

    const prompt = `Generate personalized health recommendations for a patient with:
- Medical conditions: ${condStr}
- Current medications: ${medStr}

Please cover:
1. Lifestyle modifications
2. Dietary advice
3. Exercise recommendations
4. Precautionary tips
5. Any notable general interactions to be aware of
Include a disclaimer to always consult a doctor.`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    const recommendations = result.response.text();

    res.json({
      success: true,
      recommendations,
      conditions,
      medications,
    });
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(503).json({ success: false, message: 'AI service temporarily unavailable.' });
  }
});

module.exports = router;