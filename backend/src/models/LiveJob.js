import mongoose from 'mongoose';

const liveJobSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    companyLogo: { type: String },
    title: { type: String, required: true },
    employmentType: { type: String }, // e.g. Full-time, Part-time, Contract, Internship
    department: { type: String },
    experienceRequired: { type: String },
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number },
    salary: { type: String },
    location: { type: String },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], default: 'Remote' },
    description: { type: String, required: true },
    requiredSkills: [{ type: String }],
    preferredSkills: [{ type: String }],
    educationCriteria: { type: String },
    openingsCount: { type: Number },
    applicationDeadline: { type: Date },
    datePosted: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    jobCategory: { type: String },
    companyWebsite: { type: String },
    applyLink: { type: String },
    recruiterName: { type: String },
    recruiterContact: { type: String },
    selectionProcess: { type: String },
    hiringStages: [{ type: String }],
    benefits: [{ type: String }],
    visaSponsorship: { type: Boolean, default: false },
    sourcePlatform: { type: String, required: true }, // e.g. LinkedIn, Google Jobs, Indeed, Greenhouse, Lever, Ashby, Workday, Y Combinator, RemoteOK, We Work Remotely, Government, Campus, etc.
    sourceId: { type: String, required: true }, // Unique identifier on source to prevent duplication
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveJob', default: null },
    techStack: [{ type: String }],
    companyOverview: { type: String },
  },
  { timestamps: true }
);

// Create compound text indexes for search indexing
liveJobSchema.index({
  title: 'text',
  companyName: 'text',
  description: 'text',
  location: 'text',
  jobCategory: 'text',
  requiredSkills: 'text',
  sourcePlatform: 'text'
});

// Single-field indexes for fast filtration
liveJobSchema.index({ datePosted: -1 });
liveJobSchema.index({ sourceId: 1, sourcePlatform: 1 }, { unique: true });
liveJobSchema.index({ duplicateOf: 1 });

export const LiveJob = mongoose.model('LiveJob', liveJobSchema);
