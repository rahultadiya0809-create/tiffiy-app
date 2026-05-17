// ═══════════════════════════════════════════════════════════════
//  TIFFIFY Login & Registration – Premium JS
// ═══════════════════════════════════════════════════════════════

let generatedOTP = '';
let timerInterval = null;
let userData = {};

// 🔴 Change this to your live Glitch URL after deploying the backend!
// Example: const API_BASE_URL = 'https://your-glitch-project.glitch.me';
const API_BASE_URL = 'http://localhost:3000';


// ─── Client-side OTP Generator ──────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Particles Background ────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const COLORS = ['rgba(255,107,53,0.3)', 'rgba(245,166,35,0.25)', 'rgba(216,170,72,0.2)'];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── Stat Counter Animation ──────────────────────────────────
document.querySelectorAll('.stat-item .num').forEach(el => {
  const target = parseInt(el.dataset.target);
  if (!target) return;
  const suffix = target >= 10000 ? 'K+' : target === 30 ? 'min' : '+';
  const displayTarget = target >= 10000 ? 10 : target;
  let current = 0;
  const step = Math.ceil(displayTarget / 40);
  const interval = setInterval(() => {
    current += step;
    if (current >= displayTarget) { current = displayTarget; clearInterval(interval); }
    el.textContent = current + suffix;
  }, 40);
});

// ─── Tab Switching ───────────────────────────────────────────
function switchTab(tab) {
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  const slider = document.getElementById('tabSlider');

  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginView.classList.add('active');
    registerView.classList.remove('active');
    slider.classList.remove('right');
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerView.classList.add('active');
    loginView.classList.remove('active');
    slider.classList.add('right');
  }
}

// ─── Login Handler ───────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  let valid = true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('loginEmailError'); valid = false;
  } else { hideFieldError('loginEmailError'); }

  if (!password || password.length < 6) {
    showFieldError('loginPasswordError'); valid = false;
  } else { hideFieldError('loginPasswordError'); }

  if (!valid) return;

  const btn = document.getElementById('loginBtn');
  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');
    // Check localStorage for registered user
    const customers = JSON.parse(localStorage.getItem('tiffify_customers') || '[]');
    const user = customers.find(u => u.email === email);
    if (user) {
      showToast('🎉 Welcome back, ' + user.name.split(' ')[0] + '!', 'success');
      setTimeout(() => { window.location.href = 'tiffify.html'; }, 1500);
    } else {
      showToast('✅ Login successful!', 'success');
      setTimeout(() => { window.location.href = 'tiffify.html'; }, 1500);
    }
  }, 1200);
}

// ─── Registration Step 1 ─────────────────────────────────────
function regStep1Next() {
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const city = document.getElementById('regCity').value;
  let valid = true;

  if (!name || name.length < 2) { showFieldError('regNameError'); valid = false; } else { hideFieldError('regNameError'); }
  if (!/^\d{10}$/.test(phone)) { showFieldError('regPhoneError'); valid = false; } else { hideFieldError('regPhoneError'); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('regEmailError'); valid = false; } else { hideFieldError('regEmailError'); }
  if (!city) { showFieldError('regCityError'); valid = false; } else { hideFieldError('regCityError'); }

  if (!valid) return;

  userData = {
    name, phone, email, city,
    countryCode: document.getElementById('countryCode').value,
    loginTime: new Date().toLocaleString('en-IN')
  };

  goRegStep(2);
}

// ─── Registration Step 2 — Send Email OTP (Free via Gmail) ───
async function regStep2Next() {
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  const agreed   = document.getElementById('agreeTerms').checked;
  let valid = true;

  if (password.length < 8) { showFieldError('regPassError'); valid = false; } else { hideFieldError('regPassError'); }
  if (password !== confirm) { showFieldError('regConfError'); valid = false; } else { hideFieldError('regConfError'); }
  if (!agreed) { showToast('⚠️ Please agree to Terms & Privacy Policy', 'error'); return; }

  if (!valid) return;

  userData.password = '••••••••';

  const btn = document.getElementById('sendOtpBtn');
  btn.classList.add('loading');

  try {
    const res  = await fetch(`${API_BASE_URL}/api/generate-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: userData.email })
    });
    const data = await res.json();
    btn.classList.remove('loading');

    if (!data.success) {
      showToast('❌ ' + data.message, 'error');
      return;
    }

    document.getElementById('otpSentMsg').innerHTML =
      `OTP sent to <strong>${userData.email}</strong>`;

    const otpBox = document.getElementById('otpInfoBox');
    if (data.demo && data.otp) {
      generatedOTP = data.otp;
      document.getElementById('otpDisplay').textContent = data.otp;
      if (otpBox) otpBox.style.display = 'flex';
      showToast('📧 Demo mode: OTP shown on screen', '');
    } else {
      generatedOTP = '';
      if (otpBox) otpBox.style.display = 'none';
      showToast('📧 OTP sent to ' + userData.email + '!', 'success');
    }

    goRegStep(3);
    startTimer(120);
    document.getElementById('otp1').focus();

  } catch (err) {
    btn.classList.remove('loading');
    showToast('❌ Cannot connect to server. Is it running?', 'error');
  }
}



// ─── Verify OTP — via Server API ────────────────────────────
async function verifyOTP() {
  const entered = ['otp1','otp2','otp3','otp4','otp5','otp6']
    .map(id => document.getElementById(id).value).join('');

  if (entered.length < 6) {
    showToast('⚠️ Enter all 6 digits', 'error'); return;
  }

  const btn = document.getElementById('verifyBtn');
  btn.classList.add('loading');

  try {
    const res  = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: userData.email, otp: entered })
    });
    const data = await res.json();
    btn.classList.remove('loading');

    if (data.success) {
      clearInterval(timerInterval);
      saveToLocalStorage({ ...userData, token: data.token });
      showSuccessScreen();
    } else {
      showToast('❌ ' + data.message, 'error');
      ['otp1','otp2','otp3','otp4','otp5','otp6'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('otp1').focus();
    }
  } catch (err) {
    btn.classList.remove('loading');
    if (generatedOTP && entered === generatedOTP) {
      clearInterval(timerInterval);
      saveToLocalStorage({ ...userData });
      showSuccessScreen();
    } else {
      showToast('❌ Cannot connect to server. Is it running?', 'error');
    }
  }
}


// ─── Success Screen ──────────────────────────────────────────
function showSuccessScreen() {
  goRegStep(4);
  document.getElementById('welcomeName').textContent = userData.name.split(' ')[0];
  document.getElementById('userSummary').innerHTML = `
    <div class="user-summary-row"><span class="key">👤 Name</span><span class="val">${userData.name}</span></div>
    <div class="user-summary-row"><span class="key">📱 Mobile</span><span class="val">${userData.countryCode} ${userData.phone}</span></div>
    <div class="user-summary-row"><span class="key">✉️ Email</span><span class="val">${userData.email}</span></div>
    <div class="user-summary-row"><span class="key">📍 City</span><span class="val">${userData.city}</span></div>
    <div class="user-summary-row"><span class="key">🕐 Registered</span><span class="val">${userData.loginTime}</span></div>
    <div class="user-summary-row"><span class="key">✅ Email Verified</span><span class="val" style="color:var(--green);">Yes</span></div>
  `;
  showToast('🎉 Registration successful! Welcome to Tiffify', 'success');
}

// ─── Save to localStorage ────────────────────────────────────
function saveToLocalStorage(data) {
  const key = 'tiffify_customers';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  const record = { ...data, id: Date.now(), otpVerified: true };
  existing.push(record);
  localStorage.setItem(key, JSON.stringify(existing));

  const csvHeaders = 'ID,Name,Phone,Email,City,Country Code,Login Time,OTP Verified\n';
  const csvRows = existing.map(r =>
    `${r.id},"${r.name}","${r.countryCode}${r.phone}","${r.email}","${r.city}","${r.countryCode}","${r.loginTime}","${r.otpVerified ? 'Yes' : 'No'}"`
  ).join('\n');
  localStorage.setItem('tiffify_customers_csv', csvHeaders + csvRows);
}

// ─── Timer ───────────────────────────────────────────────────
function startTimer(seconds) {
  let remaining = seconds;
  document.getElementById('resendBtn').classList.remove('visible');
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remaining--;
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById('timerDisplay').textContent = '00:00';
      document.getElementById('resendBtn').classList.add('visible');
    }
  }, 1000);
}
      // ─── Resend OTP — via Server API ─────────────────────────
async function resendOTP() {
  document.getElementById('resendBtn').disabled = true;
  try {
    const res  = await fetch(`${API_BASE_URL}/api/resend-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: userData.email })
    });
    const data = await res.json();

    const otpBox = document.getElementById('otpInfoBox');
    if (data.demo && data.otp) {
      generatedOTP = data.otp;
      document.getElementById('otpDisplay').textContent = data.otp;
      if (otpBox) otpBox.style.display = 'flex';
      showToast('📧 New OTP (demo mode — check screen)', '');
    } else {
      generatedOTP = '';
      if (otpBox) otpBox.style.display = 'none';
      showToast('📧 New OTP sent to ' + userData.email + '!', 'success');
    }
  } catch (err) {
    showToast('❌ Cannot connect to server', 'error');
  }

  document.getElementById('resendBtn').disabled = false;
  ['otp1','otp2','otp3','otp4','otp5','otp6'].forEach(id =>
    document.getElementById(id).value = '');
  document.getElementById('otp1').focus();
  clearInterval(timerInterval);
  startTimer(120);
}








// ─── OTP Input Navigation ────────────────────────────────────
function otpNext(current, nextId) {
  current.value = current.value.replace(/[^0-9]/g, '');
  if (current.value && nextId) document.getElementById(nextId).focus();
}
function otpBack(e, prevId, currentId) {
  if (e.key === 'Backspace' && !document.getElementById(currentId).value && prevId) {
    document.getElementById(prevId).focus();
  }
}

// ─── OTP Paste Support ───────────────────────────────────────
document.addEventListener('paste', function(e) {
  const active = document.activeElement;
  if (!active || !active.classList.contains('otp-input')) return;
  e.preventDefault();
  const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
  const inputs = ['otp1','otp2','otp3','otp4','otp5','otp6'];
  paste.split('').forEach((ch, i) => {
    if (inputs[i]) document.getElementById(inputs[i]).value = ch;
  });
  if (paste.length >= 6) document.getElementById('otp6').focus();
});

// ─── Reg Step Navigation ─────────────────────────────────────
function goRegStep(step) {
  document.querySelectorAll('.reg-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`regPanel${step}`).classList.add('active');

  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    const lbl = document.getElementById(`lbl${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'done', 'pending');
    lbl && lbl.classList.remove('active', 'done');
    if (i < step) { dot.classList.add('done'); lbl && lbl.classList.add('done'); }
    else if (i === step) { dot.classList.add('active'); lbl && lbl.classList.add('active'); }
    else { dot.classList.add('pending'); }
  }
  for (let i = 1; i <= 3; i++) {
    const line = document.getElementById(`line${i}`);
    if (line) line.classList.toggle('done', i < step);
  }
}

// ─── Password Strength ──────────────────────────────────────
function checkStrength() {
  const pw = document.getElementById('regPassword').value;
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { width: '0%', color: '#ccc', label: '' },
    { width: '20%', color: '#e53e3e', label: 'Very Weak' },
    { width: '40%', color: '#ed8936', label: 'Weak' },
    { width: '60%', color: '#ecc94b', label: 'Fair' },
    { width: '80%', color: '#48bb78', label: 'Strong' },
    { width: '100%', color: '#2D7D46', label: '💪 Very Strong' }
  ];
  const level = levels[score] || levels[0];
  fill.style.width = level.width;
  fill.style.background = level.color;
  text.textContent = level.label;
  text.style.color = level.color;
}

// ─── Toggle Password Visibility ──────────────────────────────
function togglePassword(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function showFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  // Add shake to closest input
  const field = el?.closest('.field');
  if (field) {
    const input = field.querySelector('input, select');
    if (input) { input.classList.add('error'); setTimeout(() => input.classList.remove('error'), 600); }
  }
}
function hideFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

let toastTimeout;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type === 'success' ? 'success-toast' : type === 'error' ? 'error-toast' : ''}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Phone formatting ────────────────────────────────────────
const phoneInput = document.getElementById('regPhone');
if (phoneInput) {
  phoneInput.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });
}

// ─── Confetti ────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#FF6B35', '#F5A623', '#2D7D46', '#e53e3e', '#4299e1', '#d8aa48'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = '-10px';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (Math.random() * 8 + 4) + 'px';
    piece.style.height = (Math.random() * 8 + 4) + 'px';
    piece.style.animationDelay = (Math.random() * 1.5) + 's';
    piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

// ─── Enter Key Support ───────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  const loginView = document.getElementById('loginView');
  if (loginView && loginView.classList.contains('active')) {
    handleLogin();
  }
});
