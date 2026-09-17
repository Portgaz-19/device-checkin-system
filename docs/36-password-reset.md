# Task 36: Forgot Password / Reset Flow
**Owner: Person E**
**Repo:** https://github.com/Portgaz-19/device-checkin-system

## Before you start — sync check
No dependency on Tasks 32–35 — this is deliberately self-contained so you're not blocked
waiting on someone else's branch to merge first. Just pull latest `main` before starting.

## Why this task exists
Right now, if someone forgets their password, there's no way to recover the account at
all — they're permanently locked out. This is a real, basic gap in an app that's meant to
actually be used by real students and staff, not just the team testing it.

## Honest scope note before you start
There's no email-sending service wired up in this project yet (no SendGrid, Resend, etc.).
Building real email delivery is a separate decision the team needs to make (which
provider, whose account, what it costs). This task builds the **real, secure backend and
frontend logic** for password reset, but for now the reset link is returned directly in
the API response instead of emailed — clearly marked as a temporary dev-only exposure, not
something to ship silently as if it's finished. Wiring up real email delivery afterward
should be quick once this foundation exists.

## Part 1 — extend the User model for reset tokens

1. Pull latest `main`, branch:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/password-reset
   ```

2. Add two fields to `server/models/User.js`:
   ```js
   resetPasswordTokenHash: { type: String },
   resetPasswordExpires: { type: Date },
   ```
   Never store the raw reset token — same principle as passwords. Store a hash of it, and
   only compare hashes when someone presents a token.

## Part 2 — backend endpoints

3. Add to `server/controller/authController.js`:
   ```js
   import crypto from 'crypto';

   export async function forgotPassword(req, res) {
     try {
       const { email } = req.body;
       const user = await User.findOne({ email });

       // Deliberately vague response whether or not the user exists — prevents someone
       // from using this endpoint to check which emails have accounts on this system.
       const genericResponse = { message: 'If an account exists for this email, a reset link has been generated.' };

       if (!user) {
         return res.json(genericResponse);
       }

       const rawToken = crypto.randomBytes(32).toString('hex');
       const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

       user.resetPasswordTokenHash = tokenHash;
       user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
       await user.save();

       // TEMPORARY: no email service wired up yet — returning the link directly.
       // Replace this with an actual email send once the team picks a provider.
       const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

       res.json({ ...genericResponse, devOnlyResetLink: resetLink });
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   }

   export async function resetPassword(req, res) {
     try {
       const { token, newPassword } = req.body;
       if (!token || !newPassword) {
         return res.status(400).json({ error: 'Missing token or new password' });
       }
       if (newPassword.length < 6) {
         return res.status(400).json({ error: 'Password must be at least 6 characters' });
       }

       const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
       const user = await User.findOne({
         resetPasswordTokenHash: tokenHash,
         resetPasswordExpires: { $gt: Date.now() },
       });

       if (!user) {
         return res.status(400).json({ error: 'Reset link is invalid or has expired' });
       }

       user.passwordHash = await bcrypt.hash(newPassword, 10);
       user.resetPasswordTokenHash = undefined;
       user.resetPasswordExpires = undefined;
       await user.save();

       res.json({ message: 'Password reset successfully. You can now log in.' });
     } catch (err) {
       res.status(500).json({ error: err.message });
     }
   }
   ```

4. Wire into `server/router/authRoutes.js`:
   ```js
   authRoutes.post('/forgot-password', forgotPassword);
   authRoutes.post('/reset-password', resetPassword);
   ```

5. This endpoint is a realistic target for abuse (someone hammering it to spam-generate
   tokens or probe for valid emails despite the generic response) — apply the existing
   `authLimiter` to it, same as register/login already have, rather than leaving it
   unlimited.

## Part 3 — frontend pages

6. Create `client/src/pages/ForgotPassword.jsx`:
   ```jsx
   import { useState } from 'react';
   import api from '../api/axiosInstance';

   function ForgotPassword() {
     const [email, setEmail] = useState('');
     const [message, setMessage] = useState('');
     const [devLink, setDevLink] = useState('');

     const handleSubmit = async () => {
       setMessage('Submitting...');
       try {
         const res = await api.post('/auth/forgot-password', { email });
         setMessage(res.data.message);
         setDevLink(res.data.devOnlyResetLink || '');
       } catch (err) {
         setMessage(err.response?.data?.error || 'Something went wrong');
       }
     };

     return (
       <div className="p-8 max-w-sm mx-auto">
         <h1 className="text-xl mb-4">Forgot Password</h1>
         <input
           className="border p-2 w-full mb-2"
           placeholder="Your email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
         />
         <button onClick={handleSubmit} className="bg-black text-white p-2 w-full">
           Send Reset Link
         </button>
         <p className="mt-2 text-sm">{message}</p>
         {devLink && (
           <p className="mt-2 text-xs text-gray-500 break-all">
             Dev only (no email service yet): <a href={devLink} className="underline">{devLink}</a>
           </p>
         )}
       </div>
     );
   }

   export default ForgotPassword;
   ```

7. Create `client/src/pages/ResetPassword.jsx` — reads the token from the URL query string:
   ```jsx
   import { useState } from 'react';
   import { useSearchParams, useNavigate } from 'react-router-dom';
   import api from '../api/axiosInstance';

   function ResetPassword() {
     const [searchParams] = useSearchParams();
     const token = searchParams.get('token');
     const navigate = useNavigate();
     const [newPassword, setNewPassword] = useState('');
     const [confirmPassword, setConfirmPassword] = useState('');
     const [message, setMessage] = useState('');

     const handleSubmit = async () => {
       if (newPassword !== confirmPassword) {
         setMessage('Passwords do not match');
         return;
       }
       setMessage('Submitting...');
       try {
         await api.post('/auth/reset-password', { token, newPassword });
         setMessage('Password reset! Redirecting to login...');
         setTimeout(() => navigate('/login'), 2000);
       } catch (err) {
         setMessage(err.response?.data?.error || 'Something went wrong');
       }
     };

     if (!token) {
       return <p className="p-8">No reset token found in the URL.</p>;
     }

     return (
       <div className="p-8 max-w-sm mx-auto">
         <h1 className="text-xl mb-4">Reset Password</h1>
         <input
           className="border p-2 w-full mb-2"
           type="password"
           placeholder="New password"
           value={newPassword}
           onChange={(e) => setNewPassword(e.target.value)}
         />
         <input
           className="border p-2 w-full mb-2"
           type="password"
           placeholder="Confirm new password"
           value={confirmPassword}
           onChange={(e) => setConfirmPassword(e.target.value)}
         />
         <button onClick={handleSubmit} className="bg-black text-white p-2 w-full">
           Reset Password
         </button>
         <p className="mt-2 text-sm">{message}</p>
       </div>
     );
   }

   export default ResetPassword;
   ```

8. Wire both into `App.jsx` (not behind `ProtectedRoute` — someone requesting a reset is
   by definition not logged in):
   ```jsx
   <Route path="/forgot-password" element={<ForgotPassword />} />
   <Route path="/reset-password" element={<ResetPassword />} />
   ```
   Add a "Forgot password?" link on `Login.jsx` pointing to `/forgot-password`.

## Part 4 — testing

9. Test the full flow by hand: request a reset for a real test account, copy the dev-only
   link from the response, open it, set a new password, confirm you can log in with the
   new password and **not** with the old one.

10. Test the expiry: manually set a token's `resetPasswordExpires` to a past date directly
    in Atlas (or shorten the expiry temporarily to test faster), confirm an expired token
    is rejected with a clear message.

11. Test that requesting a reset for a non-existent email still returns the generic
    success message, not an error revealing the email doesn't exist.

## Steps to finish

12. Commit, push, PR, get reviewed:
    ```bash
    git add .
    git commit -m "feat: add password reset flow (dev-only link, email delivery pending)"
    git push origin feature/password-reset
    ```

## Handoff — what you tell the team when done
Post: "Password reset now works end-to-end — currently the reset link is returned
directly in the API response since we don't have email delivery set up yet. Real email
sending is a clear follow-up once the team picks a provider (SendGrid, Resend, etc.) —
flagging this now rather than letting it quietly stay a gap."

## Done when
- [ ] `forgotPassword`/`resetPassword` endpoints work, tested with a real account
- [ ] Reset tokens are hashed before storage, never stored raw
- [ ] Expired tokens rejected with a clear message
- [ ] Response doesn't reveal whether an email exists in the system
- [ ] Rate limiting applied to `/forgot-password`
- [ ] Frontend pages work end-to-end, including the "Forgot password?" link from Login
- [ ] Old password confirmed no longer works after a reset
- [ ] Email-delivery gap clearly flagged in the PR and handoff message, not silently left
      as if finished
- [ ] PR opened, reviewed, passes CI, and merged into `main`
