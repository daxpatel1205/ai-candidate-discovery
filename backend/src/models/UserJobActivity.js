import mongoose from 'mongoose';

const userJobActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveJob', required: true },
    saved: { type: Boolean, default: false },
    applied: { type: Boolean, default: false },
    applicationStatus: {
      type: String,
      enum: ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'],
      default: 'Saved',
    },
    alertEnabled: { type: Boolean, default: false },
    recentlyViewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for fast user queries
userJobActivitySchema.index({ userId: 1, jobId: 1 }, { unique: true });
userJobActivitySchema.index({ userId: 1, saved: 1 });
userJobActivitySchema.index({ userId: 1, applied: 1 });

export const UserJobActivity = mongoose.model('UserJobActivity', userJobActivitySchema);
