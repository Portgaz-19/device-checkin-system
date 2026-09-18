import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
    try {
       const { name, email, password, role, studentId } = req.body;
       if (!name || !email || !password || !role) {
         return res.status(400).json({ error: 'Missing required fields' });
       }
       const existing = await User.findOne({ email });
       if (existing) {
         return res.status(409).json({ error: 'Email already registered' });
       }
       const passwordHash = await bcrypt.hash(password, 10);
       const user = await User.create({ name, email, passwordHash, role, studentId });
       res.status(201).json({ id: user._id, email: user.email, role: user.role });
} catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
}

export const login = async (req, res) => {
    try {
       const { email, password } = req.body;
       const user = await User.findOne({ email });
       if (!user) {
         return res.status(401).json({ error: 'Invalid credentials' });
       }
       const match = await bcrypt.compare(password, user.passwordHash);
       if (!match) {
         return res.status(401).json({ error: 'Invalid credentials' });
       }
       const token = jwt.sign(
         { id: user._id, role: user.role },
         process.env.JWT_SECRET,
         { expiresIn: '2h' }
       );
       res.json({ token, role: user.role });
} catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
}

export const forgotPassword = async (req, res) => {
    try {
       const { email } = req.body;
       const genericResponse = {
         message: 'If an account exists for this email, a reset link has been generated.',
       };

       if (!email) {
         return res.json(genericResponse);
       }
       if (typeof email !== 'string') {
         return res.status(400).json({ error: 'email must be a string' });
       }

       const user = await User.findOne({ email: email.trim().toLowerCase() });
       if (!user) {
         return res.json(genericResponse);
       }

       const rawToken = crypto.randomBytes(32).toString('hex');
       const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

       user.resetPasswordTokenHash = tokenHash;
       user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
       await user.save();

        // TEMPORARY dev-only exposure: no email service is wired up yet, so the
        // reset link is returned in the response instead of emailed. Exposed
        // only when NODE_ENV is explicitly 'development' or 'test' — production,
        // staging, and any other environment get the generic response without the
        // link to prevent callers from confirming registered email addresses.
        // Replace with a real email send when the team picks a provider.
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
        const isLocalDevEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
        const body = isLocalDevEnv
          ? { ...genericResponse, devOnlyResetLink: resetLink }
          : genericResponse;

       res.json(body);
} catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
}

export const resetPassword = async (req, res) => {
    try {
       const { token, newPassword } = req.body;
       if (typeof token !== 'string' || typeof newPassword !== 'string' || !token || !newPassword) {
         return res.status(400).json({ error: 'Missing token or new password' });
       }
       if (newPassword.length < 6) {
         return res.status(400).json({ error: 'Password must be at least 6 characters' });
       }

       const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
       const passwordHash = await bcrypt.hash(newPassword, 10);

       // Atomic single-use consumption: the token hash and expiry are part of the
       // update filter, so a concurrent reset racing on the same token cannot both
       // match — only the first findOneAndUpdate can consume it.
       const user = await User.findOneAndUpdate(
         {
           resetPasswordTokenHash: tokenHash,
           resetPasswordExpires: { $gt: Date.now() },
         },
         {
           $set: { passwordHash },
           $unset: { resetPasswordTokenHash: '', resetPasswordExpires: '' },
         },
       );

       if (!user) {
         return res.status(400).json({ error: 'Reset link is invalid or has expired' });
       }

       res.json({ message: 'Password reset successfully. You can now log in.' });
} catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong. Please try again." });
      }
}

