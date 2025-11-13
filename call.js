const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

module.exports = function setupCallTracking(app, client, { GUILD_ID, ROLE_IDS = [] }) {
  const CALL_GROUPS = {
    comandogeral: [
      "1182489324961402900",
      "1137588484161421443",
      "1162255835439824926",
      "1153866349332942938"
    ],
    prf: [
      "1364743015704432661",
      "1423882127799484416",
      "909536909204787211"
    ],
    pmerj: [
      "1364743015704432661",
      "1423882127799484416",
      "909536909204787211"
    ],
    pcerj: [
      "1364743015704432661",
      "1423882127799484416",
      "909536909204787211"
    ]
  };

  // Map de cargos (por função/role)
  const CARGOS = [
    { key: 'pmerj', name: 'PMERJ', roleIds: ['1075201814770757642'] },
    { key: 'pcerj', name: 'PCERJ', roleIds: ['909536846638379019'] },
    { key: 'pf',    name: 'PF',    roleIds: ['1137579919417811015'] },
    { key: 'prf',   name: 'PRF',   roleIds: ['1075206178394611822'] },
    { key: 'eb',    name: 'EB',    roleIds: ['1361174102890643466'] }
  ];

  const TRACKED_CHANNELS = new Set(
    Object.values(CALL_GROUPS).flat()
  );

  const DATA_DIR = path.join(__dirname, "data");
  const SESSIONS_FILE = path.join(DATA_DIR, "call_sessions.json");
  const STATS_FILE = path.join(DATA_DIR, "call_stats.json");
  const USERS_DIR = path.join(DATA_DIR, "users");
  const DAILY_MEDALS_FILE = path.join(DATA_DIR, "daily_medals.json");
  const MEDAL_TARGET_SEC = 50 * 60;

  const state = {
    sessions: [], // { userId, userName, channelId, group, startISO, endISO, durationSec }
    stats: { users: {}, groups: {}, byDay: {} },
    active: new Map(), // userId -> { userId, userName, channelId, group, startMs }
    medals: {} // { [day]: { [userId]: { accruedSec, earned, earnedAt? } } }
  };

  const channelNameCache = new Map();
  async function getChannelName(channelId) {
    if (!channelId) return null;
    if (channelNameCache.has(channelId)) return channelNameCache.get(channelId);
    try {
      const ch = await client.channels.fetch(channelId);
      if (ch && ch.name) {
        channelNameCache.set(channelId, ch.name);
        return ch.name;
      }
    } catch {}
    return null;
  }

  // Index de usuários por cargo (role -> grupo de guarnição)
  let cargoIndex = new Map(); // userId -> Set(keys)
  let cargoLastBuild = 0;

  async function buildCargoIndex() {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.members.fetch();
      const idx = new Map();
      guild.members.cache.forEach((member) => {
        const roleIds = Array.from(member.roles.cache.keys());
        const keys = new Set();
        for (const c of CARGOS) {
          if ((c.roleIds || []).some(r => roleIds.includes(r))) {
            keys.add(c.key);
          }
        }
        if (keys.size > 0) idx.set(member.id, keys);
      });
      cargoIndex = idx;
      cargoLastBuild = Date.now();
    } catch (e) {
      console.error('[call.js] buildCargoIndex erro:', e);
    }
  }

  function dayKeyFromMs(ms) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  async function ensureStorage() {
    try { await fsp.mkdir(DATA_DIR, { recursive: true }); } catch {}
    try { await fsp.mkdir(USERS_DIR, { recursive: true }); } catch {}
    if (!fs.existsSync(SESSIONS_FILE)) {
      await fsp.writeFile(SESSIONS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(STATS_FILE)) {
      await fsp.writeFile(STATS_FILE, JSON.stringify({ users: {}, groups: {}, byDay: {} }, null, 2));
    }
    if (!fs.existsSync(DAILY_MEDALS_FILE)) {
      await fsp.writeFile(DAILY_MEDALS_FILE, JSON.stringify({}, null, 2));
    }
  }

  async function loadStorage() {
    try {
      const rawS = await fsp.readFile(SESSIONS_FILE, "utf8");
      state.sessions = JSON.parse(rawS);
    } catch { state.sessions = []; }
    try {
      const rawT = await fsp.readFile(STATS_FILE, "utf8");
      state.stats = JSON.parse(rawT);
    } catch { state.stats = { users: {}, groups: {}, byDay: {} }; }
    try {
      const rawM = await fsp.readFile(DAILY_MEDALS_FILE, "utf8");
      state.medals = JSON.parse(rawM);
    } catch { state.medals = {}; }
  }

  async function saveSessions() {
    try { await fsp.writeFile(SESSIONS_FILE, JSON.stringify(state.sessions, null, 2)); } catch {}
  }

  async function saveStats() {
    try { await fsp.writeFile(STATS_FILE, JSON.stringify(state.stats, null, 2)); } catch {}
  }

  async function saveMedals() {
    try { await fsp.writeFile(DAILY_MEDALS_FILE, JSON.stringify(state.medals, null, 2)); } catch {}
  }

  function getGroupForChannel(channelId) {
    for (const [group, ids] of Object.entries(CALL_GROUPS)) {
      if (ids.includes(channelId)) return group;
    }
    return null;
  }

  function startSession(userId, userName, channelId, startMsOverride) {
    if (!TRACKED_CHANNELS.has(channelId)) return;
    const group = getGroupForChannel(channelId);
    state.active.set(userId, {
      userId,
      userName,
      channelId,
      group,
      startMs: startMsOverride || Date.now()
    });
  }

  function endSession(userId, endMsOverride) {
    const sess = state.active.get(userId);
    if (!sess) return null;
    const endMs = endMsOverride || Date.now();
    const durationSec = Math.max(1, Math.floor((endMs - sess.startMs) / 1000));
    const record = {
      userId: sess.userId,
      userName: sess.userName,
      channelId: sess.channelId,
      group: sess.group,
      startISO: new Date(sess.startMs).toISOString(),
      endISO: new Date(endMs).toISOString(),
      durationSec
    };
    state.sessions.push(record);
    accumulateStats(record);
    state.active.delete(userId);
    return record;
  }

  async function appendUserHistory(userId, record) {
    try {
      const file = path.join(USERS_DIR, `${userId}.json`);
      let arr = [];
      try { arr = JSON.parse(await fsp.readFile(file, 'utf8')); } catch {}
      const prevTotal = arr.reduce((a, s) => a + (s.durationSec || 0), 0);
      const coinsBefore = Math.floor(prevTotal / 3000);
      const coinsAfter = Math.floor((prevTotal + record.durationSec) / 3000);
      const coinsEarned = Math.max(0, coinsAfter - coinsBefore);
      const recWithCoins = { ...record, coinsEarned, coinsAfter, totalSecAfter: prevTotal + record.durationSec };
      arr.push(recWithCoins);
      await fsp.writeFile(file, JSON.stringify(arr, null, 2));
    } catch (e) {
      console.error('[call.js] Falha ao salvar histórico por usuário:', e);
    }
  }

  function accumulateStats(rec) {
    const day = rec.startISO.slice(0, 10);
    // users
    if (!state.stats.users[rec.userId]) {
      state.stats.users[rec.userId] = {
        id: rec.userId,
        name: rec.userName,
        totalSec: 0,
        byDay: {},
        byGroup: {},
        byChannel: {}
      };
    }
    const u = state.stats.users[rec.userId];
    u.name = rec.userName || u.name;
    u.totalSec += rec.durationSec;
    u.coins = Math.floor(u.totalSec / 3000);
    u.byDay[day] = (u.byDay[day] || 0) + rec.durationSec;
    u.byGroup[rec.group] = (u.byGroup[rec.group] || 0) + rec.durationSec;
    u.byChannel[rec.channelId] = (u.byChannel[rec.channelId] || 0) + rec.durationSec;

    // groups
    if (!state.stats.groups[rec.group]) {
      state.stats.groups[rec.group] = { totalSec: 0, byDay: {} };
    }
    const g = state.stats.groups[rec.group];
    g.totalSec += rec.durationSec;
    g.byDay[day] = (g.byDay[day] || 0) + rec.durationSec;

    // byDay
    if (!state.stats.byDay[day]) state.stats.byDay[day] = 0;
    state.stats.byDay[day] += rec.durationSec;
    // daily medal accumulation (cap at MEDAL_TARGET_SEC per day)
    if (!state.medals[day]) state.medals[day] = {};
    if (!state.medals[day][rec.userId]) state.medals[day][rec.userId] = { accruedSec: 0, earned: false };
    const dm = state.medals[day][rec.userId];
    if (!dm.earned) {
      const before = dm.accruedSec;
      const add = Math.min(MEDAL_TARGET_SEC - before, rec.durationSec);
      dm.accruedSec = Math.max(0, Math.min(MEDAL_TARGET_SEC, before + (add || 0)));
      if (dm.accruedSec >= MEDAL_TARGET_SEC) { dm.earned = true; dm.earnedAt = rec.endISO; }
    }
  }

  function displayName(member) {
    return (
      member?.nickname ||
      member?.user?.globalName ||
      member?.user?.username ||
      "Sem nome"
    );
  }

  // Initialize storage and prime active sessions on ready
  (async () => {
    await ensureStorage();
    await loadStorage();
  })().catch(() => {});

  client.on("ready", async () => {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.members.fetch();
      try { await guild.channels.fetch(); } catch {}
      // prime channel name cache for tracked channels
      for (const chId of TRACKED_CHANNELS) {
        try { const ch = await client.channels.fetch(chId); if (ch?.name) channelNameCache.set(chId, ch.name); } catch {}
      }
      guild.voiceStates.cache.forEach((vs) => {
        const chId = vs.channelId;
        if (chId && TRACKED_CHANNELS.has(chId)) {
          const member = vs.member;
          startSession(member.id, displayName(member), chId);
        }
      });
      console.log("[call.js] Vistoria de calls inicializada.");
      // Construir índice de cargos
      await buildCargoIndex();
      scheduleMidnightSplit();
    } catch (e) {
      console.error("[call.js] Erro ao inicializar estado de voz:", e);
    }
  });

  function nextMidnightMs(fromMs) {
    const d = new Date(fromMs || Date.now());
    d.setHours(24,0,0,0);
    return d.getTime();
  }

  function scheduleMidnightSplit() {
    const now = Date.now();
    const target = nextMidnightMs(now);
    const delay = Math.max(1000, target - now + 50);
    setTimeout(async () => {
      try { await splitActiveAtMidnight(); } catch (e) { console.error('[call.js] splitActiveAtMidnight erro:', e); }
      scheduleMidnightSplit();
    }, delay);
  }

  async function splitActiveAtMidnight() {
    const cutMs = nextMidnightMs(Date.now() - 1000);
    // end current day sessions at exactly midnight and start new ones
    for (const [userId, s] of Array.from(state.active.entries())) {
      try {
        const rec = endSession(userId, cutMs);
        if (rec) { saveSessions(); saveStats(); saveMedals(); appendUserHistory(userId, rec); }
        // start new session at midnight in same channel
        startSession(userId, s.userName, s.channelId, cutMs);
      } catch (e) {
        console.error('[call.js] erro ao dividir sessao na virada do dia:', e);
      }
    }
  }

  client.on("voiceStateUpdate", (oldState, newState) => {
    try {
      const userId = (newState?.id) || (oldState?.id) || newState?.member?.id || oldState?.member?.id;
      const member = newState?.member || oldState?.member;
      const name = displayName(member);

      const oldCh = oldState?.channelId || null;
      const newCh = newState?.channelId || null;
      const oldTracked = oldCh && TRACKED_CHANNELS.has(oldCh);
      const newTracked = newCh && TRACKED_CHANNELS.has(newCh);

      if (!userId) return;

      if (!oldTracked && newTracked) {
        // Joined a tracked channel
        startSession(userId, name, newCh);
      } else if (oldTracked && !newTracked) {
        // Left tracked channels
        const rec = endSession(userId);
        if (rec) { saveSessions(); saveStats(); saveMedals(); appendUserHistory(userId, rec); }
      } else if (oldTracked && newTracked && oldCh !== newCh) {
        // Moved between tracked channels
        const rec = endSession(userId);
        if (rec) { saveSessions(); saveStats(); saveMedals(); appendUserHistory(userId, rec); }
        startSession(userId, name, newCh);
      } else {
        // No change relevant to tracked channels
      }
    } catch (e) {
      console.error("[call.js] Erro em voiceStateUpdate:", e);
    }
  });

  // ============ API ============
  app.get("/api/calls/config", (req, res) => {
    res.json({ groups: CALL_GROUPS });
  });

  // Listar guarnições: por cargos e por calls
  app.get('/api/calls/guarnicoes', (req, res) => {
    const cargos = CARGOS.map(c => ({ key: c.key, name: c.name, roleIds: c.roleIds }));
    const calls = Object.entries(CALL_GROUPS).map(([key, ids]) => ({ key, name: key.toUpperCase(), channelIds: ids }));
    res.json({ cargos, calls });
  });

  // Oficiais por cargo
  app.get('/api/calls/oficiais/cargo', async (req, res) => {
    try {
      const { key } = req.query;
      const cargo = CARGOS.find(c => c.key === key);
      if (!cargo) return res.status(400).json({ error: 'cargo inválido' });
      const guild = await client.guilds.fetch(GUILD_ID);
      await guild.members.fetch();
      const list = [];
      guild.members.cache.forEach((member) => {
        if (member.user.bot) return;
        const has = cargo.roleIds.some(rid => member.roles.cache.has(rid));
        if (has) {
          list.push({ id: member.id, name: displayName(member), mention: `<@${member.id}>` });
        }
      });
      list.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
      res.json({ oficiais: list });
    } catch (e) {
      console.error('[call.js] /api/calls/oficiais/cargo erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  app.get("/api/calls/active", (req, res) => {
    const now = Date.now();
    const active = Array.from(state.active.values()).map((s) => ({
      userId: s.userId,
      userName: s.userName,
      channelId: s.channelId,
      channelName: channelNameCache.get(s.channelId) || null,
      group: s.group,
      startISO: new Date(s.startMs).toISOString(),
      elapsedSec: Math.floor((now - s.startMs) / 1000)
    }));
    res.json({ active });
  });

  app.get("/api/calls/sessions", (req, res) => {
    const { userId, from, to, limit } = req.query;
    let list = state.sessions;
    if (userId) list = list.filter((s) => s.userId === String(userId));
    if (from) {
      const f = Date.parse(from);
      if (!isNaN(f)) list = list.filter((s) => Date.parse(s.startISO) >= f);
    }
    if (to) {
      const t = Date.parse(to);
      if (!isNaN(t)) list = list.filter((s) => Date.parse(s.endISO) <= t);
    }
    const lim = Math.max(1, Math.min(1000, parseInt(limit || "200", 10)));
    const out = list.slice(-lim).map(s => ({ ...s, channelName: channelNameCache.get(s.channelId) || null }));
    res.json({ sessions: out, total: list.length });
  });

  app.get('/api/calls/user/:userId/history', async (req, res) => {
    try {
      const userId = String(req.params.userId);
      const file = path.join(USERS_DIR, `${userId}.json`);
      let arr = [];
      try { arr = JSON.parse(await fsp.readFile(file, 'utf8')); } catch {}
      // backfill coins for legacy records
      let running = 0; let coins = 0;
      arr = arr.map((s) => {
        running += s.durationSec || 0;
        const newCoins = Math.floor(running / 3000);
        const cEarned = Math.max(0, newCoins - coins);
        coins = newCoins;
        if (s.coinsAfter == null || s.coinsEarned == null || s.totalSecAfter == null) {
          return { ...s, coinsAfter: coins, coinsEarned: cEarned, totalSecAfter: running };
        }
        return s;
      });
      const { from, to, limit } = req.query;
      let list = arr;
      if (from) {
        const f = Date.parse(from);
        if (!isNaN(f)) list = list.filter((s) => Date.parse(s.startISO) >= f);
      }
      if (to) {
        const t = Date.parse(to);
        if (!isNaN(t)) list = list.filter((s) => Date.parse(s.endISO) <= t);
      }
      const lim = Math.max(1, Math.min(2000, parseInt(limit || '500', 10)));
      const out = list.slice(-lim).map(s => ({ ...s, channelName: channelNameCache.get(s.channelId) || null }));
      res.json({ sessions: out, total: list.length });
    } catch (e) {
      console.error('[call.js] /api/calls/user/:id/history erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  app.get("/api/calls/stats", (req, res) => {
    const { userId, group, range } = req.query;
    const r = (range || "all").toLowerCase();
    let sinceMs = 0;
    const now = Date.now();
    if (r.endsWith("d")) {
      const days = parseInt(r, 10) || 7;
      sinceMs = now - days * 24 * 3600 * 1000;
    } else if (r.endsWith("h")) {
      const hours = parseInt(r, 10) || 24;
      sinceMs = now - hours * 3600 * 1000;
    }
    const daySince = sinceMs ? dayKeyFromMs(sinceMs) : null;

    const cloned = JSON.parse(JSON.stringify(state.stats));

    function filterBySince(objByDay) {
      if (!daySince) return objByDay;
      const out = {};
      for (const [d, v] of Object.entries(objByDay || {})) {
        if (d >= daySince) out[d] = v;
      }
      return out;
    }

    function recomputeUserTotals(nu) {
      nu.totalSec = Object.values(nu.byDay || {}).reduce((a, b) => a + b, 0);
      nu.coins = Math.floor(nu.totalSec / 3000);
      return nu;
    }

    // filter users if needed
    if (userId) {
      const u = cloned.users[userId];
      if (!u) return res.json({ users: {}, groups: {}, byDay: {} });
      // recompute totals after range filter
      u.byDay = filterBySince(u.byDay);
      recomputeUserTotals(u);
      if (group) {
        const only = u.byGroup[group] || 0;
        u.byGroup = { [group]: only };
      }
      const filteredGroups = {};
      for (const [g, gval] of Object.entries(cloned.groups)) {
        if (group && g !== group) continue;
        filteredGroups[g] = {
          totalSec: gval.totalSec,
          byDay: filterBySince(gval.byDay)
        };
      }
      return res.json({ users: { [userId]: u }, groups: filteredGroups, byDay: filterBySince(cloned.byDay) });
    }

    // general filter by group and range
    const outUsers = {};
    for (const [uid, u] of Object.entries(cloned.users)) {
      const nu = { ...u };
      nu.byDay = filterBySince(nu.byDay);
      recomputeUserTotals(nu);
      if (group) {
        const only = nu.byGroup[group] || 0;
        nu.byGroup = { [group]: only };
      }
      outUsers[uid] = nu;
    }
    const outGroups = {};
    for (const [g, gval] of Object.entries(cloned.groups)) {
      if (group && g !== group) continue;
      outGroups[g] = { totalSec: gval.totalSec, byDay: filterBySince(gval.byDay) };
    }
    res.json({ users: outUsers, groups: outGroups, byDay: filterBySince(cloned.byDay) });
  });

  app.get("/api/calls/summary", (req, res) => {
    const { days = "7" } = req.query;
    const since = Date.now() - (parseInt(days, 10) || 7) * 24 * 3600 * 1000;
    const daySince = dayKeyFromMs(since);
    const users = [];
    for (const u of Object.values(state.stats.users)) {
      let total = 0;
      for (const [d, v] of Object.entries(u.byDay || {})) {
        if (d >= daySince) total += v;
      }
      users.push({ id: u.id, name: u.name, totalSec: total });
    }
    users.sort((a, b) => b.totalSec - a.totalSec);
    res.json({ topUsers: users.slice(0, 25) });
  });

  app.get("/api/calls/users/search", (req, res) => {
    const q = (req.query.q || "").toString().toLowerCase();
    if (!q) return res.json({ users: [] });
    const users = Object.values(state.stats.users)
      .filter(u => (u.name || "").toLowerCase().includes(q))
      .map(u => ({ id: u.id, name: u.name, totalSec: u.totalSec }))
      .slice(0, 50);
    res.json({ users });
  });

  function parseRange(range) {
    const r = (range || '7d').toLowerCase();
    const now = Date.now();
    if (r.endsWith('d')) return now - (parseInt(r, 10) || 7) * 24 * 3600 * 1000;
    if (r.endsWith('h')) return now - (parseInt(r, 10) || 24) * 3600 * 1000;
    return 0; // all
  }

  function collectRankingFromSessions(sessions) {
    const acc = new Map(); // userId -> { id, name, totalSec }
    for (const s of sessions) {
      const u = acc.get(s.userId) || { id: s.userId, name: s.userName || s.userId, totalSec: 0 };
      u.name = s.userName || u.name;
      u.totalSec += s.durationSec || 0;
      acc.set(s.userId, u);
    }
    const list = Array.from(acc.values()).map(u => ({ ...u, coins: Math.floor((u.totalSec || 0) / 3000) }));
    list.sort((a,b) => b.coins - a.coins || b.totalSec - a.totalSec);
    return list;
  }

  // Ranking por cargo (usa índice de roles)
  app.get('/api/calls/ranking/cargo', async (req, res) => {
    try {
      const { key, range = '7d', from, to } = req.query;
      if (!key || !CARGOS.find(c => c.key === key)) return res.status(400).json({ error: 'cargo inválido' });
      if (Date.now() - cargoLastBuild > 10*60*1000 || cargoIndex.size === 0) {
        await buildCargoIndex();
      }
      const since = from ? Date.parse(from) : parseRange(range);
      const until = to ? Date.parse(to) : 0;
      const allowed = new Set(Array.from(cargoIndex.entries()).filter(([,set]) => set.has(key)).map(([uid]) => uid));
      const list = state.sessions.filter(s => {
        const end = Date.parse(s.endISO);
        if (since && end < since) return false;
        if (until && end > until) return false;
        return allowed.has(s.userId);
      });
      return res.json({ ranking: collectRankingFromSessions(list) });
    } catch (e) {
      console.error('[call.js] /api/calls/ranking/cargo erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Ranking por call (por grupo de canais ou canal específico)
  app.get('/api/calls/ranking/call', (req, res) => {
    try {
      const { group, channelId, range = '7d', from, to } = req.query;
      const since = from ? Date.parse(from) : parseRange(range);
      const until = to ? Date.parse(to) : 0;
      const matchGroup = group && CALL_GROUPS[group];
      const list = state.sessions.filter((s) => {
        const end = Date.parse(s.endISO);
        if (since && end < since) return false;
        if (until && end > until) return false;
        if (channelId) return s.channelId === String(channelId);
        if (matchGroup) return s.group === group;
        return true;
      });
      return res.json({ ranking: collectRankingFromSessions(list) });
    } catch (e) {
      console.error('[call.js] /api/calls/ranking/call erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Ranking por medalhas (dias que atingiu a meta)
  app.get('/api/calls/ranking-medals', (req, res) => {
    try {
      const { range = '7d', from, to } = req.query;
      const sinceMs = from ? Date.parse(from) : parseRange(range);
      const untilMs = to ? Date.parse(to) : 0;
      const sinceDay = sinceMs ? new Date(sinceMs).toISOString().slice(0,10) : null;
      const untilDay = untilMs ? new Date(untilMs).toISOString().slice(0,10) : null;
      const ranks = new Map(); // userId -> { id, name, medals }
      const users = state.stats.users || {};
      for (const [day, byUser] of Object.entries(state.medals || {})) {
        if (sinceDay && day < sinceDay) continue;
        if (untilDay && day > untilDay) continue;
        for (const [uid, info] of Object.entries(byUser || {})) {
          const entry = ranks.get(uid) || { id: uid, name: users[uid]?.name || uid, medals: 0 };
          if (info.earned) entry.medals += 1;
          ranks.set(uid, entry);
        }
      }
      const ranking = Array.from(ranks.values()).sort((a,b) => b.medals - a.medals || (users[b.id]?.totalSec||0) - (users[a.id]?.totalSec||0));
      res.json({ ranking });
    } catch (e) {
      console.error('[call.js] /api/calls/ranking-medals erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Detalhes por guarnição (cargo): lista oficiais com horas, Pontos e medalhas
  app.get('/api/calls/guarnicao/cargo/details', async (req, res) => {
    try {
      const { key, range = '7d', from, to } = req.query;
      const cargo = CARGOS.find(c => c.key === key);
      if (!cargo) return res.status(400).json({ error: 'cargo inválido' });
      if (Date.now() - cargoLastBuild > 10*60*1000 || cargoIndex.size === 0) {
        await buildCargoIndex();
      }
      const since = from ? Date.parse(from) : parseRange(range);
      const until = to ? Date.parse(to) : 0;
      const sinceDay = since ? new Date(since).toISOString().slice(0,10) : null;
      const untilDay = until ? new Date(until).toISOString().slice(0,10) : null;

      const allowed = new Set(Array.from(cargoIndex.entries()).filter(([,set]) => set.has(key)).map(([uid]) => uid));
      const acc = new Map(); // uid -> { id,name,totalSec,coins,medals,lastEndISO,activeNow,todayAccruedSec,todayEarned }

      // Aggregate sessions time within window
      for (const s of state.sessions) {
        if (!allowed.has(s.userId)) continue;
        const end = Date.parse(s.endISO);
        if (since && end < since) continue;
        if (until && end > until) continue;
        const cur = acc.get(s.userId) || { id: s.userId, name: state.stats.users[s.userId]?.name || s.userId, totalSec: 0, coins: 0, medals: 0, lastEndISO: null, activeNow: false, todayAccruedSec: 0, todayEarned: false };
        cur.totalSec += (s.durationSec || 0);
        if (!cur.lastEndISO || s.endISO > cur.lastEndISO) cur.lastEndISO = s.endISO;
        acc.set(s.userId, cur);
      }
      // Coins (por tempo acumulado) e ativos 
      for (const [uid, cur] of acc.entries()) {
        cur.coins = Math.floor((cur.totalSec || 0) / 3000);
        cur.activeNow = state.active.has(uid);
      }
      // Medalhas (dias com meta batida) no intervalo
      for (const [day, byUser] of Object.entries(state.medals || {})) {
        if (sinceDay && day < sinceDay) continue;
        if (untilDay && day > untilDay) continue;
        for (const [uid, info] of Object.entries(byUser || {})) {
          if (!allowed.has(uid)) continue;
          const cur = acc.get(uid) || { id: uid, name: state.stats.users[uid]?.name || uid, totalSec: 0, coins: 0, medals: 0, lastEndISO: null, activeNow: state.active.has(uid), todayAccruedSec: 0, todayEarned: false };
          if (info.earned) cur.medals += 1;
          acc.set(uid, cur);
        }
      }
      // Hoje
      const today = new Date().toISOString().slice(0,10);
      const todayUsers = state.medals[today] || {};
      for (const [uid, info] of Object.entries(todayUsers)) {
        if (!allowed.has(uid)) continue;
        const cur = acc.get(uid) || { id: uid, name: state.stats.users[uid]?.name || uid, totalSec: 0, coins: 0, medals: 0, lastEndISO: null, activeNow: state.active.has(uid), todayAccruedSec: 0, todayEarned: false };
        cur.todayAccruedSec = info.accruedSec || 0;
        cur.todayEarned = !!info.earned;
        acc.set(uid, cur);
      }

      const details = Array.from(acc.values())
        .sort((a,b) => b.totalSec - a.totalSec || (b.medals||0) - (a.medals||0));
      res.json({ details });
    } catch (e) {
      console.error('[call.js] /api/calls/guarnicao/cargo/details erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Ranking de Pontos por tempo acumulado (padrão 7d)
  app.get('/api/calls/ranking', (req, res) => {
    try {
      const { range = '7d' } = req.query;
      const cloned = JSON.parse(JSON.stringify(state.stats));
      let sinceMs = 0; const now = Date.now();
      if (/^\d+d$/i.test(range)) sinceMs = now - (parseInt(range,10)||7)*24*3600*1000;
      if (/^\d+h$/i.test(range)) sinceMs = now - (parseInt(range,10)||24)*3600*1000;
      const sinceDay = sinceMs ? new Date(sinceMs).toISOString().slice(0,10) : null;

      function filterBySince(objByDay) {
        if (!sinceDay) return objByDay;
        const out = {};
        for (const [d, v] of Object.entries(objByDay || {})) {
          if (d >= sinceDay) out[d] = v;
        }
        return out;
      }

      const ranking = Object.values(cloned.users || {}).map(u => {
        const byDay = filterBySince(u.byDay);
        const total = Object.values(byDay || {}).reduce((a,b)=>a+b,0);
        const coins = Math.floor(total / 3000);
        return { id: u.id, name: u.name, totalSec: total, coins };
      }).sort((a,b) => b.coins - a.coins || b.totalSec - a.totalSec);

      res.json({ ranking });
    } catch (e) {
      console.error('[call.js] /api/calls/ranking erro:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });
};
