import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['candidate', 'recruiter', 'admin'], default: 'recruiter' },
    isVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
