import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experienceYears: Number,
    education: [{ degree: String, institution: String, year: Number }],
    workHistory: [{ company: String, role: String, startDate: String, endDate: String, description: String }],
    summary: String,
    language: { type: String, default: 'en' },
    fraudScore: { type: Number, default: 0 },
    fraudFlags: [{ type: String }],
    heatScore: { type: Number, default: 0 },
    tags: [{ type: String }],
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    shortlisted: { type: Boolean, default: false },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const Candidate = mongoose.model('Candidate', candidateSchema);
