import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { LiveJob } from '../models/LiveJob.js';
import { UserJobActivity } from '../models/UserJobActivity.js';
import { Candidate } from '../models/Candidate.js';
import { runLiveJobsSync } from '../services/liveJobsSync.js';
import {
  analyzeLiveJobMatching,
  generateJobOutreachEmail,
  generateJobInterviewQuestions
} from '../services/liveJobsAI.js';

const router = express.Router();

// ─── Simple In-Memory Rate Limiter Middleware ────────────────────────────────
const ipCounts = new Map();
function simpleRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  let record = ipCounts.get(ip);
  if (!record) {
    record = { count: 1, resetTime: now + windowMs };
    ipCounts.set(ip, record);
  } else {
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }
  }

  if (record.count > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again in 1 minute.' });
  }
  next();
}

// ─── Simple In-Memory Cache Helper ───────────────────────────────────────────
const apiCache = new Map();
function getCachedData(key) {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    apiCache.delete(key);
    return null;
  }
  return entry.data;
}
function setCachedData(key, data, ttlMs = 15 * 1000) { // 15s cache ttl
  apiCache.set(key, { data, expiry: Date.now() + ttlMs });
}
function clearCache() {
  apiCache.clear();
}

router.use(simpleRateLimiter);

// ─── GET /api/live-jobs - Paginated List & Filters ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      company,
      location,
      workMode,
      experience,
      salaryRange,
      sourcePlatform,
      visaSponsorship,
      internship,
      freshers,
      candidateId
    } = req.query;

    const query = { duplicateOf: null }; // Exclude duplicate jobs by default

    // Keyword Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requiredSkills: { $regex: search, $options: 'i' } }
      ];
    }

    if (company) {
      query.companyName = { $regex: company, $options: 'i' };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (workMode) {
      query.workMode = workMode;
    }

    if (sourcePlatform) {
      query.sourcePlatform = sourcePlatform;
    }

    if (visaSponsorship === 'true') {
      query.visaSponsorship = true;
    }

    if (internship === 'true') {
      query.employmentType = 'Internship';
    }

    if (freshers === 'true') {
      query.$or = [
        { experienceMin: 0 },
        { experienceMin: { $lte: 1 } },
        { experienceRequired: /fresher|junior|0-/i }
      ];
    }

    // Experience filters (Senior, Mid, Entry)
    if (experience) {
      if (experience === 'senior') {
        query.experienceMin = { $gte: 5 };
      } else if (experience === 'mid') {
        query.experienceMin = { $gte: 2, $lt: 5 };
      } else if (experience === 'entry') {
        query.experienceMin = { $lt: 2 };
      }
    }

    // Cache key incorporates all query parameters plus candidateId
    const cacheKey = `list-${JSON.stringify(req.query)}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const skipCount = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await LiveJob.find(query)
      .sort({ datePosted: -1 })
      .skip(skipCount)
      .limit(parseInt(limit));

    const totalCount = await LiveJob.countDocuments(query);

    // If candidateId is provided, append live match scores to the results
    let jobsWithScores = jobs;
    if (candidateId) {
      const candidate = await Candidate.findById(candidateId);
      if (candidate) {
        jobsWithScores = await Promise.all(
          jobs.map(async (job) => {
            const matchData = await analyzeLiveJobMatching(candidate.toObject(), job.toObject());
            return {
              ...job.toObject(),
              aiMatchScore: matchData.matchScore,
              resumeMatchPercentage: matchData.resumeMatchPercentage,
              missingSkills: matchData.missingSkills,
              matchedSkills: matchData.matchedSkills
            };
          })
        );
      }
    }

    const result = {
      jobs: jobsWithScores,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      totalJobs: totalCount
    };

    setCachedData(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/live-jobs/dashboard - Dashboard Summary Statistics ──────────────
router.get('/dashboard', async (req, res) => {
  try {
    const { candidateId } = req.query;
    
    // Optional auth extraction
    let userId = null;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
        userId = decoded.id || decoded._id;
      } catch (e) {}
    }

    const cacheKey = `dashboard-${userId || 'guest'}-${candidateId || 'none'}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [
      totalLiveJobs,
      newJobsToday,
      companiesHiring,
      remoteJobsCount,
      internshipsCount,
      fresherJobsCount,
      activityCounts
    ] = await Promise.all([
      LiveJob.countDocuments({ duplicateOf: null }),
      LiveJob.countDocuments({ duplicateOf: null, datePosted: { $gte: oneDayAgo } }),
      LiveJob.distinct('companyName').then(list => list.length),
      LiveJob.countDocuments({ duplicateOf: null, workMode: 'Remote' }),
      LiveJob.countDocuments({ duplicateOf: null, employmentType: 'Internship' }),
      LiveJob.countDocuments({ duplicateOf: null, $or: [{ experienceMin: 0 }, { experienceMin: { $lte: 1 } }] }),
      userId ? UserJobActivity.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            savedCount: { $sum: { $cond: ['$saved', 1, 0] } },
            appliedCount: { $sum: { $cond: ['$applied', 1, 0] } }
          }
        }
      ]) : Promise.resolve([])
    ]);

    // Aggregate Trending Skills from active requiredSkills
    const skillAggregation = await LiveJob.aggregate([
      { $match: { duplicateOf: null } },
      { $unwind: '$requiredSkills' },
      { $group: { _id: { $toUpper: '$requiredSkills' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);
    const trendingSkills = skillAggregation.map(s => ({ name: s._id, count: s.count }));

    // If candidateId is provided, generate Recommended Jobs
    let recommended = [];
    if (candidateId) {
      const candidate = await Candidate.findById(candidateId);
      if (candidate && candidate.skills && candidate.skills.length > 0) {
        // Find jobs matching at least one of candidate's skills
        const rawRecommended = await LiveJob.find({
          duplicateOf: null,
          requiredSkills: { $in: candidate.skills.map(s => new RegExp(`^${s}$`, 'i')) }
        }).limit(5);

        recommended = await Promise.all(
          rawRecommended.map(async (job) => {
            const matchData = await analyzeLiveJobMatching(candidate.toObject(), job.toObject());
            return {
              ...job.toObject(),
              aiMatchScore: matchData.matchScore
            };
          })
        );
        // Sort by match score
        recommended.sort((a, b) => b.aiMatchScore - a.aiMatchScore);
      }
    }

    const saved = activityCounts?.[0]?.savedCount || 0;
    const applied = activityCounts?.[0]?.appliedCount || 0;

    const dashboardData = {
      totalLiveJobs,
      newJobsToday,
      trendingSkills,
      companiesHiring,
      remoteJobs: remoteJobsCount,
      internshipCount: internshipsCount,
      fresherJobs: fresherJobsCount,
      savedJobs: saved,
      appliedJobs: applied,
      recommendedJobs: recommended
    };

    setCachedData(cacheKey, dashboardData);
    res.json(dashboardData);
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/live-jobs/saved/export - Export saved jobs as JSON ─────────────
router.get('/saved/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const activities = await UserJobActivity.find({ userId, saved: true }).populate('jobId');
    
    const savedJobs = activities.map(act => {
      const job = act.jobId;
      if (!job) return null;
      return {
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        workMode: job.workMode,
        salary: job.salary,
        requiredSkills: job.requiredSkills,
        applyLink: job.applyLink,
        sourcePlatform: job.sourcePlatform,
        savedAt: act.updatedAt,
        applicationStatus: act.applicationStatus
      };
    }).filter(Boolean);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=saved_jobs_export.json');
    res.send(JSON.stringify(savedJobs, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/sync - Sync live jobs on demand ──────────────────────
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    // Only allow admins or recruiters to trigger sync
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    const result = await runLiveJobsSync();
    clearCache(); // Invalidate cache immediately on sync
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/live-jobs/:id - Single Job Details ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { candidateId } = req.query;
    const job = await LiveJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let matchAnalysis = null;
    if (candidateId) {
      const candidate = await Candidate.findById(candidateId);
      if (candidate) {
        matchAnalysis = await analyzeLiveJobMatching(candidate.toObject(), job.toObject());
      }
    }

    res.json({
      job,
      matchAnalysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/save - Toggle Save Job ───────────────────────────
router.post('/:id/save', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const activity = await UserJobActivity.findOneAndUpdate(
      { userId, jobId },
      [
        { $set: { saved: { $not: '$saved' } } }
      ],
      { upsert: true, new: true }
    );

    clearCache();
    res.json({ saved: activity.saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/apply - Register Apply Clicks ────────────────────
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const activity = await UserJobActivity.findOneAndUpdate(
      { userId, jobId },
      { $set: { applied: true, applicationStatus: 'Applied' } },
      { upsert: true, new: true }
    );

    clearCache();
    res.json({ applied: activity.applied, status: activity.applicationStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/status - Track Application Status ────────────────
router.post('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;
    const jobId = req.params.id;

    if (!['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const activity = await UserJobActivity.findOneAndUpdate(
      { userId, jobId },
      { $set: { applicationStatus: status } },
      { upsert: true, new: true }
    );

    clearCache();
    res.json({ status: activity.applicationStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/alert - Toggle Alerts ────────────────────────────
router.post('/:id/alert', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const activity = await UserJobActivity.findOneAndUpdate(
      { userId, jobId },
      [
        { $set: { alertEnabled: { $not: '$alertEnabled' } } }
      ],
      { upsert: true, new: true }
    );

    res.json({ alertEnabled: activity.alertEnabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/ai-analyze - Calculate Full AI Report ────────────
router.post('/:id/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) return res.status(400).json({ error: 'Candidate ID is required' });

    const job = await LiveJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const analysis = await analyzeLiveJobMatching(candidate.toObject(), job.toObject());
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/recruiter/email - Generate Outreach Email ────────
router.post('/:id/recruiter/email', authMiddleware, async (req, res) => {
  try {
    const { candidateId, tone = 'professional' } = req.body;
    if (!candidateId) return res.status(400).json({ error: 'Candidate ID is required' });

    const job = await LiveJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const email = await generateJobOutreachEmail(candidate.toObject(), job.toObject(), tone);
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/live-jobs/:id/recruiter/questions - Generate Questions ─────────
router.post('/:id/recruiter/questions', authMiddleware, async (req, res) => {
  try {
    const job = await LiveJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const questions = await generateJobInterviewQuestions(job.toObject());
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/live-jobs/:id/recruiter/rank-applicants - Rank Candidate DB ─────
router.get('/:id/recruiter/rank-applicants', authMiddleware, async (req, res) => {
  try {
    const job = await LiveJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const candidates = await Candidate.find();
    
    // Rank all candidates in DB against this job
    const rankings = await Promise.all(
      candidates.map(async (candidate) => {
        const matchData = await analyzeLiveJobMatching(candidate.toObject(), job.toObject());
        return {
          candidateId: candidate._id,
          name: candidate.name,
          email: candidate.email,
          experienceYears: candidate.experienceYears,
          skills: candidate.skills,
          matchScore: matchData.matchScore,
          resumeMatchPercentage: matchData.resumeMatchPercentage,
          missingSkills: matchData.missingSkills
        };
      })
    );

    // Sort descending
    rankings.sort((a, b) => b.matchScore - a.matchScore);

    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
