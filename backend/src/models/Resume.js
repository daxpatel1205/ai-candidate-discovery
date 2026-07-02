import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimeType: String,
    filePath: String,
    fileData: String,
    rawText: String,
    parsedData: mongoose.Schema.Types.Mixed,
    language: { type: String, default: 'en' },
    textHash: String,
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  },
  { timestamps: true }
);

export const Resume = mongoose.model('Resume', resumeSchema);
