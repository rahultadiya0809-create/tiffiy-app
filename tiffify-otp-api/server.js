require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const crypto       = require('crypto');
const nodemailer   = require('nodemailer');
const path         = require('path');
const app          = express();

app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════
//   GMAIL SMTP — via Nodemailer
//   Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
//   Get App Password: https://myaccount.google.com/apppasswords
// ══════════════════════════════════════════
let transporter = null;

if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  // Verify connection on startup
  transporter.verify((err) => {
    if (err) {
      console.error('❌ Gmail SMTP connection failed:', err.message);
      console.error('   → Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
      transporter = null;
    } else {
      console.log('✅ Gmail SMTP connected — real email OTP enabled!');
      console.log(`   → Sending from: ${process.env.GMAIL_USER}`);
    }
  });
} else {
  console.log('⚠️  Gmail credentials not set — running in DEMO MODE');
  console.log('   → Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  console.log('   → Get App Password: https://myaccount.google.com/apppasswords');
}

// ── Helper: Send OTP Email via Gmail ─────
async function sendOTPEmail(toEmail, otp) {
  if (!transporter) {
    console.log(`\n📧 [DEMO MODE] OTP for ${toEmail}: ${otp}\n`);
    return { sent: false, demo: true };
  }

  const mailOptions = {
    from: `"🍱 Tiffify" <${process.env.GMAIL_USER}>`,
    to:   toEmail,
    subject: '🍱 Your Tiffify Verification Code',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#FF6B35,#C94E1E);padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:32px;letter-spacing:3px;font-weight:900;">🍱 TIFFIFY</h1>
          <p style="color:rgba(255,255,255,0.88);margin:8px 0 0;font-size:14px;">Fresh Homestyle Tiffin Delivered Daily</p>
        </div>
        <!-- Body -->
        <div style="padding:36px 32px;text-align:center;">
          <h2 style="color:#1A1208;margin:0 0 10px;font-size:22px;">Verify Your Account</h2>
          <p style="color:#7A6A55;margin:0 0 28px;font-size:14px;line-height:1.6;">
            Enter the OTP below to complete your registration.<br>
            This code is valid for <strong>2 minutes</strong>.
          </p>
          <!-- OTP Box -->
          <div style="background:#FFF0EB;border:2.5px dashed #FF6B35;border-radius:14px;padding:22px 36px;display:inline-block;margin-bottom:8px;">
            <span style="font-size:46px;font-weight:900;letter-spacing:12px;color:#FF6B35;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#7A6A55;font-size:12px;margin:22px 0 0;">
            ⚠️ Do not share this OTP with anyone.<br>
            This code expires in <strong>2 minutes</strong>.
          </p>
        </div>
        <!-- Footer -->
        <div style="background:#FFF8ED;padding:16px 24px;text-align:center;border-top:1px solid #EDE0CC;">
          <p style="color:#7A6A55;font-size:12px;margin:0;">
            © ${new Date().getFullYear()} Tiffify · If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${toEmail} (msgId: ${info.messageId})`);
    return { sent: true };
  } catch (err) {
    console.error(`❌ Gmail send failed: ${err.message}`);
    return { sent: false, error: err.message };
  }
}


// ══════════════════════════════════════════
//   IN-MEMORY OTP STORE
//   { "user@email.com": { otp, expiry, attempts, requestCount, blockUntil } }
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
    message:   result.sent ? `OTP sent to ${email}` : 'OTP generated (demo mode — set Gmail credentials in .env)',
    emailSent: result.sent,
    demo:      result.demo || false,
    expiresIn: 120,
    // Only include OTP in response when in demo mode (for testing)
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

  // ✅ Correct OTP
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
//   GET /api/status
// ══════════════════════════════════════════
app.get('/api/status', (req, res) => {
  res.json({
    status:       'running',
    service:      'Tiffify OTP API',
    time:         new Date().toLocaleString('en-IN'),
    emailMode:    transporter ? 'gmail-smtp' : 'demo',
    emailEnabled: !!transporter,
    gmailUser:    transporter ? process.env.GMAIL_USER : null,
    activeOTPs:   Object.keys(otpStore).length
  });
});


// ══════════════════════════════════════════
//   STATIC FILES + HTML SERVING
// ══════════════════════════════════════════
// Serve static files from the parent directory (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../')));

// Root → serve main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../tiffiy.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});


// ══════════════════════════════════════════
//   AUTO-CLEAN EXPIRED OTPs every 5 minutes
// ══════════════════════════════════════════
setInterval(() => {
  const now = Date.now();
  Object.keys(otpStore).forEach(email => {
    if (now > otpStore[email].expiry) {
      delete otpStore[email];
    }
  });
}, 5 * 60 * 1000);


// ── Start Server ──────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('════════════════════════════════════════');
  console.log('  🍱 Tiffify OTP API Server');
  console.log(`  🚀 Running at http://localhost:${PORT}`);
  console.log('  📧 Email mode: ' + (transporter ? 'Gmail SMTP' : 'Demo (set GMAIL_USER + GMAIL_APP_PASSWORD)'));
  console.log('  📍 Routes:');
  console.log('     POST /api/generate-otp  { email }');
  console.log('     POST /api/verify-otp    { email, otp }');
  console.log('     POST /api/resend-otp    { email }');
  console.log('     GET  /api/status');
  console.log('════════════════════════════════════════\n');
});