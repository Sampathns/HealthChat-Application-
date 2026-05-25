/**
 * AI Routes — Gemini Only
 * Proxies requests to the Python FastAPI AI microservice
 */
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { protect } = require('../middleware/auth');

const AI_URL = process.env.AI_SERVICE_URL || 'https://healthchat-application-1.onrender.com';

// All AI routes require login
router.use(protect);

// ── Health check for AI service ───────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
    res.json({ success: true, aiService: 'online', ...data });
  } catch {
    res.json({ success: false, aiService: 'offline', message: 'AI service not reachable' });
  }
});

// ── Chat with Gemini ──────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${AI_URL}/ai/chat`,
      {
        message:   req.body.message,
        history:   req.body.history || [],
        user_role: req.user.role,
        user_name: req.user.name,
      },
      { timeout: 30000 }
    );
    res.json(data);
  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again.',
    });
  }
});

// ── Symptom analysis ──────────────────────────────────────────────────────────
router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${AI_URL}/ai/analyze-symptoms`,
      {
        symptoms: req.body.symptoms,
        age:      req.body.age,
        gender:   req.body.gender,
      },
      { timeout: 30000 }
    );
    res.json(data);
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
    const { data } = await axios.post(
      `${AI_URL}/ai/recommendations`,
      {
        conditions:  req.body.conditions  || [],
        medications: req.body.medications || [],
      },
      { timeout: 30000 }
    );
    res.json(data);
  } catch (error) {
    console.error('Recommendations error:', error.message);
    res.status(503).json({
      success: false,
      message: 'AI service temporarily unavailable.',
    });
  }
});

module.exports = router;
