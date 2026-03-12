// ═══════════════════════════════════════
//  AUTH JS — Beny-Joe Cloud
// ═══════════════════════════════════════

// Redirect if already logged in
window.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (token) {
    // Verify token is still valid
    Auth.me().then(data => {
      if (data) window.location.href = 'dashboard.html';
    }).catch(() => removeToken());
  }

  // Handle OAuth callback (token in URL)
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    setToken(urlToken);
    Auth.me().then(user => {
      setUser(user);
      window.location.href = 'dashboard.html';
    }).catch(() => {
      removeToken();
      showError('loginError', 'Token invalide. Veuillez réessayer.');
    });
  }
});

function showLogin() {
  document.getElementById('loginCard').style.display = 'block';
  document.getElementById('registerCard').style.display = 'none';
}

function showRegister() {
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('registerCard').style.display = 'block';
}

function loginWithGoogle() {
  window.location.href = Auth.googleUrl();
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('loginError', 'Veuillez remplir tous les champs.');
    return;
  }

  const btn = document.querySelector('#loginCard .btn-primary');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion...';
  btn.disabled = true;

  try {
    const data = await Auth.login(email, password);
    setToken(data.token);
    setUser(data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('loginError', err.message);
    btn.innerHTML = '<span>Se connecter</span><i class="fa-solid fa-arrow-right"></i>';
    btn.disabled = false;
  }
}

async function register() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!name || !email || !password) {
    showError('registerError', 'Veuillez remplir tous les champs.');
    return;
  }
  if (password.length < 6) {
    showError('registerError', 'Le mot de passe doit faire au moins 6 caractères.');
    return;
  }

  const btn = document.querySelector('#registerCard .btn-primary');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Création...';
  btn.disabled = true;

  try {
    const data = await Auth.register(name, email, password);
    setToken(data.token);
    setUser(data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError('registerError', err.message);
    btn.innerHTML = '<span>Créer mon compte</span><i class="fa-solid fa-arrow-right"></i>';
    btn.disabled = false;
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function togglePw(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// Enter key support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginCard = document.getElementById('loginCard');
    if (loginCard && loginCard.style.display !== 'none') login();
    else register();
  }
});
