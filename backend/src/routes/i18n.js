import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Resume } from '../models/Resume.js';
import { detectLanguage, translateText } from '../services/i18n.js';

const router = express.Router();

router.post('/detect', authMiddleware, async (req, res) => {
  try {
    const { text, candidateId, resumeId } = req.body;
    let content = text;

    if (!content && candidateId) {
      const candidate = await Candidate.findById(candidateId);
      if (candidate?.resumeId) {
        const resume = await Resume.findById(candidate.resumeId);
        content = resume?.rawText;
      }
    }
    if (!content && resumeId) {
      const resume = await Resume.findById(resumeId);
      content = resume?.rawText;
    }
    if (!content) {
      return res.status(400).json({ error: 'Text, candidateId, or resumeId required' });
    }

    const result = await detectLanguage(content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage, candidateId } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and targetLanguage are required' });
    }

    const result = await translateText(text, targetLanguage, sourceLanguage);

    if (candidateId && targetLanguage === 'en') {
      await Candidate.findByIdAndUpdate(candidateId, { language: result.detected_source || sourceLanguage });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/languages', authMiddleware, (_req, res) => {
  res.json({
    supported: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'hi', name: 'Hindi' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ja', name: 'Japanese' },
    ],
  });
});

export default router;
