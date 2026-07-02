import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Job } from '../models/Job.js';
import { Candidate } from '../models/Candidate.js';
import { Ranking } from '../models/Ranking.js';
import { rankCandidates } from '../services/rank.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const filter = candidateIds?.length ? { _id: { $in: candidateIds } } : {};
    const candidates = await Candidate.find(filter).limit(100);

    const ranked = await rankCandidates(
      {
        title: job.title,
        description: job.description,
        required_skills: job.requiredSkills,
        preferred_skills: job.preferredSkills,
        experience_min: job.experienceMin,
      },
      candidates.map((c) => ({
        id: String(c._id),
        name: c.name,
        skills: c.skills,
        experience_years: c.experienceYears,
        summary: c.summary,
        work_history: c.workHistory,
        language: c.language,
      }))
    );

    const saved = [];
    for (const item of ranked.rankings) {
      const record = await Ranking.findOneAndUpdate(
        { jobId, candidateId: item.candidate_id },
        {
          score: item.score,
          explanation: item.explanation,
          matchedSkills: item.matched_skills,
          missingSkills: item.missing_skills,
        },
        { upsert: true, new: true }
      );
      saved.push(record);
    }

    res.json({ jobId, rankings: ranked.rankings, saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
