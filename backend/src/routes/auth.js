import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { VerificationOTP } from '../models/VerificationOTP.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { authMiddleware } from '../middleware/auth.js';
import { Candidate } from '../models/Candidate.js';

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

// Helper to generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SMTP Transporter Helper
async function sendOTPEmail(to, subject, otp, recipientName = 'User') {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  // Print OTP to terminal for developer fallback convenience
  console.log('\n**************************************************');
  console.log(`[VERIFICATION OTP CODE GENERATED]`);
  console.log(`To:      ${to}`);
  console.log(`OTP:     ${otp}`);
  console.log('**************************************************\n');

  if (!user || !pass) {
    console.log('[Mailer] SMTP credentials missing in .env. Falling back to terminal OTP log.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: { user, pass }
    });

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 2rem; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #334155;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem;">
          Prove Your AI Candidate Discovery Identity
        </h2>
        
        <p style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">
          Dear ${recipientName},
        </p>
        
        <p style="font-size: 0.92rem; line-height: 1.6; color: #475569; margin-bottom: 1.25rem;">
          We have received a request for your AI Candidate Discovery account. For security purposes, please verify your identity by providing the following One-Time Password (OTP).
        </p>
        
        <p style="font-size: 0.92rem; font-weight: 700; color: #334155; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.02em;">
          Your One-Time Password (OTP) verification code is:
        </p>
        
        <div style="text-align: center; margin: 2rem 0;">
          <span style="display: inline-block; padding: 0.85rem 2.5rem; background-color: #10b981; color: #ffffff; font-size: 1.6rem; font-weight: bold; border-radius: 8px; letter-spacing: 0.15em; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 0.85rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem;">
          One-Time Password (OTP) is valid for 10 minutes.
        </p>
        
        <p style="font-size: 0.88rem; line-height: 1.5; color: #64748b; margin-bottom: 1.5rem;">
          If you did not initiate this request, please disregard this message. Please ensure the confidentiality of your OTP and do not share it with anyone. <br />
          <strong style="color: #475569;">Do not forward or give this code to anyone.</strong>
        </p>
        
        <p style="font-size: 0.9rem; color: #334155; margin-bottom: 1.5rem;">
          Thank you for using AI Candidate Discovery.
        </p>
        
        <p style="font-size: 0.9rem; color: #475569; margin-bottom: 0; line-height: 1.4;">
          Best regards,<br />
          <strong>[Atlas Talent]</strong>
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 2rem 0 1.5rem 0;" />
        
        <div style="font-size: 0.78rem; color: #94a3b8; line-height: 1.5; text-align: center;">
          <p style="margin: 0 0 0.5rem 0;">This email can't receive replies.</p>
          <p style="margin: 0 0 1rem 0;">For more information about AI Candidate Discovery, visit our recruiting platform workspace.</p>
          <p style="margin: 0 0 0.5rem 0; color: #64748b;">This email was sent to <span style="color: #10b981; font-weight: 600;">${to}</span></p>
          <p style="margin: 0; font-weight: 600;">[Atlas Talent] | AI Recruiting Workspace</p>
          <p style="margin: 0.25rem 0 0 0;">&copy; 2026 [Atlas Talent]. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Atlas Talent" <${from}>`,
      to,
      subject,
      html: htmlContent
    });
    console.log(`[Mailer] Verification email successfully sent to ${to}`);
  } catch (err) {
    console.error('[Mailer] SMTP email delivery failed:', err.message);
  }
}

// Helper to generate access & refresh tokens
async function createTokens(userId, email, name, role) {
  const accessToken = jwt.sign(
    { id: userId, email, name, role },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  const refreshTokenValue = jwt.sign(
    { id: userId },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Save refresh token to db
  await RefreshToken.create({
    userId,
    token: await bcrypt.hash(refreshTokenValue, 10),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

// 1. REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'recruiter',
      isVerified: false
    });

    // Auto-create Candidate profile upon registration
    await Candidate.create({
      name: user.name,
      email: user.email,
      skills: ['JavaScript', 'React', 'Node.js'],
      experienceYears: 2,
      summary: `Profile for ${user.name}`
    });

    // Generate Verification OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await VerificationOTP.create({
      userId: user._id,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'email-verification',
      expiresAt
    });

    sendOTPEmail(user.email, 'AI Candidate Discovery - Email Verification', otp, user.name);

    res.status(201).json({
      message: 'Registration successful. OTP sent to email.',
      userId: user._id,
      email: user.email,
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. VERIFY EMAIL
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const record = await VerificationOTP.findOne({
      userId: user._id,
      purpose: 'email-verification'
    });

    if (!record) {
      return res.status(400).json({ error: 'No active OTP verification code found' });
    }

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (record.attempts >= 5) {
      await record.deleteOne();
      return res.status(400).json({ error: 'Max attempts reached. Please request a new OTP.' });
    }

    const valid = await bcrypt.compare(otp, record.otp);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    // Mark as verified
    user.isVerified = true;
    await user.save();
    await record.deleteOne();

    // Ensure candidate profile exists
    const candidateExists = await Candidate.findOne({ email: user.email.toLowerCase() });
    if (!candidateExists) {
      await Candidate.create({
        name: user.name,
        email: user.email.toLowerCase(),
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceYears: 2,
        summary: `Profile for ${user.name}`
      });
    }

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose = 'email-verification' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean up old OTP records
    await VerificationOTP.deleteMany({ userId: user._id, purpose });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await VerificationOTP.create({
      userId: user._id,
      otp: await bcrypt.hash(otp, 10),
      purpose,
      expiresAt
    });

    sendOTPEmail(user.email, `AI Candidate Discovery - OTP Resend (${purpose})`, otp, user.name);

    res.json({
      message: 'New OTP code sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      // Direct user back to verify screen and automatically resend verification OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await VerificationOTP.deleteMany({ userId: user._id, purpose: 'email-verification' });
      await VerificationOTP.create({
        userId: user._id,
        otp: await bcrypt.hash(otp, 10),
        purpose: 'email-verification',
        expiresAt
      });
      sendOTPEmail(user.email, 'AI Candidate Discovery - Email Verification', otp, user.name);

      return res.status(403).json({
        error: 'Email is not verified. A verification code has been sent.',
        notVerified: true,
        email: user.email,
        ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
      });
    }

    const { accessToken, refreshToken } = await createTokens(user._id, user.email, user.name, user.role);

    // Ensure candidate profile exists
    const candidateExists = await Candidate.findOne({ email: user.email.toLowerCase() });
    if (!candidateExists) {
      await Candidate.create({
        name: user.name,
        email: user.email.toLowerCase(),
        skills: ['JavaScript', 'React', 'Node.js'],
        experienceYears: 2,
        summary: `Profile for ${user.name}`
      });
    }

    res.json({
      token: accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. REFRESH TOKEN
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Validate in DB
    const dbTokens = await RefreshToken.find({ userId: user._id });
    let tokenMatch = false;
    let matchingRecord = null;

    for (const record of dbTokens) {
      const match = await bcrypt.compare(refreshToken, record.token);
      if (match) {
        tokenMatch = true;
        matchingRecord = record;
        break;
      }
    }

    if (!tokenMatch) {
      return res.status(401).json({ error: 'Refresh token is unrecognized or blacklisted' });
    }

    // Delete used refresh token (one-time rotation security standard)
    await matchingRecord.deleteOne();

    // Reissue tokens
    const tokens = await createTokens(user._id, user.email, user.name, user.role);

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await VerificationOTP.deleteMany({ userId: user._id, purpose: 'password-reset' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await VerificationOTP.create({
      userId: user._id,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'password-reset',
      expiresAt
    });

    sendOTPEmail(user.email, 'AI Candidate Discovery - Password Reset OTP', otp, user.name);

    res.json({
      message: 'Password reset OTP code sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. VERIFY RESET OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const record = await VerificationOTP.findOne({
      userId: user._id,
      purpose: 'password-reset'
    });

    if (!record) return res.status(400).json({ error: 'No active password reset request found' });

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ error: 'Reset OTP has expired' });
    }

    const valid = await bcrypt.compare(otp, record.otp);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid reset OTP' });
    }

    res.json({ message: 'Reset OTP verified. You can now reset your password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const record = await VerificationOTP.findOne({
      userId: user._id,
      purpose: 'password-reset'
    });

    if (!record) return res.status(400).json({ error: 'No password reset code validation in progress' });

    const valid = await bcrypt.compare(otp, record.otp);
    if (!valid) return res.status(400).json({ error: 'Invalid OTP' });

    // Save new password
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    await record.deleteOne();

    res.json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      // Find and delete the matching refresh token
      const dbTokens = await RefreshToken.find();
      for (const record of dbTokens) {
        const match = await bcrypt.compare(refreshToken, record.token);
        if (match) {
          await record.deleteOne();
          break;
        }
      }
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET ME
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
});

export default router;
