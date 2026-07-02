import mongoose from 'mongoose';

const verificationOtpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ['email-verification', 'password-reset'], required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const VerificationOTP = mongoose.model('VerificationOTP', verificationOtpSchema);
