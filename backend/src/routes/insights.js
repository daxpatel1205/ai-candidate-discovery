import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import {
  calculateSkillGap,
  generateRecruiterEmail,
  suggestResumeImprovements,
  answerCandidateQuestion,
  analyzeLinkedInProfile,
} from '../services/insights.js';
import { analyzeLinkedInProfileFull, extractLinkedInProfile } from '../services/linkedinAnalysis.js';

const router = express.Router();

router.post('/skill-gap', authMiddleware, async (req, res) => {
  try {
    const { candidateId, jobId, requiredSkills = [], preferredSkills = [] } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const job = jobId ? await Job.findById(jobId) : null;
    const gap = calculateSkillGap(
      candidate.skills || [],
      job?.requiredSkills || requiredSkills || [],
      job?.preferredSkills || preferredSkills || []
    );

    res.json(gap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/email', authMiddleware, async (req, res) => {
  try {
    const { candidateId, jobId, tone = 'professional' } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const job = jobId ? await Job.findById(jobId) : null;
    const draft = await generateRecruiterEmail(candidate.toObject(), job ? job.toObject() : {}, tone);
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resume-suggestions', authMiddleware, async (req, res) => {
  try {
    const { candidateId, resumeId } = req.body;
    const candidate = candidateId ? await Candidate.findById(candidateId).populate('resumeId') : null;
    const resume = resumeId ? await Resume.findById(resumeId) : candidate?.resumeId;
    if (!candidate && !resume) return res.status(400).json({ error: 'Candidate or resume required' });

    const suggestions = await suggestResumeImprovements(
      candidate ? candidate.toObject() : {},
      resume?.rawText || ''
    );
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 1: Extract profile data from URL (returns preview + raw text)
router.post('/linkedin-extract', async (req, res) => {
  try {
    const { profileUrl = '' } = req.body;
    if (!profileUrl || !profileUrl.includes('linkedin.com/in/')) {
      return res.status(400).json({ error: 'Please provide a valid LinkedIn profile URL (linkedin.com/in/username).' });
    }
    const extracted = extractLinkedInProfile(profileUrl);
    res.json(extracted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Full analysis — auto-extracts from URL if no profileText given
router.post('/linkedin-analyze', async (req, res) => {
  try {
    const { profileUrl = '', profileText = '', targetRole = '' } = req.body;
    if (!profileUrl && !profileText) {
      return res.status(400).json({ error: 'Provide a LinkedIn profile URL.' });
    }
    // If no pasted text, auto-extract from URL
    const textToAnalyze = profileText || extractLinkedInProfile(profileUrl).extractedText;
    const analysis = await analyzeLinkedInProfileFull(profileUrl, textToAnalyze, targetRole);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { candidateId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const answer = await answerCandidateQuestion(candidate.toObject(), message);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
