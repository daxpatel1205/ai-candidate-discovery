import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import jobRoutes from './routes/jobs.js';
import searchRoutes from './routes/search.js';
import rankRoutes from './routes/rank.js';
import compareRoutes from './routes/compare.js';
import interviewRoutes from './routes/interview.js';
import fraudRoutes from './routes/fraud.js';
import i18nRoutes from './routes/i18n.js';
import candidateRoutes from './routes/candidate.js';
import resumeRoutes from './routes/resume.js';
import insightsRoutes from './routes/insights.js';
import docsRoutes from './routes/docs.js';
import liveJobsRoutes from './routes/liveJobs.js';
import { Candidate } from './models/Candidate.js';
import { Job } from './models/Job.js';
import { Resume } from './models/Resume.js';
import { Ranking } from './models/Ranking.js';
import { authMiddleware } from './middleware/auth.js';
import { runLiveJobsSync } from './services/liveJobsSync.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Prevent tesseract.js (and other) worker crashes from killing the entire process.
// These errors are logged but the server continues running.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Non-fatal error caught:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Non-fatal rejection caught:', reason?.message || reason);
});


app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/rank', rankRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/i18n', i18nRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/live-jobs', liveJobsRoutes);

app.get('/api/dashboard/stats', authMiddleware, async (_req, res) => {
  try {
    const [candidates, jobs, resumes, highRisk, rankings, duplicateCount, heatStats] = await Promise.all([
      Candidate.countDocuments(),
      Job.countDocuments(),
      Resume.countDocuments(),
      Candidate.countDocuments({ fraudScore: { $gte: 50 } }),
      Ranking.countDocuments(),
      Candidate.countDocuments({ duplicateOf: { $exists: true, $ne: null } }),
      Candidate.aggregate([{ $group: { _id: null, avgHeatScore: { $avg: '$heatScore' } } }]),
    ]);

    res.json({
      candidates,
      jobs,
      resumes,
      highRiskCandidates: highRisk,
      rankings,
      duplicateCandidates: duplicateCount,
      averageHeatScore: heatStats?.[0]?.avgHeatScore ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/shortlist', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.query;
    const filter = jobId ? { jobId } : {};
    const rankings = await Ranking.find(filter)
      .sort({ score: -1 })
      .populate('candidateId')
      .limit(50);

    const shortlist = rankings.map((r) => ({
      name: r.candidateId?.name,
      email: r.candidateId?.email,
      score: r.score,
      explanation: r.explanation,
      matchedSkills: r.matchedSkills,
      fraudScore: r.candidateId?.fraudScore,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=shortlist.json');
    res.send(JSON.stringify(shortlist, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function seedDB() {
  try {
    const candidateCount = await Candidate.countDocuments();
    if (candidateCount < 3) {
      console.log('[Seed] Seeding mock candidates...');
      await Candidate.insertMany([
        {
          name: 'Alex Rivera',
          email: 'alex.rivera@example.com',
          phone: '+1-555-0199',
          skills: ['Node.js', 'React', 'AWS', 'MongoDB', 'JavaScript', 'TypeScript'],
          experienceYears: 5,
          education: [{ degree: 'B.S. in Computer Science', institution: 'San Jose State University', year: 2021 }],
          workHistory: [
            {
              company: 'CloudTech Solutions',
              role: 'Full Stack Engineer',
              startDate: '2022-01',
              endDate: 'Present',
              description: 'Designed and deployed Node.js microservices on AWS ECS. Built responsive React portals.'
            }
          ],
          summary: 'Experienced Full Stack Developer specializing in Node.js, React, and cloud architectures on AWS.',
          tags: ['Fullstack', 'AWS-Expert']
        },
        {
          name: 'Jessica Chen',
          email: 'jessica.chen@example.com',
          phone: '+1-555-0144',
          skills: ['Product Strategy', 'Agile', 'Jira', 'SQL', 'UX Design'],
          experienceYears: 6,
          education: [{ degree: 'B.A. in Cognitive Science', institution: 'UC Berkeley', year: 2020 }],
          workHistory: [
            {
              company: 'Fintech Spark',
              role: 'Product Manager',
              startDate: '2020-08',
              endDate: 'Present',
              description: 'Led cross-functional teams to build mobile transaction products. Increased user retention by 22%.'
            }
          ],
          summary: 'Data-driven Product Manager with a background in cognitive science and a passion for fintech products.',
          tags: ['Product', 'Fintech']
        },
        {
          name: 'Marcus Vance',
          email: 'marcus.vance@example.com',
          phone: '+1-555-0188',
          skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'CI/CD', 'Python'],
          experienceYears: 4,
          education: [{ degree: 'B.S. in Information Systems', institution: 'University of Texas', year: 2022 }],
          workHistory: [
            {
              company: 'LogiOps',
              role: 'DevOps Engineer',
              startDate: '2022-06',
              endDate: 'Present',
              description: 'Automated infrastructure deployments using Terraform. Maintained multicluster Kubernetes setups.'
            }
          ],
          summary: 'DevOps Specialist focused on automating CI/CD pipelines, containerization, and infrastructure as code.',
          tags: ['DevOps', 'Kubernetes']
        }
      ]);
      console.log('[Seed] Candidates seeded successfully.');
    }

    const jobCount = await Job.countDocuments();
    if (jobCount === 0) {
      console.log('[Seed] Seeding mock jobs...');
      await Job.insertMany([
        {
          title: 'Senior Software Engineer',
          description: 'We are looking for a Senior Software Engineer to help build out our core API endpoints and React frontend. Experience with Node.js, Express, AWS, and MongoDB is required.',
          requiredSkills: ['Node.js', 'React', 'AWS', 'MongoDB'],
          preferredSkills: ['TypeScript', 'GraphQL'],
          experienceMin: 5,
          experienceMax: 10,
          location: 'Remote'
        },
        {
          title: 'Cloud DevOps Specialist',
          description: 'Join our infrastructure team to manage Kubernetes clusters and deploy infrastructure-as-code using Terraform. Strong AWS configuration experience is essential.',
          requiredSkills: ['Kubernetes', 'Terraform', 'AWS', 'Docker'],
          preferredSkills: ['Python', 'Bash'],
          experienceMin: 3,
          experienceMax: 8,
          location: 'Hybrid'
        },
        {
          title: 'Technical Project Manager',
          description: 'We need an agile project manager to lead sprint planning, coordinate dev teams, and ensure delivery milestones on AWS-native product integrations.',
          requiredSkills: ['Agile', 'Product Strategy', 'SQL'],
          preferredSkills: ['Jira', 'UX Design'],
          experienceMin: 4,
          experienceMax: 9,
          location: 'On-site'
        }
      ]);
      console.log('[Seed] Jobs seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed] Database seeding failed:', err.message);
  }
}

async function start() {
  await connectDB();
  await seedDB();
  
  // Trigger initial synchronization of live jobs in background to avoid blocking server boot
  runLiveJobsSync()
    .then(() => console.log('[Index] Initial Live Jobs Sync completed successfully.'))
    .catch((err) => console.error('[Index] Initial Live Jobs Sync encountered issues:', err.message));

  // Run scheduled synchronization loop every 12 hours
  setInterval(() => {
    console.log('[Interval] Running scheduled Live Jobs Sync...');
    runLiveJobsSync()
      .then(() => console.log('[Interval] Scheduled Live Jobs Sync completed.'))
      .catch((err) => console.error('[Interval] Scheduled Live Jobs Sync failed:', err.message));
  }, 12 * 60 * 60 * 1000);

  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
