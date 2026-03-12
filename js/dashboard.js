// ═══════════════════════════════════════
//  DASHBOARD JS — Beny-Joe Cloud
// ═══════════════════════════════════════

let currentApps = [];
let currentAppId = null;
let deleteAppId = null;

// ── INIT ──────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  if (!token) { window.location.href = 'index.html'; return; }

  try {
    const user = await Auth.me();
    setUser(user);
    renderUser(user);
    await loadApps();
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('token')) {
      removeToken();
      window.location.href = 'index.html';
    }
  }
});

function renderUser(user) {
  const name = user.name || user.email || 'Utilisateur';
  document.getElementById('userName').textContent = name;
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileEmail').textContent = user.email || '';
  document.getElementById('profilePlan').textContent = user.plan || 'Free';

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  if (user.avatarUrl) {
    document.getElementById('userAvatar').innerHTML = `<img src="${user.avatarUrl}" alt="${name}">`;
    document.getElementById('profileAvatar').innerHTML = `<img src="${user.avatarUrl}" alt="${name}">`;
  } else {
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('profileAvatar').textContent = initials;
  }
}

// ── APPS ──────────────────────────────
async function loadApps() {
  const grid = document.getElementById('appsList');
  grid.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i><p>Chargement...</p></div>';

  try {
    const data = await Apps.list();
    currentApps = Array.isArray(data) ? data : (data.apps || []);
    renderApps(currentApps);
    updateStats(currentApps);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>Erreur</h3><p>${err.message}</p></div>`;
  }
}

function renderApps(apps) {
  const grid = document.getElementById('appsList');

  if (!apps || apps.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-cubes"></i>
        <h3>Aucune application</h3>
        <p>Créez votre première application pour commencer</p>
      </div>`;
    return;
  }

  grid.innerHTML = apps.map(app => `
    <div class="app-card" id="app-${app.id}">
      <div class="app-card-header">
        <div>
          <div class="app-name">${escHtml(app.name)}</div>
          <div class="app-domain">
            ${app.domain ? `<a href="https://${app.domain}" target="_blank">${app.domain}</a>` : app.slug || '—'}
          </div>
        </div>
        <span class="app-badge ${getBadgeClass(app.status)}">${getStatusLabel(app.status)}</span>
      </div>
      <div class="app-meta">
        ${app.runtime ? `<span><i class="fa-solid fa-code"></i> ${app.runtime}</span> · ` : ''}
        <span><i class="fa-regular fa-clock"></i> ${formatDate(app.createdAt || app.created_at)}</span>
      </div>
      <div class="app-actions">
        <button class="btn-icon accent" title="Déployer" onclick="openDeploy('${app.id}', '${escHtml(app.name)}')">
          <i class="fa-solid fa-rocket"></i>
        </button>
        <button class="btn-icon" title="Variables d'environnement" onclick="openEnv('${app.id}', '${escHtml(app.name)}')">
          <i class="fa-solid fa-sliders"></i>
        </button>
        <button class="btn-icon" title="Fonctions serverless" onclick="openFunctions('${app.id}', '${escHtml(app.name)}')">
          <i class="fa-solid fa-bolt"></i>
        </button>
        ${app.domain ? `<a class="btn-icon green" href="https://${app.domain}" target="_blank" title="Voir le site"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
        <button class="btn-icon danger" title="Supprimer" onclick="openDelete('${app.id}', '${escHtml(app.name)}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function updateStats(apps) {
  const total = apps.length;
  const running = apps.filter(a => a.status === 'running').length;
  const deployed = apps.filter(a => a.status === 'running' || a.status === 'deployed').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statRunning').textContent = running;
  document.getElementById('statDeployed').textContent = deployed;
  document.getElementById('statsApps').textContent = total;
}

// ── CREATE APP ────────────────────────
function toggleRuntime() {
  const type = document.getElementById('newAppType').value;
  document.getElementById('runtimeGroup').style.display = type === 'fullstack' ? 'block' : 'none';
}

async function createApp() {
  const name = document.getElementById('newAppName').value.trim();
  const type = document.getElementById('newAppType').value;
  const runtime = document.getElementById('newAppRuntime').value;
  const description = document.getElementById('newAppDesc').value.trim();

  if (!name) { showToast('Veuillez entrer un nom', 'error'); return; }

  try {
    const app = await Apps.create({ name, type, runtime: type === 'fullstack' ? runtime : undefined, description });
    closeModal('createAppModal');
    showToast(`Application "${name}" créée !`, 'success');
    document.getElementById('newAppName').value = '';
    document.getElementById('newAppDesc').value = '';
    await loadApps();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── DEPLOY ────────────────────────────
let deployAppId = null;
let deployFile = null;

function openDeploy(appId, appName) {
  deployAppId = appId;
  deployFile = null;
  document.getElementById('deployAppName').textContent = appName;
  document.getElementById('deployProgress').style.display = 'none';
  document.getElementById('selectedFile').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
  document.getElementById('deployFile').value = '';
  document.getElementById('deployBtn').disabled = false;
  openModal('deployModal');
}

function fileSelected(input) {
  if (input.files && input.files[0]) {
    deployFile = input.files[0];
    document.getElementById('selectedFileName').textContent = deployFile.name;
    document.getElementById('selectedFile').style.display = 'flex';
    document.getElementById('uploadZone').style.display = 'none';
  }
}

function clearFile() {
  deployFile = null;
  document.getElementById('deployFile').value = '';
  document.getElementById('selectedFile').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
}

async function deployApp() {
  if (!deployFile) { showToast('Veuillez sélectionner un fichier ZIP', 'error'); return; }

  document.getElementById('deployProgress').style.display = 'block';
  document.getElementById('deployBtn').disabled = true;

  // Animate progress
  let progress = 0;
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  const interval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 85);
    fill.style.width = progress + '%';
  }, 400);

  try {
    await Apps.deploy(deployAppId, deployFile);
    clearInterval(interval);
    fill.style.width = '100%';
    text.textContent = 'Déploiement réussi !';
    showToast('Application déployée avec succès !', 'success');
    setTimeout(() => { closeModal('deployModal'); loadApps(); }, 1500);
  } catch (err) {
    clearInterval(interval);
    fill.style.width = '0%';
    text.textContent = 'Erreur lors du déploiement';
    document.getElementById('deployBtn').disabled = false;
    showToast(err.message, 'error');
  }
}

// ── ENV VARS ──────────────────────────
let envAppId = null;

async function openEnv(appId, appName) {
  envAppId = appId;
  document.getElementById('envAppName').textContent = appName;
  document.getElementById('envList').innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Chargement...</p>';
  openModal('envModal');
  await loadEnvVars();
}

async function loadEnvVars() {
  try {
    const data = await EnvVars.list(envAppId);
    const vars = Array.isArray(data) ? data : (data.envVars || data.variables || []);
    const list = document.getElementById('envList');

    if (!vars.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Aucune variable configurée.</p>';
      return;
    }

    list.innerHTML = vars.map(v => `
      <div class="env-item">
        <span class="env-key-display">${escHtml(v.key || v.name)}</span>
        <span class="env-val-display">${v.isSecret || v.secret ? '••••••••' : escHtml(String(v.value || ''))}</span>
        ${v.isSecret || v.secret ? '<span class="env-secret-badge">secret</span>' : ''}
        <button class="btn-icon danger" onclick="deleteEnvVar('${escHtml(v.key || v.name)}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('envList').innerHTML = `<p style="color:var(--red);font-size:13px;">${err.message}</p>`;
  }
}

async function addEnvVar() {
  const key = document.getElementById('newEnvKey').value.trim();
  const value = document.getElementById('newEnvValue').value;
  const isSecret = document.getElementById('newEnvSecret').checked;

  if (!key) { showToast('Clé requise', 'error'); return; }

  try {
    await EnvVars.add(envAppId, key, value, isSecret);
    document.getElementById('newEnvKey').value = '';
    document.getElementById('newEnvValue').value = '';
    document.getElementById('newEnvSecret').checked = false;
    showToast(`Variable "${key}" ajoutée`, 'success');
    await loadEnvVars();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteEnvVar(key) {
  try {
    await EnvVars.delete(envAppId, key);
    showToast(`Variable "${key}" supprimée`, 'success');
    await loadEnvVars();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── FUNCTIONS ─────────────────────────
let funcAppId = null;

async function openFunctions(appId, appName) {
  funcAppId = appId;
  document.getElementById('funcAppName').textContent = appName;
  document.getElementById('funcList').innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Chargement...</p>';
  openModal('functionsModal');
  await loadFunctions();
}

async function loadFunctions() {
  try {
    const data = await Functions.list(funcAppId);
    const funcs = Array.isArray(data) ? data : (data.functions || []);
    const list = document.getElementById('funcList');
    document.getElementById('statsFunctions').textContent = funcs.length;

    if (!funcs.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Aucune fonction créée.</p>';
      return;
    }

    list.innerHTML = funcs.map(f => `
      <div class="func-item">
        <div class="func-item-header">
          <div>
            <div class="func-name">${escHtml(f.name)}</div>
            <div class="func-meta">${f.runtime || 'nodejs18'} · ${f.invocations || 0} appels</div>
          </div>
          <div class="func-actions">
            <button class="btn-icon green" title="Tester" onclick="invokeFunction('${f.id}')">
              <i class="fa-solid fa-play"></i>
            </button>
            <button class="btn-icon danger" title="Supprimer" onclick="deleteFunction('${f.id}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('funcList').innerHTML = `<p style="color:var(--red);font-size:13px;">${err.message}</p>`;
  }
}

async function createFunction() {
  const name = document.getElementById('newFuncName').value.trim();
  const runtime = document.getElementById('newFuncRuntime').value;
  const code = document.getElementById('newFuncCode').value;

  if (!name) { showToast('Nom requis', 'error'); return; }

  try {
    await Functions.create(funcAppId, { name, runtime, code });
    document.getElementById('newFuncName').value = '';
    document.getElementById('newFuncCode').value = '';
    showToast(`Fonction "${name}" créée`, 'success');
    await loadFunctions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function invokeFunction(funcId) {
  try {
    const result = await Functions.invoke(funcAppId, funcId);
    showToast(`Résultat: ${JSON.stringify(result).substring(0, 80)}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteFunction(funcId) {
  try {
    await Functions.delete(funcAppId, funcId);
    showToast('Fonction supprimée', 'success');
    await loadFunctions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── DELETE APP ────────────────────────
function openDelete(appId, appName) {
  deleteAppId = appId;
  document.getElementById('deleteAppName').textContent = appName;
  openModal('deleteModal');
}

async function confirmDelete() {
  try {
    await Apps.delete(deleteAppId);
    closeModal('deleteModal');
    showToast('Application supprimée', 'success');
    await loadApps();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── UI HELPERS ────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`section-${name}`).classList.add('active');
  document.querySelector(`[data-section="${name}"]`).classList.add('active');

  const titles = { apps: 'Mes Applications', stats: 'Statistiques', profile: 'Mon Profil' };
  document.getElementById('topbarTitle').textContent = titles[name] || '';

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function logout() {
  removeToken();
  window.location.href = 'index.html';
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-xmark'}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function getBadgeClass(status) {
  const map = { running: 'badge-running', stopped: 'badge-stopped', deploying: 'badge-deploying', error: 'badge-error' };
  return map[status] || 'badge-stopped';
}

function getStatusLabel(status) {
  const map = { running: 'En ligne', stopped: 'Arrêtée', deploying: 'Déploiement', error: 'Erreur' };
  return map[status] || status || 'Inconnue';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// Drag & drop for upload
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.zip')) {
        deployFile = file;
        document.getElementById('selectedFileName').textContent = file.name;
        document.getElementById('selectedFile').style.display = 'flex';
        document.getElementById('uploadZone').style.display = 'none';
      } else {
        showToast('Format ZIP uniquement', 'error');
      }
    });
  }
});
