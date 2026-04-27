// ── Toast System ────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Loading State ────────────────────────────────────────────────────────────
function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Form Submit Helper ───────────────────────────────────────────────────────
async function submitForm(url, formData, btn) {
  setLoading(btn, true);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      body: formData
    });
    const data = await resp.json();
    return { ok: resp.ok, data };
  } catch (err) {
    return { ok: false, data: { message: 'Network error. Please try again.' } };
  } finally {
    setLoading(btn, false);
  }
}

// ── Toggle Password ──────────────────────────────────────────────────────────
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁️';
  });
});

// ── Password Strength ────────────────────────────────────────────────────────
const pwInput = document.getElementById('password');
const strengthFill = document.querySelector('.strength-fill');
if (pwInput && strengthFill) {
  pwInput.addEventListener('input', () => {
    const pw = pwInput.value;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];
    const widths = ['25%', '50%', '75%', '100%'];
    strengthFill.style.width   = score ? widths[score - 1] : '0%';
    strengthFill.style.background = score ? colors[score - 1] : 'transparent';
  });
}

// ── Register Form ────────────────────────────────────────────────────────────
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = registerForm.querySelector('.btn-primary');
    const { ok, data } = await submitForm('/register', new FormData(registerForm), btn);
    if (data.success) {
      showToast('Account created! Welcome to BuddyBot 🎉', 'success');
      setTimeout(() => {
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(-10px)';
        document.body.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => window.location.href = data.redirect, 400);
      }, 800);
    } else {
      showToast(data.message || 'Registration failed', 'error');
    }
  });
}

// ── Login Form ───────────────────────────────────────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('.btn-primary');
    const { ok, data } = await submitForm('/login', new FormData(loginForm), btn);
    if (data.success) {
      showToast('Welcome back! 👋', 'success');
      setTimeout(() => {
        document.body.style.opacity = '0';
        document.body.style.transform = 'translateY(-10px)';
        document.body.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        setTimeout(() => window.location.href = data.redirect, 400);
      }, 600);
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  });
}

// ── Page Transitions (Fade out on link click) ──────────────
document.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('//') && !link.getAttribute('target')) {
      e.preventDefault();
      document.body.style.opacity = '0';
      document.body.style.transform = 'translateY(-10px)';
      document.body.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      setTimeout(() => { window.location.href = href; }, 400);
    }
  });
});

// ── Expose showToast globally ──────────────────────────────────────────────
window.showToast = showToast;
