import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Resume } from '../models/Resume.js';
import { reviewResume } from '../services/resumeReview.js';

const router = express.Router();

// Public — AI resume review (no auth required)
router.post('/review', async (req, res) => {
  try {
    const { resumeText = '', jobTitle = '', jobDescription = '' } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ error: 'Please provide resume text (minimum 50 characters).' });
    }
    const review = reviewResume(resumeText.trim(), jobTitle.trim(), jobDescription.trim());
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 }).limit(200);
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
