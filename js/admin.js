// ═══════════════════════════════════════════════════════════
//  ADMIN.JS — Beny-Joe Cloud V4
//  Fichier à placer : bjc-frontend/js/admin.js
//
//  Architecture identique à dashboard.js :
//  - utilise api.js (getToken, removeToken, apiFetch)
//  - utilise les mêmes classes CSS (toast, badge, btn-icon...)
//  - appelle https://bjc-v4.onrender.com/api/admin/*
// ═══════════════════════════════════════════════════════════
'use strict';

const API_BACKEND = 'https://bjc-v4.onrender.com';

// ── État global ──────────────────────────────────────────────
let curSec   = 'overview';
let allUsers = [], allAppsData = [], allMonApps = [];
let monF = 'all', uRoleF = 'all', uSearch = '', aStatusF = 'all', aSearch = '';
let uPage = 1, aPage = 1;
const PER = 15;
let arTimer = null;

// ── Horloge ──────────────────────────────────────────────────
setInterval(() => {
  const el = document.getElementById('adminClock');
  if (el) el.textContent = new Date().toLocaleTimeString('fr-FR');
}, 1000);

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  if (!getToken()) { window.location.href = 'index.html'; return; }
  try {
    const user = await Auth.me();
    if (user.role !== 'admin') {
      showToast('Accès refusé — administrateur requis', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 2000);
      return;
    }
    // Sidebar user
    document.getElementById('sidebarName').textContent = user.name || user.email.split('@')[0];
    const av = document.getElementById('sidebarAvatar');
    if (user.avatarUrl) {
      av.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">`;
    } else {
      av.textContent = (user.name || user.email)[0].toUpperCase();
    }
    loadSec('overview');
    startAR();
  } catch (e) {
    if (String(e.message).includes('401')) { removeToken(); window.location.href = 'index.html'; }
    else showToast(e.message, 'error');
  }
});

// ── Navigation ───────────────────────────────────────────────
const secTitles = {
  overview:   '<i class="fa-solid fa-chart-line" style="color:var(--accent);margin-right:8px"></i>Dashboard Admin',
  monitoring: '<i class="fa-solid fa-satellite-dish" style="color:var(--accent);margin-right:8px"></i>Monitoring',
  users:      '<i class="fa-solid fa-users" style="color:var(--accent);margin-right:8px"></i>Utilisateurs',
  apps:       '<i class="fa-solid fa-cubes" style="color:var(--accent);margin-right:8px"></i>Applications',
  deploys:    '<i class="fa-solid fa-rocket" style="color:var(--accent);margin-right:8px"></i>Déploiements',
  storage:    '<i class="fa-solid fa-hard-drive" style="color:var(--accent);margin-right:8px"></i>Stockage',
  activity:   '<i class="fa-solid fa-list-ul" style="color:var(--accent);margin-right:8px"></i>Activité',
};

function goSection(name, el) {
  event.preventDefault();
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('topbarTitle').innerHTML = secTitles[name] || name;
  curSec = name;
  loadSec(name);
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

function refreshNow() {
  const b = document.getElementById('rfBtn');
  b.classList.add('sping');
  setTimeout(() => b.classList.remove('sping'), 700);
  loadSec(curSec);
}

function loadSec(name) {
  const fn = {
    overview: loadOverview, monitoring: loadMonitoring,
    users: loadUsers, apps: loadAllApps, deploys: loadDeploys,
    storage: loadStorage, activity: loadActivity,
  };
  if (fn[name]) fn[name]();
}

// ── Auto-refresh monitoring ──────────────────────────────────
function startAR() {
  if (arTimer) clearInterval(arTimer);
  arTimer = setInterval(() => { if (curSec === 'monitoring') loadMonitoring(); }, 30000);
}
function toggleAR() {
  const b = document.getElementById('arBtn');
  if (arTimer) { clearInterval(arTimer); arTimer = null; b.textContent = 'OFF'; b.classList.remove('on'); }
  else { startAR(); b.textContent = 'ON'; b.classList.add('on'); }
}

// ════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════
async function loadOverview() {
  try {
    const d = await aFetch('/api/admin/stats');

    document.getElementById('kpiGrid').innerHTML = `
      <div class="kpi purple">
        <div class="kpi-lbl">Utilisateurs</div>
        <div class="kpi-val">${d.totalUsers ?? 0}</div>
        <div class="kpi-sub">+${d.newUsersToday ?? 0} aujourd'hui</div>
        <div class="kpi-ico"><i class="fa-solid fa-users"></i></div>
      </div>
      <div class="kpi blue">
        <div class="kpi-lbl">Total Apps</div>
        <div class="kpi-val">${d.totalApps ?? 0}</div>
        <div class="kpi-sub">${d.activeApps ?? 0} actives</div>
        <div class="kpi-ico"><i class="fa-solid fa-cubes"></i></div>
      </div>
      <div class="kpi green">
        <div class="kpi-lbl">En ligne</div>
        <div class="kpi-val">${d.activeApps ?? 0}</div>
        <div class="kpi-sub">${d.totalApps ? Math.round(((d.activeApps||0)/d.totalApps)*100) : 0}% du total</div>
        <div class="kpi-ico"><i class="fa-solid fa-circle-check"></i></div>
      </div>
      <div class="kpi orange">
        <div class="kpi-lbl">Déploiements / 24h</div>
        <div class="kpi-val">${d.deploymentsToday ?? 0}</div>
        <div class="kpi-sub">${d.totalDeployments ?? 0} au total</div>
        <div class="kpi-ico"><i class="fa-solid fa-rocket"></i></div>
      </div>
      <div class="kpi red">
        <div class="kpi-lbl">Apps en erreur</div>
        <div class="kpi-val">${d.errorApps ?? 0}</div>
        <div class="kpi-sub">${d.pendingApps ?? 0} en attente</div>
        <div class="kpi-ico"><i class="fa-solid fa-circle-xmark"></i></div>
      </div>
    `;

    // Bar chart déploiements
    const days = d.deploysByDay || [];
    const max = Math.max(...days.map(x => x.count||0), 1);
    document.getElementById('depChart').innerHTML = days.length
      ? days.map((x,i) => `
          <div class="bc-wrap">
            <div class="bc-bar ${i===days.length-1?'now':''}"
                 style="height:${Math.max(5,(x.count/max)*85)}px"
                 title="${x.count} déploiements le ${x.day}"></div>
            <div class="bc-lbl">${x.day||''}</div>
          </div>`)
        .join('')
      : '<div style="width:100%;text-align:center;color:var(--text-muted);font-size:12px;padding:16px">Aucune donnée</div>';

    // Type chart
    const types = d.appsByType || {};
    const tot = Object.values(types).reduce((a,b)=>a+b,0)||1;
    const tCols = { static:'var(--accent)', fullstack:'var(--orange)', serverless:'var(--green)' };
    const tLbls = { static:'📄 Statiques', fullstack:'⚡ Fullstack', serverless:'⚙️ Serverless' };
    document.getElementById('typeChart').innerHTML = Object.entries(types).map(([t,c]) => `
      <div class="type-item">
        <div class="type-hd"><span>${tLbls[t]||t}</span><strong style="font-family:var(--font-mono)">${c} (${Math.round((c/tot)*100)}%)</strong></div>
        <div class="type-track"><div class="type-fill" style="width:${(c/tot)*100}%;background:${tCols[t]||'#555d78'}"></div></div>
      </div>
    `).join('') || '<p style="color:var(--text-muted);font-size:12px">Aucune donnée</p>';

    // Recent activity
    const acts = d.recentActivity || [];
    const aIco = { deploy:['fa-rocket','d'], user:['fa-user-plus','u'], create:['fa-plus','c'], error:['fa-circle-xmark','e'] };
    document.getElementById('recentAct').innerHTML = acts.length
      ? acts.slice(0,8).map(a => {
          const [ic, cl] = aIco[a.type]||['fa-bolt','d'];
          return `<li class="act-item">
            <div class="act-ico ${cl}"><i class="fa-solid ${ic}"></i></div>
            <div style="flex:1"><div class="act-txt">${e(a.message||'—')}</div><div class="act-meta">${e(a.user_email||'')}</div></div>
            <div class="act-time">${fd(a.created_at)}</div>
          </li>`;
        }).join('')
      : '<li style="padding:1.5rem;text-align:center;color:var(--text-muted)">Aucune activité récente</li>';

  } catch (err) { showToast('Erreur dashboard : ' + err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// MONITORING
// ════════════════════════════════════════════════════════════
async function loadMonitoring() {
  try {
    const data = await aFetch('/api/admin/monitoring');
    allMonApps = data.apps || [];

    const cnt = { active:0, error:0, building:0, pending:0 };
    allMonApps.forEach(a => { if (cnt[a.status]!==undefined) cnt[a.status]++; });
    document.getElementById('mOn').textContent  = cnt.active;
    document.getElementById('mErr').textContent = cnt.error;
    document.getElementById('mBld').textContent = cnt.building;
    document.getElementById('mPnd').textContent = cnt.pending;

    renderMon();
  } catch (err) { showToast('Erreur monitoring : ' + err.message, 'error'); }
}

function fMon(s, btn) {
  monF = s;
  document.querySelectorAll('#sec-monitoring .fp .fpill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderMon();
}

function renderMon() {
  const apps = monF === 'all' ? allMonApps : allMonApps.filter(a => a.status === monF);
  const grid = document.getElementById('monGrid');
  if (!apps.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2.5rem;color:var(--text-muted)">Aucune application dans cette catégorie</div>';
    return;
  }

  const sm = {
    active:   { d:'dg', lbl:'En ligne',   uptime:99  },
    error:    { d:'dr', lbl:'Erreur',      uptime:0   },
    building: { d:'do', lbl:'Build...',    uptime:50  },
    pending:  { d:'dgr',lbl:'En attente', uptime:75  },
  };
  const sBadge = { active:'badge-running', error:'badge-error', building:'badge-deploying', pending:'badge-stopped' };

  grid.innerHTML = apps.map(app => {
    const s = sm[app.status] || sm.pending;
    const up = s.uptime;
    const uc = up >= 95 ? 'up-g' : up >= 60 ? 'up-o' : 'up-r';
    const siteUrl = `${API_BACKEND}/site/${app.slug}`;

    return `
      <div class="mc ${app.status==='error'?'err-card':''}">
        <div class="mc-top">
          <div>
            <div class="mc-name">${e(app.name)}</div>
            <div class="mc-owner"><i class="fa-solid fa-user" style="font-size:9px"></i> ${e(app.user_email||app.user_name||'—')}</div>
            <div class="mc-domain">${e(app.domain)}</div>
          </div>
          <div class="drow"><span class="d ${s.d}"></span><span style="font-size:11px">${s.lbl}</span></div>
        </div>
        <div class="mc-metrics">
          <div class="mc-m"><div class="mc-ml">Type</div><div class="mc-mv" style="font-size:12px">${app.app_type==='static'?'📄 Statique':'⚡ Fullstack'}</div></div>
          <div class="mc-m"><div class="mc-ml">Déploiements</div><div class="mc-mv">${app.deployment_count??0}</div></div>
          ${app.runtime?`<div class="mc-m"><div class="mc-ml">Runtime</div><div class="mc-mv" style="font-size:11px">${e(app.runtime)}</div></div>`:''}
          <div class="mc-m"><div class="mc-ml">Créée le</div><div class="mc-mv" style="font-size:10px">${fds(app.created_at)}</div></div>
        </div>
        <div class="up-bar">
          <div class="up-lbl"><span>Uptime estimé</span><strong style="font-family:var(--font-mono)">${up}%</strong></div>
          <div class="up-track"><div class="up-fill ${uc}" style="width:${up}%"></div></div>
        </div>
        <div class="mc-actions">
          ${app.status==='active'?`<a href="${siteUrl}/" target="_blank" class="btn-icon green" title="Voir le site" style="text-decoration:none"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`:''}
          <span class="app-badge ${sBadge[app.status]||'badge-stopped'}" style="font-size:10px;margin-left:auto">${s.lbl}</span>
          <button class="btn-icon danger" title="Supprimer l'app" onclick="adminDelApp(${app.id},'${e(app.name)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════
async function loadUsers() {
  try {
    allUsers = await aFetch('/api/admin/users');
    document.getElementById('uCnt').textContent = allUsers.length;
    renderUsers();
  } catch (err) { showToast('Erreur utilisateurs : ' + err.message, 'error'); }
}

function fUsers(q) { uSearch = q.toLowerCase(); uPage = 1; renderUsers(); }
function fURole(r, btn) {
  uRoleF = r; uPage = 1;
  document.querySelectorAll('#sec-users .fp .fpill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderUsers();
}

function renderUsers() {
  let list = allUsers;
  if (uRoleF === 'admin')    list = list.filter(u => u.role === 'admin');
  if (uRoleF === 'user')     list = list.filter(u => u.role === 'user');
  if (uRoleF === 'inactive') list = list.filter(u => !u.is_active);
  if (uSearch) list = list.filter(u =>
    (u.email||'').toLowerCase().includes(uSearch)||(u.name||'').toLowerCase().includes(uSearch)
  );
  const tot = list.length;
  const pg = list.slice((uPage-1)*PER, uPage*PER);

  document.getElementById('uBody').innerHTML = pg.length ? pg.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:50%;background:${u.role==='admin'?'linear-gradient(135deg,#7c3aed,#a78bfa)':'linear-gradient(135deg,var(--accent),#7b5cff)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">
            ${(u.name||u.email)[0].toUpperCase()}
          </div>
          <strong>${e(u.name||'—')}</strong>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${e(u.email)}</td>
      <td><span class="app-badge ${u.role==='admin'?'badge-deploying':'badge-running'}" style="font-size:10px">${u.role==='admin'?'🛡️ Admin':'👤 User'}</span></td>
      <td style="font-family:var(--font-mono)">${u.app_count??0}</td>
      <td><span class="app-badge badge-running" style="font-size:10px">${e(u.plan||'free')}</span></td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${fds(u.created_at)}</td>
      <td><div class="drow"><span class="d ${u.is_active?'dg':'dr'}"></span>${u.is_active?'Actif':'Suspendu'}</div></td>
      <td>
        <div class="ta">
          ${u.is_active
            ? `<button class="tb ban" onclick="toggleUser(${u.id},false,'${e(u.email)}')"><i class="fa-solid fa-ban"></i> Suspendre</button>`
            : `<button class="tb unban" onclick="toggleUser(${u.id},true,'${e(u.email)}')"><i class="fa-solid fa-check"></i> Activer</button>`
          }
          ${u.role!=='admin'?`<button class="tb promo" onclick="promoteUser(${u.id},'${e(u.email)}')"><i class="fa-solid fa-shield-halved"></i> Admin</button>`:''}
        </div>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Aucun utilisateur trouvé</td></tr>`;

  renderPgn('uPgn', tot, uPage, n => { uPage = n; renderUsers(); });
}

async function toggleUser(id, active, email) {
  if (!confirm(`${active?'Activer':'Suspendre'} l'utilisateur ${email} ?`)) return;
  try {
    await aFetch(`/api/admin/users/${id}/toggle`, { method:'PATCH', body:JSON.stringify({is_active:active}) });
    showToast(`Utilisateur ${active?'activé':'suspendu'}`, 'success');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function promoteUser(id, email) {
  if (!confirm(`Promouvoir ${email} en administrateur ?`)) return;
  try {
    await aFetch(`/api/admin/users/${id}/role`, { method:'PATCH', body:JSON.stringify({role:'admin'}) });
    showToast('Utilisateur promu administrateur !', 'success');
    loadUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// APPS
// ════════════════════════════════════════════════════════════
async function loadAllApps() {
  try {
    allAppsData = await aFetch('/api/admin/apps');
    document.getElementById('aCnt').textContent = allAppsData.length;
    renderApps();
  } catch (err) { showToast('Erreur apps : ' + err.message, 'error'); }
}

function fApps(q) { aSearch = q.toLowerCase(); aPage = 1; renderApps(); }
function fAStatus(s, btn) {
  aStatusF = s; aPage = 1;
  document.querySelectorAll('#sec-apps .fp .fpill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderApps();
}

function renderApps() {
  let list = allAppsData;
  if (aStatusF === 'active')    list = list.filter(a => a.status === 'active');
  if (aStatusF === 'error')     list = list.filter(a => a.status === 'error');
  if (aStatusF === 'pending')   list = list.filter(a => a.status === 'pending');
  if (aStatusF === 'static')    list = list.filter(a => a.app_type === 'static');
  if (aStatusF === 'fullstack') list = list.filter(a => a.app_type === 'fullstack');
  if (aSearch) list = list.filter(a =>
    (a.name||'').toLowerCase().includes(aSearch)||(a.user_email||'').toLowerCase().includes(aSearch)
  );
  const tot = list.length;
  const pg = list.slice((aPage-1)*PER, aPage*PER);

  const sBadge = { active:'badge-running', error:'badge-error', pending:'badge-stopped', building:'badge-deploying' };
  const sLabel = { active:'✅ Actif', error:'❌ Erreur', pending:'⏳ Attente', building:'⚙️ Build' };

  document.getElementById('aBody').innerHTML = pg.length ? pg.map(a => `
    <tr>
      <td><strong>${e(a.name)}</strong></td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${e(a.user_email||'—')}</td>
      <td><span class="app-badge ${a.app_type==='static'?'badge-stopped':'badge-deploying'}" style="font-size:10px">${a.app_type==='static'?'📄 Statique':'⚡ Fullstack'}</span></td>
      <td><span class="app-badge ${sBadge[a.status]||'badge-stopped'}" style="font-size:10px">${sLabel[a.status]||a.status}</span></td>
      <td style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis">${e(a.domain)}</td>
      <td style="font-family:var(--font-mono)">${a.deployment_count??0}</td>
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${fds(a.created_at)}</td>
      <td>
        <div class="ta">
          ${a.status==='active'?`<a href="${API_BACKEND}/site/${e(a.slug)}/" target="_blank" class="tb view">🔗 Voir</a>`:''}
          <button class="tb del" onclick="adminDelApp(${a.id},'${e(a.name)}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Aucune application trouvée</td></tr>`;

  renderPgn('aPgn', tot, aPage, n => { aPage = n; renderApps(); });
}

async function adminDelApp(id, name) {
  if (!confirm(`⚠️ Supprimer "${name}" ?\n\nCette action est IRRÉVERSIBLE.\nLes fichiers MinIO et les autres apps ne sont pas affectés.`)) return;
  try {
    await aFetch(`/api/admin/apps/${id}`, { method:'DELETE' });
    showToast(`App "${name}" supprimée`, 'success');
    loadAllApps();
    if (curSec === 'monitoring') loadMonitoring();
  } catch (err) { showToast(err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// DEPLOYMENTS
// ════════════════════════════════════════════════════════════
async function loadDeploys() {
  try {
    const deploys = await aFetch('/api/admin/deployments');
    const sBadge = { deployed:'badge-running', success:'badge-running', failed:'badge-error', queued:'badge-stopped', building:'badge-deploying' };
    document.getElementById('dBody').innerHTML = deploys.length
      ? deploys.map(d => `
        <tr>
          <td><strong>${e(d.app_name||'—')}</strong></td>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${e(d.user_email||'—')}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${e((d.version_id||'').substring(0,8))}</td>
          <td><span class="app-badge ${sBadge[d.status]||'badge-stopped'}" style="font-size:10px">${e(d.status)}</span></td>
          <td style="font-family:var(--font-mono)">${d.build_duration?d.build_duration+'s':'—'}</td>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${fd(d.created_at)}</td>
        </tr>`)
      .join('')
      : `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Aucun déploiement</td></tr>`;
  } catch (err) { showToast('Erreur déploiements : ' + err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════════════════════════
async function loadStorage() {
  try {
    const data = await aFetch('/api/admin/storage');
    const gb = ((data.totalBytes||0)/(1024**3)).toFixed(2);
    const mb = ((data.totalBytes||0)/(1024**2)).toFixed(0);

    document.getElementById('sUsed').textContent  = gb > 0.1 ? `${gb} Go` : `${mb} Mo`;
    document.getElementById('sSub').textContent   = 'Stockage total utilisé';
    document.getElementById('sFiles').textContent = data.totalFiles ?? '—';
    document.getElementById('sApps').textContent  = data.totalApps ?? '—';
    document.getElementById('sUsers').textContent = data.activeUsers ?? '—';
    document.getElementById('sPct').textContent   = `${gb} Go utilisés`;

    // Barre de stockage — pas de "limite", juste visuelle
    const fill = document.getElementById('sFill');
    const pct = Math.min(95, Math.max(5, parseFloat(gb) * 10)); // 10% par Go, max 95%
    fill.style.width = `${pct}%`;
    fill.style.background = pct >= 80
      ? 'linear-gradient(90deg,var(--red),#f87171)'
      : pct >= 50
      ? 'linear-gradient(90deg,var(--orange),#fbbf24)'
      : 'linear-gradient(90deg,var(--green),#4ade80)';

    document.getElementById('sTop').innerHTML = (data.topUsers||[]).length
      ? data.topUsers.map(u => `
        <tr>
          <td style="font-family:var(--font-mono);font-size:12px">${e(u.email||u.name||'—')}</td>
          <td style="font-family:var(--font-mono)">${u.app_count??0}</td>
          <td style="font-family:var(--font-mono)">${u.deploy_count??0}</td>
          <td style="font-family:var(--font-mono)">${((u.estimated_bytes||0)/(1024**2)).toFixed(1)} Mo</td>
        </tr>`)
      .join('')
      : '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--text-muted)">Aucune donnée</td></tr>';
  } catch (err) { showToast('Erreur stockage : ' + err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// ACTIVITY
// ════════════════════════════════════════════════════════════
async function loadActivity() {
  try {
    const items = await aFetch('/api/admin/activity');
    const aMap = {
      deploy:['fa-rocket','d'], user:['fa-user-plus','u'],
      create:['fa-plus','c'],   error:['fa-circle-xmark','e'],
      delete:['fa-trash','e'],
    };
    document.getElementById('fullAct').innerHTML = items.length
      ? items.map(item => {
          const [ic, cl] = aMap[item.type]||['fa-bolt','d'];
          return `<li class="act-item">
            <div class="act-ico ${cl}"><i class="fa-solid ${ic}"></i></div>
            <div style="flex:1">
              <div class="act-txt">${e(item.message||'—')}</div>
              <div class="act-meta">${e(item.user_email||'')}</div>
            </div>
            <div class="act-time">${fd(item.created_at)}</div>
          </li>`;
        }).join('')
      : '<li style="padding:1.5rem;text-align:center;color:var(--text-muted)">Aucune activité</li>';
  } catch (err) { showToast('Erreur activité : ' + err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

// Pagination générique
function renderPgn(elId, total, curPage, onPage) {
  const pages = Math.ceil(total / PER);
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML =
    Array.from({length:pages},(_,i) =>
      `<button class="pg ${i+1===curPage?'on':''}" onclick="(${onPage.toString()})(${i+1})">${i+1}</button>`
    ).join('') +
    `<span class="pg-inf">${total} élément${total!==1?'s':''}</span>`;
}

// Fetch admin avec auth
async function aFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type':'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BACKEND}${path}`, { ...opts, headers });
  if (res.status === 401) { removeToken(); window.location.href = 'index.html'; return; }
  if (res.status === 403) throw new Error('Accès refusé — rôle admin requis');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// Toast — identique à dashboard.js
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid fa-${type==='success'?'circle-check':'circle-xmark'}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// Toggle sidebar (responsive)
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// Logout
function logout() { removeToken(); window.location.href = 'index.html'; }

// Escape HTML
function e(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Format date long
function fd(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

// Format date court
function fds(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' });
}
