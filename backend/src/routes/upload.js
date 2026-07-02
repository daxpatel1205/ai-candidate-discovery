import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
// authMiddleware removed to allow optional uploads without authentication
import { Resume } from '../models/Resume.js';
import { Candidate } from '../models/Candidate.js';
import { parseResume } from '../services/parser.js';
import { createEmbedding } from '../services/gemini.js';
import { analyzeFraud } from '../services/fraud.js';
import { detectLanguage } from '../services/i18n.js';
import { buildTags, computeHeatScore } from '../services/insights.js';

const router = express.Router();
const uploadDir = process.env.UPLOAD_DIR || './uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.tif', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/tiff',
    ];

    const isAcceptedType = acceptedTypes.includes(file.mimetype);
    const isAcceptedExt = allowed.includes(ext);
    cb(null, isAcceptedType || isAcceptedExt);
  },
});

router.post('/', upload.array('resumes', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'At least one resume file is required.' });
    }

    const uploads = [];
    for (const file of files) {
      const parsed = await parseResume(file.path, file.mimetype);
      if (!parsed || !parsed.raw_text) {
        // Clean up temporary local file if parsing failed
        try {
          await fs.promises.unlink(file.path);
        } catch (_) {}
        return res.status(422).json({ error: `Unable to parse resume: ${file.originalname}` });
      }

      const langResult = await detectLanguage(parsed.raw_text || '');
      const embedding = await createEmbedding(parsed.raw_text);
      const normalizedText = (parsed.raw_text || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const textHash = crypto.createHash('sha256').update(normalizedText).digest('hex');

      const existingResume = await Resume.findOne({ textHash });
      const duplicateByEmail = parsed.structured?.email
        ? await Candidate.findOne({ email: parsed.structured.email })
        : null;
      const duplicateOf = existingResume?.candidateId || duplicateByEmail?._id;

      // Read file content as Base64 before deleting the disk copy
      let fileData = '';
      try {
        fileData = await fs.promises.readFile(file.path, 'base64');
      } catch (readErr) {
        console.error(`Failed to read file for DB storage: ${file.originalname}`, readErr);
      }

      // Delete the temporary local file on disk immediately
      try {
        await fs.promises.unlink(file.path);
      } catch (unlinkErr) {
        console.warn(`Failed to clean up temp file ${file.path}:`, unlinkErr.message);
      }

      const resume = await Resume.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        filePath: file.path,
        fileData,
        rawText: parsed.raw_text,
        parsedData: parsed.structured,
        language: langResult.language || 'en',
        textHash,
        duplicateOf: existingResume?._id || null,
        uploadedBy: req.user?.id || null,
      });

      const candidate = await Candidate.create({
        name: parsed.structured?.name || 'Unknown',
        email: parsed.structured?.email,
        phone: parsed.structured?.phone,
        skills: parsed.structured?.skills || [],
        experienceYears: parsed.structured?.experience_years,
        education: parsed.structured?.education || [],
        workHistory: parsed.structured?.work_history || [],
        summary: parsed.structured?.summary,
        language: langResult.language || 'en',
        resumeId: resume._id,
        embedding,
        duplicateOf: duplicateOf || null,
      });

      resume.candidateId = candidate._id;
      await resume.save();

      const fraud = await analyzeFraud({
        candidate_id: String(candidate._id),
        resume_text: parsed.raw_text,
        structured: parsed.structured,
      });

      candidate.fraudScore = fraud.risk_score;
      candidate.fraudFlags = fraud.flags.map((f) => f.type);
      candidate.tags = buildTags(candidate.toObject());
      candidate.heatScore = computeHeatScore(candidate.toObject());
      await candidate.save();

      uploads.push({ resume, candidate, fraud, language: langResult, duplicate: Boolean(duplicateOf) });
    }

    res.status(201).json({ uploads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
