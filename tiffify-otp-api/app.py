"""
═══════════════════════════════════════════════════════════════
  🍱 TIFFIFY — Flask Backend API with Gmail SMTP
  Replaces the Node.js/Express + Nodemailer backend
  
  Routes:
    POST /api/generate-otp   → Generate & send OTP via Gmail
    POST /api/verify-otp     → Verify OTP
    POST /api/resend-otp     → Resend OTP
    GET  /api/status         → Health check
═══════════════════════════════════════════════════════════════
"""

import os
import secrets
import smtplib
import threading
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# ── Load .env from the project root ──────────────────────────
# Try root .env first, then fallback to local .env
root_env = os.path.join(os.path.dirname(__file__), '..', '.env')
local_env = os.path.join(os.path.dirname(__file__), '.env')

if os.path.exists(root_env):
    load_dotenv(root_env)
elif os.path.exists(local_env):
    load_dotenv(local_env)

# ── Flask App Setup ──────────────────────────────────────────
app = Flask(__name__, static_folder=None)
CORS(app)

# Parent directory (where HTML/CSS/JS files live)
PARENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


# ══════════════════════════════════════════════════════════════
#   GMAIL SMTP — via Python smtplib
#   Requires GMAIL_USER and GMAIL_APP_PASSWORD in .env
#   Get App Password: https://myaccount.google.com/apppasswords
# ══════════════════════════════════════════════════════════════
GMAIL_USER = os.environ.get('GMAIL_USER')
GMAIL_APP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD')

smtp_connected = False

if GMAIL_USER and GMAIL_APP_PASSWORD:
    try:
        # Test SMTP connection on startup
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.quit()
        smtp_connected = True
        print('[OK] Gmail SMTP connected -- real email OTP enabled!')
        print(f'   -> Sending from: {GMAIL_USER}')
    except Exception as e:
        print(f'[ERR] Gmail SMTP connection failed: {e}')
        print('   -> Check GMAIL_USER and GMAIL_APP_PASSWORD in .env')
else:
    print('[WARN] Gmail credentials not set -- running in DEMO MODE')
    print('   -> Set GMAIL_USER and GMAIL_APP_PASSWORD in .env')
    print('   -> Get App Password: https://myaccount.google.com/apppasswords')


def send_otp_email(to_email, otp):
    """Send OTP email via Gmail SMTP using smtplib."""
    if not smtp_connected:
        print(f'\n[MAIL] [DEMO MODE] OTP for {to_email}: {otp}\n')
        return {'sent': False, 'demo': True}

    # Build the HTML email template (same design as the Node.js version)
    current_year = datetime.now().year
    html_body = f"""
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
                <span style="font-size:46px;font-weight:900;letter-spacing:12px;color:#FF6B35;font-family:monospace;">{otp}</span>
            </div>
            <p style="color:#7A6A55;font-size:12px;margin:22px 0 0;">
                ⚠️ Do not share this OTP with anyone.<br>
                This code expires in <strong>2 minutes</strong>.
            </p>
        </div>
        <!-- Footer -->
        <div style="background:#FFF8ED;padding:16px 24px;text-align:center;border-top:1px solid #EDE0CC;">
            <p style="color:#7A6A55;font-size:12px;margin:0;">
                © {current_year} Tiffify · If you didn't request this, please ignore this email.
            </p>
        </div>
    </div>
    """

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f'"🍱 Tiffify" <{GMAIL_USER}>'
        msg['To'] = to_email
        msg['Subject'] = '🍱 Your Tiffify Verification Code'
        msg.attach(MIMEText(html_body, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())
        server.quit()

        print(f'[MAIL] OTP email sent to {to_email}')
        return {'sent': True}

    except Exception as e:
        print(f'[ERR] Gmail send failed: {e}')
        return {'sent': False, 'error': str(e)}


# ══════════════════════════════════════════════════════════════
#   IN-MEMORY OTP STORE
#   { "user@email.com": { otp, expiry, attempts, request_count, block_until } }
# ══════════════════════════════════════════════════════════════
otp_store = {}
otp_store_lock = threading.Lock()


def generate_otp():
    """Generate a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def is_valid_email(email):
    """Basic email validation."""
    import re
    return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email))


# ── Auto-clean expired OTPs every 5 minutes ─────────────────
def cleanup_expired_otps():
    """Background thread that cleans up expired OTPs every 5 minutes."""
    while True:
        time.sleep(5 * 60)
        now = time.time() * 1000  # ms
        with otp_store_lock:
            expired = [
                email for email, record in otp_store.items()
                if now > record['expiry']
            ]
            for email in expired:
                del otp_store[email]
            if expired:
                print(f'[CLEAN] Cleaned {len(expired)} expired OTP(s)')


cleanup_thread = threading.Thread(target=cleanup_expired_otps, daemon=True)
cleanup_thread.start()


# ══════════════════════════════════════════════════════════════
#   ROUTE 1: Generate & Send OTP
#   POST /api/generate-otp
#   Body: { email: "user@example.com" }
# ══════════════════════════════════════════════════════════════
@app.route('/api/generate-otp', methods=['POST'])
def api_generate_otp():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()

    if not email or not is_valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email address.'}), 400

    now = time.time() * 1000  # ms

    with otp_store_lock:
        existing = otp_store.get(email)

        # Rate limiting — max 3 requests per 10 minutes
        if (existing
                and existing.get('request_count', 0) >= 3
                and now < existing.get('block_until', 0)):
            wait_min = max(1, int((existing['block_until'] - now) / 60000) + 1)
            return jsonify({
                'success': False,
                'message': f'Too many requests. Try again in {wait_min} minute(s).'
            }), 429

        otp = generate_otp()
        request_count = (existing['request_count'] + 1) if existing else 1
        block_until = (now + 10 * 60 * 1000) if existing and existing.get('request_count', 0) >= 2 else 0

        otp_store[email] = {
            'otp': otp,
            'expiry': now + 2 * 60 * 1000,
            'attempts': 0,
            'request_count': request_count,
            'block_until': block_until
        }

    result = send_otp_email(email, otp)

    response = {
        'success': True,
        'message': f'OTP sent to {email}' if result.get('sent') else 'OTP generated (demo mode — set Gmail credentials in .env)',
        'emailSent': result.get('sent', False),
        'demo': result.get('demo', False),
        'expiresIn': 120
    }

    # Only include OTP in response when in demo mode (for testing)
    if result.get('demo'):
        response['otp'] = otp

    return jsonify(response)


# ══════════════════════════════════════════════════════════════
#   ROUTE 2: Verify OTP
#   POST /api/verify-otp
#   Body: { email: "user@example.com", otp: "123456" }
# ══════════════════════════════════════════════════════════════
@app.route('/api/verify-otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()

    if not email or not is_valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400

    if not otp or len(otp) != 6:
        return jsonify({'success': False, 'message': 'OTP must be 6 digits'}), 400

    now = time.time() * 1000  # ms

    with otp_store_lock:
        record = otp_store.get(email)

        if not record:
            return jsonify({'success': False, 'message': 'No OTP found. Please request a new one.'})

        if now > record['expiry']:
            del otp_store[email]
            return jsonify({'success': False, 'message': 'OTP expired. Please request a new one.'})

        if record['attempts'] >= 5:
            del otp_store[email]
            return jsonify({'success': False, 'message': 'Too many wrong attempts. Request a new OTP.'})

        if record['otp'] != otp:
            otp_store[email]['attempts'] += 1
            left = 5 - otp_store[email]['attempts']
            return jsonify({'success': False, 'message': f'Incorrect OTP. {left} attempt(s) remaining.'})

        # ✅ Correct OTP
        del otp_store[email]

    print(f'[OK] OTP verified for {email}')

    token = secrets.token_hex(32)
    return jsonify({
        'success': True,
        'message': 'Email verified successfully!',
        'email': email,
        'verified': True,
        'token': token
    })


# ══════════════════════════════════════════════════════════════
#   ROUTE 3: Resend OTP
#   POST /api/resend-otp
#   Body: { email: "user@example.com" }
# ══════════════════════════════════════════════════════════════
@app.route('/api/resend-otp', methods=['POST'])
def api_resend_otp():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip()

    if not email or not is_valid_email(email):
        return jsonify({'success': False, 'message': 'Invalid email address'}), 400

    otp = generate_otp()

    with otp_store_lock:
        existing = otp_store.get(email)
        request_count = (existing['request_count'] + 1) if existing else 1

        otp_store[email] = {
            'otp': otp,
            'expiry': time.time() * 1000 + 2 * 60 * 1000,
            'attempts': 0,
            'request_count': request_count,
            'block_until': 0
        }

    result = send_otp_email(email, otp)

    response = {
        'success': True,
        'message': 'New OTP sent to your email' if result.get('sent') else 'New OTP generated (demo mode)',
        'emailSent': result.get('sent', False),
        'demo': result.get('demo', False),
        'expiresIn': 120
    }

    if result.get('demo'):
        response['otp'] = otp

    return jsonify(response)


# ══════════════════════════════════════════════════════════════
#   ROUTE 4: Health Check
#   GET /api/status
# ══════════════════════════════════════════════════════════════
@app.route('/api/status', methods=['GET'])
def api_status():
    return jsonify({
        'status': 'running',
        'service': 'Tiffify OTP API (Flask)',
        'time': datetime.now().strftime('%d/%m/%Y, %I:%M:%S %p'),
        'emailMode': 'gmail-smtp' if smtp_connected else 'demo',
        'emailEnabled': smtp_connected,
        'gmailUser': GMAIL_USER if smtp_connected else None,
        'activeOTPs': len(otp_store)
    })


# ══════════════════════════════════════════════════════════════
#   STATIC FILES + HTML SERVING
# ══════════════════════════════════════════════════════════════
@app.route('/')
def serve_home():
    """Serve the main Tiffify app page."""
    return send_from_directory(PARENT_DIR, 'tiffiy.html')


@app.route('/login')
def serve_login():
    """Serve the login/registration page."""
    return send_from_directory(PARENT_DIR, 'login.html')


@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files (CSS, JS, images) from the parent directory."""
    return send_from_directory(PARENT_DIR, filename)


# ══════════════════════════════════════════════════════════════
#   START SERVER
#   Run directly: python app.py
#   Or import for Vercel: from app import app
# ══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3000))
    print('========================================')
    print('  Tiffify OTP API Server (Flask)')
    print(f'  Running at http://localhost:{PORT}')
    print(f'  Email mode: {"Gmail SMTP" if smtp_connected else "Demo (set GMAIL_USER + GMAIL_APP_PASSWORD)"}')
    print('  Routes:')
    print('     POST /api/generate-otp  { email }')
    print('     POST /api/verify-otp    { email, otp }')
    print('     POST /api/resend-otp    { email }')
    print('     GET  /api/status')
    print('========================================\n')
    app.run(host='0.0.0.0', port=PORT, debug=True)
