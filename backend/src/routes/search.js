import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';
import { searchCandidates } from '../services/search.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { query, filters = {}, limit = 20 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchCandidates(query, filters, limit);
    res.json({ query, results: results.matches, total: results.matches.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
