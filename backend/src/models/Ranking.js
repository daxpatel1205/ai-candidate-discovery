import mongoose from 'mongoose';

const rankingSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    score: { type: Number, required: true },
    explanation: String,
    matchedSkills: [String],
    missingSkills: [String],
  },
  { timestamps: true }
);

rankingSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export const Ranking = mongoose.model('Ranking', rankingSchema);
