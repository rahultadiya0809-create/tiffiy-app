// ═══════════════════════════════════════════════════════════════
//  TIFFIFY — Tiffin Service Provider Registration JS
// ═══════════════════════════════════════════════════════════════

let serviceData = {};
let uploadedPhotos = []; // Array of { name, dataUrl, label }
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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

// ─── Toast ───────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type === 'success' ? 'success-toast' : type === 'error' ? 'error-toast' : ''}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Field Helpers ───────────────────────────────────────────
function showFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  const field = el?.closest('.field');
  if (field) {
    const input = field.querySelector('input, select, textarea');
    if (input) { input.classList.add('error'); setTimeout(() => input.classList.remove('error'), 600); }
  }
}
function hideFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ─── Step Navigation ─────────────────────────────────────────
function goStep(step) {
  document.querySelectorAll('.reg-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`regPanel${step}`);
  if (panel) panel.classList.add('active');

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

  // Scroll panel to top
  document.querySelector('.right-panel').scrollTop = 0;
}

// ─── Cuisine Tags ────────────────────────────────────────────
function toggleCuisine(el) {
  el.classList.toggle('selected');
}
function getSelectedCuisines() {
  return Array.from(document.querySelectorAll('.cuisine-tag.selected')).map(el => el.textContent.trim());
}

// ─── Veg Toggle ──────────────────────────────────────────────
function selectVegType(el) {
  document.querySelectorAll('.veg-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}
function getVegType() {
  const sel = document.querySelector('.veg-option.selected');
  return sel ? sel.dataset.value : '';
}

// ─── Day Picker ──────────────────────────────────────────────
function toggleDay(el) {
  el.classList.toggle('selected');
}
function getSelectedDays() {
  return Array.from(document.querySelectorAll('.day-chip.selected')).map(el => el.dataset.day);
}

// ══════════════════════════════════════════════════════════════
//  STEP 1: Business Info → Validate & Continue
// ══════════════════════════════════════════════════════════════
function step1Next() {
  const serviceName = document.getElementById('serviceName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const phone = document.getElementById('servicePhone').value.trim();
  const email = document.getElementById('serviceEmail').value.trim();
  const city = document.getElementById('serviceCity').value;
  const address = document.getElementById('serviceAddress').value.trim();
  const cuisines = getSelectedCuisines();
  const vegType = getVegType();
  let valid = true;

  if (!serviceName || serviceName.length < 2) { showFieldError('serviceNameError'); valid = false; } else { hideFieldError('serviceNameError'); }
  if (!ownerName || ownerName.length < 2) { showFieldError('ownerNameError'); valid = false; } else { hideFieldError('ownerNameError'); }
  if (!/^\d{10}$/.test(phone)) { showFieldError('phoneError'); valid = false; } else { hideFieldError('phoneError'); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('emailError'); valid = false; } else { hideFieldError('emailError'); }
  if (!city) { showFieldError('cityError'); valid = false; } else { hideFieldError('cityError'); }
  if (!address || address.length < 5) { showFieldError('addressError'); valid = false; } else { hideFieldError('addressError'); }
  if (cuisines.length === 0) { showToast('⚠️ Please select at least one cuisine type', 'error'); valid = false; }
  if (!vegType) { showToast('⚠️ Please select Veg / Non-Veg / Both', 'error'); valid = false; }

  if (!valid) return;

  serviceData = {
    serviceName,
    ownerName,
    phone,
    email,
    city,
    address,
    cuisines,
    vegType,
    registeredAt: new Date().toLocaleString('en-IN')
  };

  goStep(2);
}

// ══════════════════════════════════════════════════════════════
//  STEP 2: Service Details → Validate & Continue
// ══════════════════════════════════════════════════════════════
function step2Next() {
  const menuDesc = document.getElementById('menuDesc').value.trim();
  const priceMin = document.getElementById('priceMin').value.trim();
  const priceMax = document.getElementById('priceMax').value.trim();
  const deliveryRadius = document.getElementById('deliveryRadius').value.trim();
  const deliveryTime = document.getElementById('deliveryTime').value.trim();
  const capacity = document.getElementById('dailyCapacity').value.trim();
  const days = getSelectedDays();
  let valid = true;

  if (!menuDesc || menuDesc.length < 10) { showFieldError('menuDescError'); valid = false; } else { hideFieldError('menuDescError'); }
  if (!priceMin || parseInt(priceMin) < 1) { showFieldError('priceMinError'); valid = false; } else { hideFieldError('priceMinError'); }
  if (!priceMax || parseInt(priceMax) < parseInt(priceMin || 0)) { showFieldError('priceMaxError'); valid = false; } else { hideFieldError('priceMaxError'); }
  if (!deliveryRadius) { showFieldError('deliveryRadiusError'); valid = false; } else { hideFieldError('deliveryRadiusError'); }
  if (!deliveryTime) { showFieldError('deliveryTimeError'); valid = false; } else { hideFieldError('deliveryTimeError'); }
  if (!capacity || parseInt(capacity) < 1) { showFieldError('capacityError'); valid = false; } else { hideFieldError('capacityError'); }
  if (days.length === 0) { showToast('⚠️ Please select at least one operating day', 'error'); valid = false; }

  if (!valid) return;

  serviceData.menuDescription = menuDesc;
  serviceData.priceMin = parseInt(priceMin);
  serviceData.priceMax = parseInt(priceMax);
  serviceData.deliveryRadius = deliveryRadius;
  serviceData.deliveryTime = deliveryTime;
  serviceData.dailyCapacity = parseInt(capacity);
  serviceData.operatingDays = days;

  goStep(3);
}

// ══════════════════════════════════════════════════════════════
//  STEP 3: Photo Upload
// ══════════════════════════════════════════════════════════════
function initDropzone() {
  const dropzone = document.getElementById('photoDropzone');
  const fileInput = document.getElementById('photoInput');

  if (!dropzone || !fileInput) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset so same file can be selected again
  });
}

function handleFiles(files) {
  for (let i = 0; i < files.length; i++) {
    if (uploadedPhotos.length >= MAX_PHOTOS) {
      showToast(`⚠️ Maximum ${MAX_PHOTOS} photos allowed`, 'error');
      break;
    }

    const file = files[i];

    if (!file.type.startsWith('image/')) {
      showToast('❌ Only image files are allowed', 'error');
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('❌ Image must be under 2MB: ' + file.name, 'error');
      continue;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const labels = ['Logo / Brand', 'Food Photo', 'Kitchen', 'Menu Card', 'Ambience'];
      const labelIndex = uploadedPhotos.length;
      uploadedPhotos.push({
        name: file.name,
        dataUrl: e.target.result,
        label: labels[labelIndex] || 'Photo'
      });
      renderPhotoPreviews();
      showToast('📸 Photo added: ' + file.name, 'success');
    };
    reader.readAsDataURL(file);
  }
}

function renderPhotoPreviews() {
  const grid = document.getElementById('photoPreviewGrid');
  const counter = document.getElementById('photoCounter');
  grid.innerHTML = '';

  uploadedPhotos.forEach((photo, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-item';
    div.innerHTML = `
      <img src="${photo.dataUrl}" alt="${photo.label}">
      <div class="photo-label">${photo.label}</div>
      <button class="photo-remove" onclick="removePhoto(${idx})" title="Remove">×</button>
    `;
    grid.appendChild(div);
  });

  counter.innerHTML = `<strong>${uploadedPhotos.length}</strong> / ${MAX_PHOTOS} photos uploaded`;
}

function removePhoto(index) {
  const removed = uploadedPhotos.splice(index, 1);
  renderPhotoPreviews();
  showToast('🗑️ Removed: ' + removed[0].name, '');
}

function step3Next() {
  if (uploadedPhotos.length === 0) {
    showToast('⚠️ Please upload at least 1 photo of your tiffin service', 'error');
    return;
  }

  serviceData.photos = uploadedPhotos.map(p => ({ dataUrl: p.dataUrl, label: p.label }));

  // Build review
  buildReviewScreen();
  goStep(4);
}

// ══════════════════════════════════════════════════════════════
//  STEP 4: Review & Submit
// ══════════════════════════════════════════════════════════════
function buildReviewScreen() {
  const container = document.getElementById('reviewContent');

  container.innerHTML = `
    <div class="review-card">
      <div class="review-card-title">🏪 Business Information</div>
      <div class="review-row"><span class="review-key">Service Name</span><span class="review-val">${serviceData.serviceName}</span></div>
      <div class="review-row"><span class="review-key">Owner</span><span class="review-val">${serviceData.ownerName}</span></div>
      <div class="review-row"><span class="review-key">Phone</span><span class="review-val">+91 ${serviceData.phone}</span></div>
      <div class="review-row"><span class="review-key">Email</span><span class="review-val">${serviceData.email}</span></div>
      <div class="review-row"><span class="review-key">City</span><span class="review-val">${serviceData.city}</span></div>
      <div class="review-row"><span class="review-key">Address</span><span class="review-val">${serviceData.address}</span></div>
      <div class="review-row"><span class="review-key">Cuisine</span><span class="review-val">${serviceData.cuisines.join(', ')}</span></div>
      <div class="review-row"><span class="review-key">Type</span><span class="review-val">${serviceData.vegType}</span></div>
    </div>

    <div class="review-card">
      <div class="review-card-title">📋 Service Details</div>
      <div class="review-row"><span class="review-key">Menu</span><span class="review-val">${serviceData.menuDescription.substring(0, 80)}${serviceData.menuDescription.length > 80 ? '…' : ''}</span></div>
      <div class="review-row"><span class="review-key">Price Range</span><span class="review-val">₹${serviceData.priceMin} – ₹${serviceData.priceMax} / meal</span></div>
      <div class="review-row"><span class="review-key">Delivery Radius</span><span class="review-val">${serviceData.deliveryRadius} km</span></div>
      <div class="review-row"><span class="review-key">Delivery Time</span><span class="review-val">${serviceData.deliveryTime} min</span></div>
      <div class="review-row"><span class="review-key">Daily Capacity</span><span class="review-val">${serviceData.dailyCapacity} tiffins</span></div>
      <div class="review-row"><span class="review-key">Operating Days</span><span class="review-val">${serviceData.operatingDays.join(', ')}</span></div>
    </div>

    <div class="review-card">
      <div class="review-card-title">📸 Photos (${serviceData.photos.length})</div>
      <div class="review-photos">
        ${serviceData.photos.map(p => `<img class="review-photo-thumb" src="${p.dataUrl}" alt="${p.label}" title="${p.label}">`).join('')}
      </div>
    </div>
  `;
}

function submitRegistration() {
  const btn = document.getElementById('submitBtn');
  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    // Save to localStorage
    saveService(serviceData);

    // Show success
    showSuccessScreen();
    goStep(5);
    launchConfetti();
    showToast('🎉 Your tiffin service has been registered!', 'success');
  }, 1500);
}

function saveService(data) {
  const key = 'tiffify_services';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');

  const record = {
    ...data,
    id: Date.now(),
    status: 'active',
    rating: (4.5 + Math.random() * 0.4).toFixed(1),
    reviewCount: Math.floor(Math.random() * 50 + 10),
    // Store only first photo as thumbnail to save space
    thumbnail: data.photos[0]?.dataUrl || '',
    coverGradient: getRandomGradient()
  };

  existing.push(record);
  localStorage.setItem(key, JSON.stringify(existing));
}

function getRandomGradient() {
  const gradients = [
    'linear-gradient(135deg, #FFF0EB, #FFD5B8)',
    'linear-gradient(135deg, #E8F5EE, #B8EACB)',
    'linear-gradient(135deg, #FFF8ED, #FFE4A0)',
    'linear-gradient(135deg, #EDE8FF, #C4B8F0)',
    'linear-gradient(135deg, #FFEAEA, #FFB8B8)',
    'linear-gradient(135deg, #E8F0FF, #B8CAFF)'
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
}

function showSuccessScreen() {
  const container = document.getElementById('successContent');
  container.innerHTML = `
    <div class="success-icon"><span>✅</span></div>
    <h2>You're Live on Tiffify! 🎉</h2>
    <p>
      <strong>${serviceData.serviceName}</strong> is now registered and visible to customers in <strong>${serviceData.city}</strong>.
      People can now discover and order from your tiffin service!
    </p>
    <div class="success-card">
      <div class="success-card-row"><span class="key">🏪 Service</span><span class="val">${serviceData.serviceName}</span></div>
      <div class="success-card-row"><span class="key">👤 Owner</span><span class="val">${serviceData.ownerName}</span></div>
      <div class="success-card-row"><span class="key">📍 City</span><span class="val">${serviceData.city}</span></div>
      <div class="success-card-row"><span class="key">💰 Price</span><span class="val">₹${serviceData.priceMin} – ₹${serviceData.priceMax}</span></div>
      <div class="success-card-row"><span class="key">📸 Photos</span><span class="val">${serviceData.photos.length} uploaded</span></div>
      <div class="success-card-row"><span class="key">✅ Status</span><span class="val" style="color:var(--green);">Active</span></div>
    </div>
    <button class="submit-btn green" onclick="window.location.href='tiffiy.html'">
      <span class="btn-text">View Your Listing on Tiffify 🍱</span>
    </button>
    <div style="margin-top:1rem;">
      <button class="submit-btn outline" onclick="registerAnother()">
        <span class="btn-text">Register Another Service</span>
      </button>
    </div>
  `;
}

function registerAnother() {
  serviceData = {};
  uploadedPhotos = [];
  // Reset all form fields
  document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input[type="number"], textarea').forEach(el => el.value = '');
  document.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
  document.querySelectorAll('.cuisine-tag.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.veg-option.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.day-chip.selected').forEach(el => el.classList.remove('selected'));
  document.getElementById('photoPreviewGrid').innerHTML = '';
  document.getElementById('photoCounter').innerHTML = `<strong>0</strong> / ${MAX_PHOTOS} photos uploaded`;
  goStep(1);
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

// ─── Phone formatting ────────────────────────────────────────
const phoneInput = document.getElementById('servicePhone');
if (phoneInput) {
  phoneInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
  });
}

// ─── Number inputs formatting ────────────────────────────────
document.querySelectorAll('input[type="number"]').forEach(el => {
  el.addEventListener('input', function () {
    if (this.value < 0) this.value = 0;
  });
});

// ─── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDropzone();
});
