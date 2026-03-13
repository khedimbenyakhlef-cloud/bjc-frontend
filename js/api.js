// ═══════════════════════════════════════
//  API MODULE — Beny-Joe Cloud
// ═══════════════════════════════════════

const API_BASE = 'https://bjc-v4.onrender.com';

function getToken() {
  return localStorage.getItem('bjc_token');
}

function setToken(token) {
  localStorage.setItem('bjc_token', token);
}

function removeToken() {
  localStorage.removeItem('bjc_token');
  localStorage.removeItem('bjc_user');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('bjc_user'));
  } catch { return null; }
}

function setUser(user) {
  localStorage.setItem('bjc_user', JSON.stringify(user));
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    window.location.href = 'index.html';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Erreur ${res.status}`);
  }

  return data;
}

// Auth
const Auth = {
  login: (email, password) => apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (name, email, password) => apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  }),
  me: () => apiFetch('/api/auth/me'),
  googleUrl: () => `${API_BASE}/api/auth/google`
};

// Apps
const Apps = {
  list: () => apiFetch('/api/apps'),
  create: (data) => apiFetch('/api/apps', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/apps/${id}`, { method: 'DELETE' }),
  deploy: async (id, file) => {
    const token = getToken();
    const form = new FormData();
    form.append('zipFile', file);
    const res = await fetch(`${API_BASE}/api/apps/${id}/deploy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    if (res.status === 401) { removeToken(); window.location.href = 'index.html'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }
};

// Env Vars
const EnvVars = {
  list: (appId) => apiFetch(`/api/apps/${appId}/env`),
  add: (appId, key, value, isSecret) => apiFetch(`/api/apps/${appId}/env`, {
    method: 'POST',
    body: JSON.stringify({ key, value, isSecret })
  }),
  delete: (appId, key) => apiFetch(`/api/apps/${appId}/env/${key}`, { method: 'DELETE' })
};

// Functions
const Functions = {
  list: (appId) => apiFetch(`/api/apps/${appId}/functions`),
  create: (appId, data) => apiFetch(`/api/apps/${appId}/functions`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  invoke: (appId, funcId) => apiFetch(`/api/apps/${appId}/functions/${funcId}/invoke`, { method: 'POST' }),
  delete: (appId, funcId) => apiFetch(`/api/apps/${appId}/functions/${funcId}`, { method: 'DELETE' })
};
