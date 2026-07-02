import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    requiredSkills: [String],
    preferredSkills: [String],
    experienceMin: Number,
    experienceMax: Number,
    location: String,
    language: { type: String, default: 'en' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Job = mongoose.model('Job', jobSchema);
