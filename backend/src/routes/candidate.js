import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Resume } from '../models/Resume.js';

const router = express.Router();

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const candidates = await Candidate.find().sort({ createdAt: -1 }).limit(200);
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('resumeId');
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const update = { ...req.body };
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    if (candidate.resumeId) {
      await Resume.findByIdAndDelete(candidate.resumeId);
    }
    await candidate.deleteOne();

    res.json({ message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
