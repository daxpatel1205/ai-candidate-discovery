import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Job } from '../models/Job.js';
import { generateInterviewQuestions } from '../services/interview.js';

const router = express.Router();

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const {
      candidateId,
      jobId,
      difficulty = 'medium',
      count = 10,
      categories = ['technical', 'behavioral', 'situational'],
      language = 'en',
      topic,
    } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const job = jobId ? await Job.findById(jobId) : null;

    const questions = await generateInterviewQuestions({
      candidate: {
        name: candidate.name,
        skills: candidate.skills,
        experience_years: candidate.experienceYears,
        summary: candidate.summary,
        work_history: candidate.workHistory,
      },
      job: job
        ? {
            title: job.title,
            description: job.description,
            required_skills: job.requiredSkills,
          }
        : null,
      difficulty,
      count,
      categories,
      language,
      topic,
    });

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
