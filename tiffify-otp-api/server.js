require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const app        = express();

app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════
//   NODEMAILER — Gmail SMTP (Completely Free)
// ══════════════════════════════════════════
let transporter = null;

if (process.env.GMAIL_USER && !process.env.GMAIL_USER.includes('youremail')) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  // Verify connection
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Gmail connection failed:', err.message);
      transporter = null;
    } else {
      console.log('✅ Gmail SMTP connected — real email OTP enabled!');
    }
  });
} else {
  console.log('⚠️  Gmail not configured — OTP shown on screen (demo mode)');
  console.log('   → Fill GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable real email OTP');
}

// ── Helper: Send OTP Email ────────────────
async function sendOTPEmail(toEmail, otp) {
  if (!transporter) {
    console.log(`\n📧 [DEMO MODE] OTP for ${toEmail}: ${otp}\n`);
    return { sent: false, demo: true };
  }
  try {
    await transporter.sendMail({
      from:    `"Tiffify 🍱" <${process.env.GMAIL_USER}>`,
      to:      toEmail,
      subject: 'Your Tiffify Verification Code',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#FF6B35,#C94E1E);padding:32px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;letter-spacing:2px;">🍱 TIFFIFY</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Fresh Homestyle Tiffin Delivered Daily</p>
          </div>
          <div style="padding:32px;text-align:center;">
            <h2 style="color:#1A1208;margin:0 0 8px;">Verify Your Account</h2>
            <p style="color:#7A6A55;margin:0 0 28px;font-size:14px;">Enter this OTP to complete your registration. Valid for 2 minutes.</p>
            <div style="background:#FFF0EB;border:2px dashed #FF6B35;border-radius:12px;padding:20px 32px;display:inline-block;">
              <span style="font-size:42px;font-weight:900;letter-spacing:10px;color:#FF6B35;">${otp}</span>
            </div>
            <p style="color:#7A6A55;font-size:12px;margin:24px 0 0;">⚠️ Do not share this OTP with anyone.<br>This code expires in <strong>2 minutes</strong>.</p>
          </div>
          <div style="background:#FFF8ED;padding:16px;text-align:center;border-top:1px solid #EDE0CC;">
            <p style="color:#7A6A55;font-size:12px;margin:0;">© 2025 Tiffify. If you didn't request this, ignore this email.</p>
          </div>
        </div>
      `
    });
    console.log(`📧 OTP email sent to ${toEmail}`);
    return { sent: true };
  } catch (err) {
    console.error(`❌ Email failed: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

// ══════════════════════════════════════════
//   IN-MEMORY OTP STORE
//   { "user@email.com": { otp, expiry, attempts } }
// ══════════════════════════════════════════
const otpStore = {};

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ══════════════════════════════════════════
//   ROUTE 1: Generate & Send OTP
//   POST /api/generate-otp
//   Body: { email: "user@example.com" }
// ══════════════════════════════════════════
app.post('/api/generate-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  // Rate limiting — max 3 requests per 10 minutes
  const existing = otpStore[email];
  if (existing && existing.requestCount >= 3 && Date.now() < existing.blockUntil) {
    const waitMin = Math.ceil((existing.blockUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many requests. Try again in ${waitMin} minute(s).`
    });
  }

  const otp = generateOTP();

  otpStore[email] = {
    otp,
    expiry:       Date.now() + 2 * 60 * 1000,
    attempts:     0,
    requestCount: existing ? existing.requestCount + 1 : 1,
    blockUntil:   existing && existing.requestCount >= 2 ? Date.now() + 10 * 60 * 1000 : 0
  };

  const result = await sendOTPEmail(email, otp);

  res.json({
    success:   true,
    message:   result.sent ? `OTP sent to ${email}` : 'OTP generated (demo mode)',
    emailSent: result.sent,
    demo:      result.demo || false,
    expiresIn: 120,
    // Only send OTP in response in demo mode
    ...(result.demo && { otp })
  });
});

// ══════════════════════════════════════════
//   ROUTE 2: Verify OTP
//   POST /api/verify-otp
//   Body: { email: "user@example.com", otp: "123456" }
// ══════════════════════════════════════════
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'OTP must be 6 digits' });
  }

  const record = otpStore[email];

  if (!record) {
    return res.json({ success: false, message: 'No OTP found. Please request a new one.' });
  }
  if (Date.now() > record.expiry) {
    delete otpStore[email];
    return res.json({ success: false, message: 'OTP expired. Please request a new one.' });
  }
  if (record.attempts >= 5) {
    delete otpStore[email];
    return res.json({ success: false, message: 'Too many wrong attempts. Request a new OTP.' });
  }
  if (record.otp !== otp) {
    otpStore[email].attempts++;
    const left = 5 - otpStore[email].attempts;
    return res.json({ success: false, message: `Incorrect OTP. ${left} attempt(s) remaining.` });
  }

  // ✅ Correct
  delete otpStore[email];
  console.log(`✅ OTP verified for ${email}`);

  res.json({
    success:  true,
    message:  'Email verified successfully!',
    email,
    verified: true,
    token:    crypto.randomBytes(32).toString('hex')
  });
});

// ══════════════════════════════════════════
//   ROUTE 3: Resend OTP
//   POST /api/resend-otp
//   Body: { email: "user@example.com" }
// ══════════════════════════════════════════
app.post('/api/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address' });
  }

  const otp      = generateOTP();
  const existing = otpStore[email];

  otpStore[email] = {
    otp,
    expiry:       Date.now() + 2 * 60 * 1000,
    attempts:     0,
    requestCount: existing ? existing.requestCount + 1 : 1,
    blockUntil:   0
  };

  const result = await sendOTPEmail(email, otp);

  res.json({
    success:   true,
    message:   result.sent ? 'New OTP sent to your email' : 'New OTP generated (demo mode)',
    emailSent: result.sent,
    demo:      result.demo || false,
    expiresIn: 120,
    ...(result.demo && { otp })
  });
});

// ══════════════════════════════════════════
//   ROUTE 4: Health Check
// ══════════════════════════════════════════
app.get('/api/status', (req, res) => {
  res.json({
    status:       'running',
    service:      'Tiffify OTP API',
    time:         new Date().toLocaleString('en-IN'),
    emailEnabled: !!transporter,
    activeOTPs:   Object.keys(otpStore).length
  });
});

// Auto-clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(otpStore).forEach(email => {
    if (now > otpStore[email].expiry) {
      delete otpStore[email];
    }
  });
}, 5 * 60 * 1000);

const path = require('path');
// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '../')));

// ── Root Route → serve tiffiy.html ──────────
// (No index.html in repo, so we serve tiffiy.html explicitly)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../tiffiy.html'));
});


// ── Start Server ──────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('════════════════════════════════════');
  console.log('  🍱 Tiffify OTP API Server');
  console.log(`  🚀 Running at http://localhost:${PORT}`);
  console.log('  📍 Routes:');
  console.log('     POST /api/generate-otp  { email }');
  console.log('     POST /api/verify-otp    { email, otp }');
  console.log('     POST /api/resend-otp    { email }');
  console.log('     GET  /api/status');
  console.log('════════════════════════════════════\n');
});