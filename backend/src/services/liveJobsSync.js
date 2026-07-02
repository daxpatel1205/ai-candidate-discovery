import axios from 'axios';
import { LiveJob } from '../models/LiveJob.js';

// User-Agent to avoid blocking by cloudflare or security gates on RSS feeds
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/xml, text/xml, */*'
};

// ─── Custom Regex RSS Parser ──────────────────────────────────────────────────
export function parseRssXml(xmlText) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    
    const getTagContent = (tagName) => {
      // Handles standard tags, CDATA wrappers, and namespace tags (e.g. dc:creator)
      const tagRegex = new RegExp(`<${tagName}(?:[^>]*)>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\/${tagName}>`, 'i');
      const tagMatch = itemContent.match(tagRegex);
      return tagMatch ? tagMatch[1].trim() : '';
    };

    items.push({
      title: getTagContent('title'),
      link: getTagContent('link'),
      description: getTagContent('description'),
      pubDate: getTagContent('pubDate'),
      category: getTagContent('category'),
      company: getTagContent('company') || getTagContent('dc:creator') || getTagContent('title').split(':')[0] || 'Unknown Company',
    });
  }
  return items;
}

// ─── Company & Title Normalization for Deduplication ──────────────────────────
export function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|co|corp|corporation|group|software|technologies|labs|systems)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function normalizeJobTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\b(sr|jr|senior|junior|lead|principal|staff|expert|intern|graduate|fresher|part-time|full-time)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Deduplicate jobs in the database
export async function runDeduplication() {
  console.log('[Deduplication] Starting duplicate detection...');
  const jobs = await LiveJob.find({ duplicateOf: null }).sort({ datePosted: -1 });
  let duplicatesFound = 0;

  for (let i = 0; i < jobs.length; i++) {
    const master = jobs[i];
    const normMasterCompany = normalizeCompanyName(master.companyName);
    const normMasterTitle = normalizeJobTitle(master.title);

    if (!normMasterCompany || !normMasterTitle) continue;

    // Look for matching jobs posted by the same company with the same title
    const candidates = await LiveJob.find({
      _id: { $ne: master._id },
      duplicateOf: null,
      datePosted: { $gte: new Date(master.datePosted.getTime() - 30 * 24 * 60 * 60 * 1000) } // past 30 days
    });

    for (const cand of candidates) {
      const normCandCompany = normalizeCompanyName(cand.companyName);
      const normCandTitle = normalizeJobTitle(cand.title);

      // Check if normalized fields are extremely similar
      if (normMasterCompany === normCandCompany && normMasterTitle === normCandTitle) {
        // Mark candidate as duplicate of the master job
        cand.duplicateOf = master._id;
        await cand.save();
        duplicatesFound++;
        console.log(`[Deduplication] Marked duplicate: "${cand.title}" at "${cand.companyName}" (${cand.sourcePlatform}) is duplicate of master from ${master.sourcePlatform}`);
      }
    }
  }
  console.log(`[Deduplication] Finished. Marked ${duplicatesFound} duplicate listings.`);
}

// ─── Fetch and Sync RSS Feeds ─────────────────────────────────────────────────
async function syncRemoteOk() {
  console.log('[Sync] Fetching RemoteOK RSS...');
  try {
    const response = await axios.get('https://remoteok.com/remote-jobs.rss', { headers: HEADERS, timeout: 15000 });
    const items = parseRssXml(response.data);
    console.log(`[Sync] RemoteOK parsed ${items.length} items.`);

    let addedCount = 0;
    for (const item of items) {
      // SourceId from guid or link
      const guidMatch = item.link.match(/remoteok\.com\/remote-jobs\/(\d+)/i) || item.link.match(/remoteok\.com\/(\d+)/i);
      const sourceId = guidMatch ? guidMatch[1] : item.link;

      // Extract skills from title or description
      const skills = [];
      const titleLower = item.title.toLowerCase();
      const techKeywords = ['react', 'node', 'python', 'aws', 'docker', 'typescript', 'javascript', 'go ', 'rust', 'ruby', 'rails', 'kubernetes', 'django', 'vue', 'angular'];
      techKeywords.forEach(k => {
        if (titleLower.includes(k) || item.description.toLowerCase().includes(k)) {
          skills.push(k.trim().toUpperCase());
        }
      });

      // Filter employment type
      const isIntern = /intern/i.test(titleLower);
      const type = isIntern ? 'Internship' : 'Full-time';

      const jobData = {
        companyName: item.company || 'RemoteOK Hirer',
        companyLogo: 'https://remoteok.com/assets/jobs/7476eb33bfa8619bc9e5c54c330fcf211717208882.png', // Placeholder RemoteOK logo
        title: item.title.replace(/^[^:]*:\s*/, ''), // strip "Company: " if present
        employmentType: type,
        department: 'Engineering',
        experienceRequired: '2-5 years',
        experienceMin: 2,
        experienceMax: 5,
        salary: '$80k - $120k',
        location: 'Remote',
        workMode: 'Remote',
        description: item.description.replace(/<[^>]*>/g, '').slice(0, 1000) + '...',
        requiredSkills: skills.length ? skills : ['SOFTWARE DEVELOPMENT'],
        preferredSkills: ['CLOUDACHITECTURE', 'CI/CD'],
        educationCriteria: "Bachelor's Degree in Computer Science or related field",
        openingsCount: 1,
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        datePosted: item.pubDate ? new Date(item.pubDate) : new Date(),
        lastUpdated: new Date(),
        jobCategory: 'Software Engineering',
        companyWebsite: 'https://remoteok.com',
        applyLink: item.link,
        sourcePlatform: 'RemoteOK',
        sourceId,
        techStack: skills,
        companyOverview: `${item.company} is a leading organization hiring global remote talent.`,
        selectionProcess: '1. Resume Screening, 2. Technical Interview, 3. Hiring Manager Review',
        hiringStages: ['Resume Screening', 'Technical Interview', 'Hiring Manager Call'],
        benefits: ['Remote Work Allowance', 'Health Insurance', 'Flexible Hours'],
        visaSponsorship: false
      };

      // Upsert
      await LiveJob.findOneAndUpdate(
        { sourceId, sourcePlatform: 'RemoteOK' },
        jobData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      addedCount++;
    }
    console.log(`[Sync] RemoteOK synchronized ${addedCount} jobs.`);
  } catch (err) {
    console.error('[Sync] RemoteOK Sync Error:', err.message);
  }
}

async function syncWeWorkRemotely() {
  console.log('[Sync] Fetching We Work Remotely RSS...');
  try {
    const response = await axios.get('https://weworkremotely.com/categories/remote-programming-jobs.rss', { headers: HEADERS, timeout: 15000 });
    const items = parseRssXml(response.data);
    console.log(`[Sync] We Work Remotely parsed ${items.length} items.`);

    let addedCount = 0;
    for (const item of items) {
      const sourceId = item.link.split('/').pop() || item.link;

      // Extract skills
      const skills = [];
      const titleLower = item.title.toLowerCase();
      const techKeywords = ['react', 'node', 'python', 'aws', 'docker', 'typescript', 'javascript', 'golang', 'rust', 'kubernetes', 'vue', 'angular'];
      techKeywords.forEach(k => {
        if (titleLower.includes(k) || item.description.toLowerCase().includes(k)) {
          skills.push(k.trim().toUpperCase());
        }
      });

      const isIntern = /intern/i.test(titleLower);
      const type = isIntern ? 'Internship' : 'Full-time';

      const jobData = {
        companyName: item.company || 'WeWorkRemotely Employer',
        companyLogo: 'https://weworkremotely.com/assets/favicon-77ef6a72e811e51b36f73ef13b2901dbd562f74813f8c8577e384abcb5ee37d6.png',
        title: item.title.replace(/^[^:]*:\s*/, ''),
        employmentType: type,
        department: 'Engineering',
        experienceRequired: '3+ years',
        experienceMin: 3,
        experienceMax: 8,
        salary: '$100k - $150k',
        location: 'Remote',
        workMode: 'Remote',
        description: item.description.replace(/<[^>]*>/g, '').slice(0, 1000) + '...',
        requiredSkills: skills.length ? skills : ['PROGRAMMING'],
        preferredSkills: ['GIT', 'AGILE'],
        educationCriteria: "Bachelor's degree or equivalent practical experience",
        openingsCount: 2,
        applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        datePosted: item.pubDate ? new Date(item.pubDate) : new Date(),
        lastUpdated: new Date(),
        jobCategory: 'Software Engineering',
        companyWebsite: 'https://weworkremotely.com',
        applyLink: item.link,
        sourcePlatform: 'We Work Remotely',
        sourceId,
        techStack: skills,
        companyOverview: 'A progressive tech team building top-tier remote experiences.',
        selectionProcess: '1. Take-home Coding Test, 2. Design Review, 3. Team Fit Interview',
        hiringStages: ['Take-home Test', 'Design Review', 'Team Fit Call'],
        benefits: ['Flexible Vacation', 'Co-working stipend', 'Home office budget'],
        visaSponsorship: true
      };

      await LiveJob.findOneAndUpdate(
        { sourceId, sourcePlatform: 'We Work Remotely' },
        jobData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      addedCount++;
    }
    console.log(`[Sync] We Work Remotely synchronized ${addedCount} jobs.`);
  } catch (err) {
    console.error('[Sync] We Work Remotely Sync Error:', err.message);
  }
}

// ─── Seeded Mock Generator for Other Platforms ───────────────────────────────
const MOCK_JOBS = [
  {
    sourceId: 'linkedin-101',
    sourcePlatform: 'LinkedIn Jobs',
    companyName: 'Google',
    companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
    title: 'Senior Software Engineer, Core Systems',
    employmentType: 'Full-time',
    department: 'Infrastructure',
    experienceRequired: '5+ years',
    experienceMin: 5,
    experienceMax: 10,
    salary: '$180k - $240k',
    location: 'Mountain View, CA',
    workMode: 'Hybrid',
    description: 'We are looking for a Senior Software Engineer to design, implement, and maintain Core infrastructure services. You will build highly scalable distributed systems, optimize database layers, and lead microservices architecture initiatives.',
    requiredSkills: ['GO', 'DOCKER', 'KUBERNETES', 'SYSTEM DESIGN', 'C++'],
    preferredSkills: ['PYTHON', 'REDIS', 'GCP'],
    educationCriteria: 'BS/MS in Computer Science or equivalent',
    openingsCount: 3,
    applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    jobCategory: 'Software Engineering',
    companyWebsite: 'https://google.com',
    applyLink: 'https://careers.google.com/jobs',
    recruiterName: 'Alex Mercer',
    recruiterContact: 'alexmercer@google.com',
    selectionProcess: '1. Resume review, 2. Coding round, 3. System design round, 4. Googliness round',
    hiringStages: ['Phone Screening', 'Coding Assessment', 'Onsite Panels', 'Offer Review'],
    benefits: ['Free Meals', 'Medical/Dental', '401k Matching', 'Gym membership'],
    visaSponsorship: true,
    techStack: ['Go', 'C++', 'Kubernetes', 'GCP'],
    companyOverview: 'Google is a global technology leader focusing on search, advertising, cloud, hardware, and AI.'
  },
  {
    sourceId: 'linkedin-102',
    sourcePlatform: 'LinkedIn Jobs',
    companyName: 'Stripe',
    companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
    title: 'Staff Machine Learning Engineer',
    employmentType: 'Full-time',
    department: 'Fraud Detection',
    experienceRequired: '8+ years',
    experienceMin: 8,
    experienceMax: 15,
    salary: '$220k - $300k',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    description: 'Join the Stripe Fraud detection team to build production ML models detecting fraud in microsecond latencies. Design neural networks, optimize pipeline efficiency, and deploy complex offline/online learning frameworks.',
    requiredSkills: ['PYTHON', 'MACHINE LEARNING', 'PYTORCH', 'SCIKIT-LEARN', 'TENSORFLOW', 'AI'],
    preferredSkills: ['AWS', 'KAFKA', 'SPARK'],
    educationCriteria: 'MS or PhD in Machine Learning, Mathematics, or CS',
    openingsCount: 1,
    applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    jobCategory: 'AI / Machine Learning',
    companyWebsite: 'https://stripe.com',
    applyLink: 'https://stripe.com/jobs',
    recruiterName: 'Sarah Jenkins',
    recruiterContact: 'sarahj@stripe.com',
    selectionProcess: '1. ML Portfolio Review, 2. Coding test, 3. ML Architecture Interview, 4. Core Values interview',
    hiringStages: ['Screening', 'Coding Exercise', 'ML Architecture Round', 'Director Match'],
    benefits: ['Equity options', 'Unlimited PTO', 'Wellness subsidy', 'Learning budget'],
    visaSponsorship: true,
    techStack: ['Python', 'PyTorch', 'Kafka', 'AWS'],
    companyOverview: 'Stripe is a financial infrastructure platform for the internet.'
  },
  {
    sourceId: 'greenhouse-201',
    sourcePlatform: 'Greenhouse',
    companyName: 'Vercel',
    companyLogo: 'https://assets.vercel.com/image/upload/v1588805858/nextjs/showcase/vercel-logo-and-wordmark.png',
    title: 'Frontend Developer (React / Next.js)',
    employmentType: 'Full-time',
    department: 'Developer Experience',
    experienceRequired: '3+ years',
    experienceMin: 3,
    experienceMax: 7,
    salary: '$130k - $170k',
    location: 'Remote, US',
    workMode: 'Remote',
    description: 'We are seeking an experienced Frontend Developer to join our Developer Experience team. Work directly on improving next-generation features in Next.js, Vercel Deployments, and web performance metrics. You should love CSS, React, and build tools.',
    requiredSkills: ['REACT', 'NEXT.JS', 'TYPESCRIPT', 'TAILWIND', 'CSS', 'JAVASCRIPT'],
    preferredSkills: ['WEBPACK', 'RUST', 'FIGMA'],
    educationCriteria: 'Bachelor in CS or equivalent experience',
    openingsCount: 2,
    applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    jobCategory: 'Frontend Engineering',
    companyWebsite: 'https://vercel.com',
    applyLink: 'https://vercel.com/careers',
    recruiterName: 'David Miller',
    recruiterContact: 'davidm@vercel.com',
    selectionProcess: '1. Application review, 2. Technical take-home, 3. Panel interview, 4. Exec sync',
    hiringStages: ['Recruiter Call', 'Take Home assignment', 'Panel Review', 'VP Call'],
    benefits: ['Home office budget ($3k)', 'Health, dental, vision', 'Stock options', 'Annual team retreats'],
    visaSponsorship: false,
    techStack: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    companyOverview: 'Vercel provides developer tools and cloud hosting for frontend frameworks.'
  },
  {
    sourceId: 'ashby-301',
    sourcePlatform: 'Ashby',
    companyName: 'Linear',
    companyLogo: 'https://linear.app/static/favicon.ico',
    title: 'Product Designer (UI/UX)',
    employmentType: 'Full-time',
    department: 'Product Design',
    experienceRequired: '4+ years',
    experienceMin: 4,
    experienceMax: 8,
    salary: '$140k - $180k',
    location: 'Remote, Global',
    workMode: 'Remote',
    description: 'At Linear, we build the tool teams use to plan and build products. We are seeking a Product Designer who has a meticulous eye for detail, values keyboard shortcuts, and takes pride in minimalist, lightning-fast UI design.',
    requiredSkills: ['FIGMA', 'UI/UX DESIGN', 'PRODUCT DESIGN', 'PROTOTYPING'],
    preferredSkills: ['HTML', 'CSS', 'REACT'],
    educationCriteria: 'Stunning portfolio demonstrating UI design craft',
    openingsCount: 1,
    applicationDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    jobCategory: 'Design / Product',
    companyWebsite: 'https://linear.app',
    applyLink: 'https://linear.app/careers',
    recruiterName: 'Elsa Lind',
    recruiterContact: 'elsa@linear.app',
    selectionProcess: '1. Portfolio Review, 2. Design Case presentation, 3. Craft evaluation, 4. Founder chat',
    hiringStages: ['Portfolio Screen', 'Deep Dive Interview', 'Craft Panel', 'Founder Meet'],
    benefits: ['Work from anywhere', 'High-end Macbook Pro', 'Health insurance', 'Equity sharing'],
    visaSponsorship: false,
    techStack: ['Figma', 'HTML/CSS', 'React'],
    companyOverview: 'Linear helps software teams streamline projects, tasks, sprints, and bug tracking.'
  },
  {
    sourceId: 'yc-401',
    sourcePlatform: 'Y Combinator Jobs',
    companyName: 'Cursor AI',
    companyLogo: 'https://cursor.sh/brand/logo.svg',
    title: 'Full Stack Engineer (Internship)',
    employmentType: 'Internship',
    department: 'AI Workspace',
    experienceRequired: '0-2 years (Freshers welcome!)',
    experienceMin: 0,
    experienceMax: 2,
    salary: '$50 - $80 / hour',
    location: 'San Francisco, CA',
    workMode: 'On-site',
    description: 'Cursor is building the future of coding. We are seeking an energetic Full Stack Engineer intern to develop AI-assisted workflows, IDE extensions, and backend microservices. High opportunity for conversion to full-time.',
    requiredSkills: ['TYPESCRIPT', 'REACT', 'NODE.JS', 'PYTHON', 'FASTAPI'],
    preferredSkills: ['LLM', 'VSCODE API', 'RUST'],
    educationCriteria: 'Pursuing BS/MS in Computer Science or similar',
    openingsCount: 2,
    applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    jobCategory: 'Software Engineering',
    companyWebsite: 'https://cursor.com',
    applyLink: 'https://www.ycombinator.com/jobs',
    recruiterName: 'Arvid L.',
    recruiterContact: 'arvid@cursor.com',
    selectionProcess: '1. Resume submission, 2. Code assignment, 3. Technical call with engineers',
    hiringStages: ['Resume Check', 'Code Challenge', 'Pair Programming Call'],
    benefits: ['Free housing allowance', 'Weekly team dinners', 'Top equipment', 'Competitive hourly pay'],
    visaSponsorship: true,
    techStack: ['TypeScript', 'React', 'Node.js', 'Python', 'FastAPI'],
    companyOverview: 'Cursor is an AI-powered code editor designed to make programming faster and more delightful.'
  },
  {
    sourceId: 'yc-402',
    sourcePlatform: 'Y Combinator Jobs',
    companyName: 'Cognition AI',
    companyLogo: 'https://www.cognition-labs.com/favicon.ico',
    title: 'AI Researcher (Fresher Opportunity)',
    employmentType: 'Full-time',
    department: 'Core Reasoning',
    experienceRequired: 'Freshers (0-1 year experience)',
    experienceMin: 0,
    experienceMax: 1,
    salary: '$150k - $200k',
    location: 'San Francisco, CA',
    workMode: 'On-site',
    description: 'Cognition AI is building Devin, the first AI software engineer. Join us as an AI Researcher and work on reasoning algorithms, reinforcement learning, and advanced LLM agent orchestration. Perfect for brilliant freshers and competitive programming champions.',
    requiredSkills: ['PYTHON', 'MACHINE LEARNING', 'PYTORCH', 'LLM', 'AI', 'ALGORITHMS'],
    preferredSkills: ['C++', 'COMPETITIVE PROGRAMMING'],
    educationCriteria: 'Outstanding coding or math Olympiad background',
    openingsCount: 3,
    applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    jobCategory: 'AI / Machine Learning',
    companyWebsite: 'https://cognition-labs.com',
    applyLink: 'https://www.ycombinator.com/jobs',
    recruiterName: 'John Cognition',
    recruiterContact: 'john@cognition-labs.com',
    selectionProcess: '1. Coding screen, 2. Hard algorithmic panel (3 rounds), 3. Reinforcement learning system design, 4. Final interview',
    hiringStages: ['Screening', 'Algorithms Round 1', 'Algorithms Round 2', 'Systems Interview', 'Offer'],
    benefits: ['Top compensation', 'Relocation allowance', 'Unlimited snacks & drinks', 'Generous health package'],
    visaSponsorship: true,
    techStack: ['Python', 'PyTorch', 'C++'],
    companyOverview: 'Cognition Labs is an applied AI lab focused on reasoning.'
  },
  {
    sourceId: 'govt-501',
    sourcePlatform: 'Government Job Portals',
    companyName: 'National Science Foundation',
    companyLogo: 'https://www.nsf.gov/images/nsf-logo.gif',
    title: 'Science & Technology Program Analyst',
    employmentType: 'Full-time',
    department: 'IT Programs',
    experienceRequired: '3-6 years',
    experienceMin: 3,
    experienceMax: 6,
    salary: '$95k - $125k',
    location: 'Alexandria, VA',
    workMode: 'On-site',
    description: 'Evaluate technical research proposals, manage funding initiatives for AI and cybersecurity grants, and coordinate technological roadmap planning across national defense and educational layers.',
    requiredSkills: ['PROJECT MANAGEMENT', 'CYBERSECURITY', 'AI', 'DATA ANALYSIS'],
    preferredSkills: ['POLICY', 'PUBLIC ADMINISTRATION'],
    educationCriteria: 'US Citizenship required. Bachelor or Master in CS or Public Policy.',
    openingsCount: 1,
    applicationDeadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    jobCategory: 'Other Tech / Management',
    companyWebsite: 'https://nsf.gov',
    applyLink: 'https://www.usajobs.gov',
    recruiterName: 'NSF Careers Coordinator',
    selectionProcess: '1. USAJobs Eligibility checks, 2. Structured interview, 3. Security clearance checks',
    hiringStages: ['Eligibility Review', 'Committee Interview', 'Background Investigation'],
    benefits: ['Federal Pension', '100% Health insurance coverage', 'Paid Federal holidays', 'Tuition repayment'],
    visaSponsorship: false,
    techStack: ['Project Management', 'Data Analysis'],
    companyOverview: 'The NSF is an independent agency of the United States government that supports fundamental research.'
  }
];

async function syncSeededMocks() {
  console.log('[Sync] Seeding mock connector jobs...');
  let addedCount = 0;
  for (const mock of MOCK_JOBS) {
    // Generate deterministic dates posted
    const datePosted = new Date();
    datePosted.setDate(datePosted.getDate() - (mock.sourceId.charCodeAt(mock.sourceId.length - 1) % 5)); // offset slightly

    const jobData = {
      ...mock,
      datePosted,
      lastUpdated: new Date(),
    };

    await LiveJob.findOneAndUpdate(
      { sourceId: mock.sourceId, sourcePlatform: mock.sourcePlatform },
      jobData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    addedCount++;
  }
  console.log(`[Sync] Seeded ${addedCount} mock jobs.`);
}

// ─── Main Aggregator Controller ───────────────────────────────────────────────
export async function runLiveJobsSync() {
  console.log('[Sync] Live Jobs Synchronization initiated...');
  const errors = [];

  try {
    await syncRemoteOk();
  } catch (err) {
    errors.push(`RemoteOK Sync failed: ${err.message}`);
  }

  try {
    await syncWeWorkRemotely();
  } catch (err) {
    errors.push(`We Work Remotely Sync failed: ${err.message}`);
  }

  try {
    await syncSeededMocks();
  } catch (err) {
    errors.push(`Seeded Mocks failed: ${err.message}`);
  }

  // Deduplication
  try {
    await runDeduplication();
  } catch (err) {
    errors.push(`Deduplication pass failed: ${err.message}`);
  }

  console.log('[Sync] Live Jobs Sync execution finished.');
  if (errors.length) {
    console.error('[Sync] Synchronization errors:', errors);
    throw new Error(`Sync finished with issues: ${errors.join(', ')}`);
  }

  return { success: true, timestamp: new Date() };
}
