import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Job } from '../models/Job.js';
import { compareCandidates } from '../services/compare.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { candidateIds, jobId } = req.body;
    if (!candidateIds?.length || candidateIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 candidate IDs required' });
    }

    const candidates = await Candidate.find({ _id: { $in: candidateIds } });
    const job = jobId ? await Job.findById(jobId) : null;

    const data = await compareCandidates(
      job
        ? {
            title: job.title,
            description: job.description,
            required_skills: job.requiredSkills,
          }
        : null,
      candidates.map((c) => ({
        id: String(c._id),
        name: c.name,
        skills: c.skills,
        experience_years: c.experienceYears,
        summary: c.summary,
        fraud_score: c.fraudScore,
        work_history: c.workHistory,
      }))
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
