import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Resume } from '../models/Resume.js';
import { analyzeFraud } from '../services/fraud.js';

const router = express.Router();

router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { candidateId } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const resume = candidate.resumeId ? await Resume.findById(candidate.resumeId) : null;

    const analysis = await analyzeFraud({
      candidate_id: String(candidate._id),
      resume_text: resume?.rawText || candidate.summary || '',
      structured: {
        name: candidate.name,
        skills: candidate.skills,
        experience_years: candidate.experienceYears,
        work_history: candidate.workHistory,
        education: candidate.education,
      },
    });

    candidate.fraudScore = analysis.risk_score;
    candidate.fraudFlags = analysis.flags.map((f) => f.type);
    await candidate.save();

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/candidates/high-risk', authMiddleware, async (_req, res) => {
  try {
    const candidates = await Candidate.find({ fraudScore: { $gte: 50 } })
      .sort({ fraudScore: -1 })
      .limit(50);
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
