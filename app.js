const API_BASE = 'https://policiacal.discloud.app';

async function j(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

function secsToHMS(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
}

function setActiveView(name) {
  document.querySelectorAll('.nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.remove('hidden');
}

// HOME
async function loadKPIs() {
  try {
    const active = await j('/api/calls/active');
    document.getElementById('kpi-active').textContent = active.active.length;
  } catch {}
  try {
    const summary = await j('/api/calls/summary?days=7');
    const top = summary.topUsers?.[0];
    document.getElementById('kpi-top').textContent = top ? `${top.name} (${secsToHMS(top.totalSec)})` : '—';
    renderTopUsers(summary.topUsers || []);
  } catch {}
  try {
    const stats = await j('/api/calls/stats?range=1d');
    const total = Object.values(stats.byDay || {}).reduce((a,b)=>a+b,0);
    document.getElementById('kpi-today').textContent = secsToHMS(total);
  } catch {}
}

function renderTopUsers(list) {
  const el = document.getElementById('top-users');
  el.innerHTML = '';
  list.slice(0, 10).forEach((u, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = 'Abrir';
    btn.onclick = () => selectUser(u.id, u.name);
    li.innerHTML = `<span><span class="tag">#${i+1}</span> <strong>${u.name}</strong> <span class="muted">${secsToHMS(u.totalSec)}</span></span>`;
    li.appendChild(btn);
    el.appendChild(li);
  });
}

async function loadGroups() {
  try {
    const stats = await j('/api/calls/stats?range=7d');
    const el = document.getElementById('groups');
    el.innerHTML = '';
    const entries = Object.entries(stats.groups || {});
    for (const [name, g] of entries) {
      const total = Object.values(g.byDay || {}).reduce((a,b)=>a+b,0);
      const div = document.createElement('div');
      div.className = 'group';
      div.innerHTML = `<div class="name">${name.toUpperCase()}</div><div class="value">${secsToHMS(total)}</div>`;
      el.appendChild(div);
    }
  } catch {}
}

// TEMPO REAL
async function loadActive() {
  try {
    const data = await j('/api/calls/active');
    const ul = document.getElementById('active');
    ul.innerHTML = '';
    for (const a of data.active) {
      const li = document.createElement('li');
      const ch = a.channelName || a.channelId || '';
      li.innerHTML = `<span><span class="tag">${a.group}</span> <strong>${a.userName}</strong> <span class="muted">(${ch})</span></span><span class="muted">${secsToHMS(a.elapsedSec)}</span>`;
      ul.appendChild(li);
    }
  } catch {}
}

// OFICIAIS
async function loadOfficialsList() {
  try {
    const data = await j('/api/oficiais');
    const ul = document.getElementById('results');
    const q = document.getElementById('search').value.trim().toLowerCase();
    ul.innerHTML = '';
    (data.oficiais || [])
      .filter(o => !q || (o.nome || '').toLowerCase().includes(q))
      .forEach(o => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.textContent = 'Abrir';
        btn.onclick = () => selectUser(o.id, o.nome);
        li.innerHTML = `<span><strong>${o.nome}</strong> <span class="muted">(${o.id})</span></span>`;
        li.appendChild(btn);
        ul.appendChild(li);
      });
  } catch {}
}

function searchUsers() { loadOfficialsList(); }

// VISTORIAS
let selectedUser = null;

async function selectUser(id, name) {
  selectedUser = { id, name };
  setActiveView('vistorias');
  await renderVistorias();
}

function getRangeParam(range) {
  if (range === 'all') return '';
  return `range=${encodeURIComponent(range)}`;
}

async function renderVistorias() {
  const range = document.getElementById('vist-range').value;
  const group = document.getElementById('vist-group').value;
  const userId = (selectedUser?.id) || document.getElementById('vist-user').value.trim();

  // top summary
  const statsUrl = `/api/calls/stats?${getRangeParam(range)}${group?`&group=${encodeURIComponent(group)}`:''}${userId?`&userId=${encodeURIComponent(userId)}`:''}`;
  try {
    const stats = await j(statsUrl);
    const byDay = Object.entries(stats.byDay || {}).sort(([a],[b]) => a.localeCompare(b));
    const total = byDay.reduce((acc, [,v]) => acc + v, 0);
    const who = userId ? (selectedUser?.name ? `${selectedUser.name} (${userId})` : userId) : 'todos';
    let coins = '';
    if (stats.users && userId && stats.users[userId]) {
      coins = ` • Pontos: ${Math.floor((stats.users[userId].totalSec||0)/3000)}`;
    }
    document.getElementById('vist-summary').textContent = `Período: ${range} • Grupo: ${group || 'todos'} • Usuário: ${who} • Total: ${secsToHMS(total)}${coins}`;
  } catch {}

  // sessions grid
  const from = document.getElementById('vist-from')?.value;
  const to = document.getElementById('vist-to')?.value;
  const qs = (p) => Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  const sessionsUrl = userId
    ? `/api/calls/user/${encodeURIComponent(userId)}/history?limit=500${qs({from,to})?`&${qs({from,to})}`:''}`
    : `/api/calls/sessions?limit=300${qs({from,to})?`&${qs({from,to})}`:''}`;
  const data = await j(sessionsUrl);
  const rows = document.getElementById('vist-rows');
  rows.innerHTML = '';
  const fmt = (d) => new Date(d).toLocaleString();
  const now = Date.now();
  let since = 0;
  if (range.endsWith('d')) { since = now - (parseInt(range,10)||7)*24*3600*1000; }
  else if (range.endsWith('h')) { since = now - (parseInt(range,10)||24)*3600*1000; }
  const sinceISO = since ? new Date(since).toISOString() : null;
  data.sessions.forEach(s => {
    if (group && s.group !== group) return;
    if (sinceISO && s.endISO < sinceISO) return;
    const tr = document.createElement('tr');
    const userCell = s.userName ? `${s.userName} (${s.userId})` : s.userId;
    const ch = s.channelName || s.channelId || '';
    tr.innerHTML = `<td>${fmt(s.startISO)}</td><td>${fmt(s.endISO)}</td><td>${userCell}</td><td><span class="tag">${s.group}</span></td><td>${ch}</td><td>${secsToHMS(s.durationSec)}</td><td>${(s.coinsEarned!=null?s.coinsEarned:Math.floor((s.durationSec||0)/3000))}</td>`;
    rows.appendChild(tr);
  });

  // export handler uses latest table
  document.getElementById('vist-export').onclick = () => exportTableToCSV('vistorias.csv');
}

function exportTableToCSV(filename) {
  const rows = Array.from(document.querySelectorAll('#vist-rows tr'));
  const header = ['inicio','fim','usuario','grupo','canal','duracao','Pontos'];
  const data = rows.map(tr => Array.from(tr.children).map(td => '"'+td.textContent.replaceAll('"','""')+'"'));
  const csv = [header.map(h=>`"${h}"`).join(','), ...data.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Hooks
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  setActiveView(a.dataset.view);
  if (a.dataset.view === 'home') { loadKPIs(); loadGroups(); loadHomeCharts(); }
  if (a.dataset.view === 'tempo') { loadActive(); }
  if (a.dataset.view === 'oficiais') { loadOfficialsList(); }
  if (a.dataset.view === 'ranking') { loadRanking(); }
  if (a.dataset.view === 'guarnicao') { loadGuarnicoes(); }
}));

document.getElementById('btnSearch').addEventListener('click', searchUsers);
document.getElementById('search').addEventListener('keydown', (e)=>{ if (e.key==='Enter') searchUsers(); });
document.getElementById('rank-search-btn').addEventListener('click', loadRanking);
document.getElementById('rank-search').addEventListener('keydown', (e)=>{ if (e.key==='Enter') loadRanking(); });
document.getElementById('vist-apply').addEventListener('click', renderVistorias);

// initial
setActiveView('home');
loadKPIs();
loadGroups();
loadHomeCharts();
setInterval(loadKPIs, 15000);
setInterval(loadActive, 8000);
setInterval(loadHomeCharts, 60000);

// RANKING (coins)
async function loadRanking() {
  const range = document.getElementById('rank-range').value;
  const from = document.getElementById('rank-from')?.value;
  const to = document.getElementById('rank-to')?.value;
  const searchEl = document.getElementById('rank-search');
  const q = (searchEl?.value || '').trim().toLowerCase();
  const qs = (p) => Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  const stats = await j(`/api/calls/ranking-medals?range=${encodeURIComponent(range)}${qs({from,to})?`&${qs({from,to})}`:''}`);
  const oficiais = await j('/api/oficiais');
  const setOficiais = new Set((oficiais.oficiais || []).map(o => o.id));
  let list = (stats.ranking || []).filter(r => setOficiais.has(r.id));

  if (q) {
    list = list.filter(r => {
      const name = (r.name || '').toLowerCase();
      const idStr = String(r.id || '').toLowerCase();
      return name.includes(q) || idStr.includes(q);
    });
  }

  const top = list.slice(0, 6);
  const grid = document.getElementById('rank-top');
  grid.innerHTML = '';
  top.forEach((r, idx) => {
    const card = document.createElement('div');
    card.className = 'rank-card';
    card.innerHTML = `<div class="rank-left"><div class="rank-pos">${idx+1}</div><div><div class="rank-name">${r.name || r.id}</div><div class="muted">medalhas: ${r.medals}</div></div></div><div class="pill pill-gold">${r.medals}</div>`;
    grid.appendChild(card);
  });

  const tbody = document.getElementById('rank-rows');
  tbody.innerHTML = '';
  list.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${r.name || r.id}</td><td>${r.medals}</td><td>${secsToHMS((r.totalSec||0))}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('rank-refresh').addEventListener('click', loadRanking);

// COMANDO GUARNIÇÃO
let gLoaded = false;
let gState = { type: 'cargo', key: null };
let gCatalog = { cargos: [], calls: [] };

async function loadGuarnicoes() {
  try {
    const data = await j('/api/calls/guarnicoes');
    gCatalog = data;
    const cc = document.getElementById('chips-cargos');
    const ca = document.getElementById('chips-calls');
    if (!cc || !ca) return;
    cc.innerHTML = ''; ca.innerHTML = '';
    (data.cargos || []).forEach(c => {
      const el = document.createElement('span'); el.className = 'chip'; el.textContent = c.name;
      el.onclick = () => { setGuarnicaoSelection('cargo', c.key, c.name); };
      cc.appendChild(el);
    });
    (data.calls || []).forEach(c => {
      const el = document.createElement('span'); el.className = 'chip'; el.textContent = c.name;
      el.onclick = () => { setGuarnicaoSelection('call', c.key, c.name); };
      ca.appendChild(el);
    });
    // build dropdown of guarnições (cargos)
    const sel = document.getElementById('g-select-cargo');
    if (sel) {
      sel.innerHTML = '';
      (data.cargos || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.key; opt.textContent = c.name;
        sel.appendChild(opt);
      });
      sel.onchange = () => {
        const key = sel.value;
        const found = (gCatalog.cargos || []).find(x => x.key === key);
        if (found) setGuarnicaoSelection('cargo', found.key, found.name);
      };
    }

    if (!gState.key && (data.cargos || []).length) {
      setGuarnicaoSelection('cargo', data.cargos[0].key, data.cargos[0].name);
    } else {
      await loadGuarnicaoRanking();
    }
    if (!gLoaded) {
      const btn = document.getElementById('g-refresh');
      if (btn) btn.addEventListener('click', () => { loadGuarnicaoRanking(); loadGuarnicaoDetails(); });
      gLoaded = true;
    }
  } catch {}
}

function setGuarnicaoSelection(type, key, label) {
  gState = { type, key };
  const sel = document.getElementById('g-selected');
  if (sel) sel.textContent = `${type === 'cargo' ? 'Cargo' : 'Call'}: ${label}`;
  document.querySelectorAll('#chips-cargos .chip').forEach(ch => ch.classList.remove('active'));
  document.querySelectorAll('#chips-calls .chip').forEach(ch => ch.classList.remove('active'));
  const parent = type === 'cargo' ? '#chips-cargos' : '#chips-calls';
  Array.from(document.querySelectorAll(parent + ' .chip')).forEach(el => {
    if (el.textContent === label) el.classList.add('active');
  });
  loadGuarnicaoRanking();
  if (type === 'cargo') { loadGuarnicaoOficiais(); loadGuarnicaoDetails(); } else {
    const list = document.getElementById('g-oficiais'); if (list) list.innerHTML = '';
    const body = document.getElementById('g-details'); if (body) body.innerHTML = '';
  }
}

async function loadGuarnicaoRanking() {
  if (!gState.key) return;
  const range = document.getElementById('g-range')?.value || '7d';
  const from = document.getElementById('g-from')?.value;
  const to = document.getElementById('g-to')?.value;
  const qs = (p) => Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  let data;
  if (gState.type === 'cargo') {
    data = await j(`/api/calls/ranking/cargo?key=${encodeURIComponent(gState.key)}&range=${encodeURIComponent(range)}${qs({from,to})?`&${qs({from,to})}`:''}`);
  } else {
    data = await j(`/api/calls/ranking/call?group=${encodeURIComponent(gState.key)}&range=${encodeURIComponent(range)}${qs({from,to})?`&${qs({from,to})}`:''}`);
  }
  const list = data.ranking || [];
  const grid = document.getElementById('g-top'); if (grid) grid.innerHTML = '';
  list.slice(0, 6).forEach((r, idx) => {
    const card = document.createElement('div'); card.className = 'rank-card';
    card.innerHTML = `<div class=\"rank-left\"><div class=\"rank-pos\">${idx+1}</div><div><div class=\"rank-name\">${r.name || r.id}</div><div class=\"muted\">${secsToHMS(r.totalSec)}</div></div></div><div class=\"pill pill-gold\">${r.coins} Pontos</div>`;
    grid && grid.appendChild(card);
  });
  const tbody = document.getElementById('g-rows'); if (tbody) tbody.innerHTML = '';
  list.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${r.name || r.id}</td><td>${r.coins}</td><td>${secsToHMS(r.totalSec)}</td>`;
    tbody && tbody.appendChild(tr);
  });
}

async function loadGuarnicaoOficiais() {
  if (!gState.key || gState.type !== 'cargo') return;
  try {
    const data = await j(`/api/calls/oficiais/cargo?key=${encodeURIComponent(gState.key)}`);
    const ul = document.getElementById('g-oficiais'); if (!ul) return;
    ul.innerHTML = '';
    (data.oficiais || []).forEach(o => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = 'Abrir';
      btn.onclick = () => selectUser(o.id, o.name);
      li.innerHTML = `<span><strong>${o.name}</strong> <span class="muted">(${o.id})</span></span>`;
      li.appendChild(btn);
      ul.appendChild(li);
    });
  } catch {}
}

async function loadGuarnicaoDetails() {
  if (!gState.key || gState.type !== 'cargo') {
    const body = document.getElementById('g-details'); if (body) body.innerHTML = '';
    return;
  }
  const range = document.getElementById('g-range')?.value || '7d';
  const from = document.getElementById('g-from')?.value;
  const to = document.getElementById('g-to')?.value;
  const qs = (p) => Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  const data = await j(`/api/calls/guarnicao/cargo/details?key=${encodeURIComponent(gState.key)}&range=${encodeURIComponent(range)}${qs({from,to})?`&${qs({from,to})}`:''}`);
  const body = document.getElementById('g-details'); if (!body) return;
  body.innerHTML = '';
  (data.details || []).forEach((d, idx) => {
    const tr = document.createElement('tr');
    const today = d.todayEarned ? '50m ✓' : (d.todayAccruedSec ? secsToHMS(d.todayAccruedSec) : '—');
    const status = d.activeNow ? 'Ativo' : '—';
    tr.innerHTML = `<td>${idx+1}</td><td>${d.name || d.id}</td><td>${secsToHMS(d.totalSec||0)}</td><td>${d.coins||0}</td><td>${d.medals||0}</td><td>${today}</td><td>${status}</td><td>${d.lastEndISO ? new Date(d.lastEndISO).toLocaleString() : '—'}</td><td><button data-id="${d.id}">Abrir</button></td>`;
    body.appendChild(tr);
    const btn = tr.querySelector('button');
    if (btn) btn.onclick = () => selectUser(d.id, d.name);
  });
}

// THEME COLORS FOR GROUPS
const GROUP_COLORS = {
  comandogeral: '#6aa5ff',
  prf: '#4ee1a0',
  pmerj: '#ffb057',
  pcerj: '#ff6a88'
};

// HOME CHARTS
async function loadHomeCharts() {
  try {
    const stats = await j('/api/calls/stats?range=7d');
    // line chart over byDay
    const days = Object.entries(stats.byDay || {}).sort(([a],[b]) => a.localeCompare(b));
    const labels = days.map(([d]) => d.slice(5));
    const values = days.map(([,v]) => v);
    renderLineChart(document.getElementById('chart-line-7d'), labels, values);

    // donut by group: sum of last 7 days
    const groupEntries = Object.entries(stats.groups || {}).map(([g, obj]) => {
      const sum = Object.values(obj.byDay || {}).reduce((a,b)=>a+b,0);
      return [g, sum];
    }).filter(([,v]) => v > 0);
    renderDonutChart(document.getElementById('chart-pie-groups'), groupEntries, document.getElementById('legend-pie'));

    // multiline by groups (guarnições)
    const series = {};
    const daysMap = Object.entries(stats.byDay || {}).sort(([a],[b]) => a.localeCompare(b));
    const labels2 = daysMap.map(([d]) => d.slice(5));
    Object.entries(stats.groups || {}).forEach(([g, obj]) => {
      const byDay = obj.byDay || {};
      series[g] = daysMap.map(([fullDay]) => byDay[fullDay] || 0);
    });
    const mlCanvas = document.getElementById('chart-line-groups');
    if (mlCanvas) {
      renderMultiLineChart(mlCanvas, labels2, series, document.getElementById('legend-line-groups'));
    }
  } catch {}
}

function renderLineChart(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const pad = { l: 48, r: 12, t: 18, b: 28 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const max = Math.max(1, ...values);
  const min = 0;

  // background grid
  ctx.fillStyle = '#111633';
  ctx.fillRect(pad.l, pad.t, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i=0;i<=4;i++) {
    const y = pad.t + (h * i / 4);
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
  }
  ctx.stroke();

  // line path
  const step = labels.length > 1 ? (w / (labels.length - 1)) : w;
  ctx.beginPath();
  labels.forEach((_, i) => {
    const x = pad.l + i * step;
    const v = values[i] || 0;
    const y = pad.t + h - (v - min) / (max - min) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#6aa5ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // area gradient
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
  grad.addColorStop(0, 'rgba(106,165,255,0.35)');
  grad.addColorStop(1, 'rgba(106,165,255,0.05)');
  ctx.lineTo(pad.l + w, pad.t + h);
  ctx.lineTo(pad.l, pad.t + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // y-axis label (max)
  ctx.fillStyle = '#8ea0c7';
  ctx.font = '12px system-ui';
  const maxHMS = secsToHMS(max);
  ctx.fillText(maxHMS, 6, pad.t + 12);

  // x-axis ticks
  const tickEvery = Math.max(1, Math.ceil(labels.length / 8));
  labels.forEach((d, i) => {
    if (i % tickEvery === 0) {
      const x = pad.l + i * step;
      ctx.fillText(d, x - 10, pad.t + h + 18);
    }
  });
}

function renderDonutChart(canvas, pairs, legendEl) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const cx = W/2, cy = H/2;
  const r = Math.min(W, H) * 0.42;
  const inner = r * 0.6;

  const total = pairs.reduce((a,[,v])=>a+v,0) || 1;
  let start = -Math.PI/2;
  legendEl.innerHTML = '';

  pairs.forEach(([name, val]) => {
    const frac = val / total;
    const end = start + frac * Math.PI * 2;
    const color = GROUP_COLORS[name] || '#9db4ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    start = end;

    const item = document.createElement('div');
    item.className = 'legend-item';
    const dot = document.createElement('div');
    dot.className = 'legend-dot';
    dot.style.background = color;
    const pct = Math.round((val/total)*100);
    item.appendChild(dot);
    item.appendChild(document.createTextNode(`${name.toUpperCase()} • ${pct}% (${secsToHMS(val)})`));
    legendEl.appendChild(item);
  });

  // cut inner circle
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI*2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // center label
  ctx.fillStyle = '#e7ecff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('TOTAL', cx, cy - 6);
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#8ea0c7';
  ctx.fillText(secsToHMS(total), cx, cy + 14);
}

function renderMultiLineChart(canvas, labels, seriesMap, legendEl) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const pad = { l: 48, r: 12, t: 18, b: 28 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  const allVals = Object.values(seriesMap).flat();
  const max = Math.max(1, ...allVals);
  const min = 0;

  ctx.fillStyle = '#111633';
  ctx.fillRect(pad.l, pad.t, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1; ctx.beginPath();
  for (let i=0;i<=4;i++) { const y = pad.t + (h * i / 4); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + w, y); }
  ctx.stroke();

  const step = labels.length > 1 ? (w / (labels.length - 1)) : w;
  legendEl.innerHTML = '';
  Object.entries(seriesMap).forEach(([name, vals]) => {
    const color = GROUP_COLORS[name] || '#9db4ff';
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + h - (v - min) / (max - min) * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

    const item = document.createElement('div'); item.className = 'legend-item';
    const dot = document.createElement('div'); dot.className = 'legend-dot'; dot.style.background = color;
    item.appendChild(dot); item.appendChild(document.createTextNode(name.toUpperCase()));
    legendEl.appendChild(item);
  });

  ctx.fillStyle = '#8ea0c7'; ctx.font = '12px system-ui';
  ctx.fillText(secsToHMS(max), 6, pad.t + 12);
  const tickEvery = Math.max(1, Math.ceil(labels.length / 8));
  labels.forEach((d, i) => { if (i % tickEvery === 0) { const x = pad.l + i * step; ctx.fillText(d, x-10, pad.t + h + 18); } });
}

// Load charts once home is visible
loadHomeCharts();
