const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

module.exports = function setupCallTracking(app, client, { GUILD_ID, ROLE_IDS = [] }) {
  const CALL_GROUPS = {
  comandogeral: [
    "1182489324961402900",
    "1137588484161421443",
    "1162255835439824926",
    "1364743015704432661",
    "1423882127799484416",
    "909536909204787211",
    "909536906214268929",
    "1102391846635835582",
    "909536902326136862",
    "948763268376305725",
    "1153866349332942938",
    "1153867867926831235",
    "1153866992642703490",
    "1104906123418537985",
    "1261443422162522113",
    "1360053632866844752",
    "1288204818191482981"
    ],
    pmerj: [
    "1093242759235780750", 
    "1103060677322620999",
    "1162203482867118153",
    "966703234116890624",
    "1088967575846785024",
    "1103060692636020786",
    "1103061507564122142",
    "1019661127111688332",
    "1162203859045855292",
    "916350260908011650",
    "1041811316517654690",
    "1025116845298167879",
    "1025117175813505024",
    "1025117206989770772",
    "1025117244361035876",
    "1025117280272654416",
    "1025117302980616284",
    "1025117352150450196",
    "1070469261014868040",
    "1315921626361102336",
    "1025117978309705829",
    "1025118009938948206",
    "1025118357609009163",
    "1025118202218422272",
    "1025118241581973524",
    "1025118265414008972",
    "1025118735931027486",
    "1025118876519911485",
    "1025118951702790214",
    "1025118998305701898",
    "1103061968908202145",
    "1103061983827337226",
    "1103062099644661823",
    "1103062153474363534",
    "1156947247259455518",
    "1156946906086395936",
    "1156947066342350969",
    "1188110342677614633",
    "1329602691160215734",
    "1329602745581436978",
    "1288207800522117152"
    ],
    pcerj: [
    "1288349108461109269",
    "1019502117595136020",
    "1093243475027300514",
    "1230230091083153549",
    "1019661271517364244",
    "1288349939893796894",
    "982290587703205888",
    "996018537632112680",
    "996018606188023858",
    "996018655357837372",
    "996019669259522088",
    "1070472673198620743",
    "1070472743658721371",
    "1070472762742804550",
    "967958155399139428",
    "1093243194289950871",
    "1128749551629647992",
    "980660311306698793",
    "980660630619033631",
    "1133170518875455559",
    "1133170605643026604",
    "1133170639566545006",
    "1133170678640689173",
    "967876551427379292",
    "941113152928636928",
    "945826823479115827",
    "945826849366343690",
    "945826866646896661",
    "1289294508017582121"
    ],
    pf: [
    "1288205138615603252",
    "1173807147616829510",
    "1137592139933556796",
    "1194636878289309746",
    "1173807054293585920",
    "1137592182920982528",
    "1226358592693862420",
    "1137592549238911006",
    "1137592431450259486",
    "1137592822061608960",
    "1144024796657631232",
    "1137592776163340438",
    "1194650579100774551",
    "1194650674307289139",
    "1285861506965045322",
    "1285862819144667187",
    "1288198151366508585",
    "1212568739380334592",
    "1173804442752135208",
    "1194652769043361892",
    "1194652824194252932",
    "1212747283083431966",
    "1200057774344773632",
    "1200057332151890000",
    "1200057515736584212",
    "1306462225006858304",
    "1273052580481601598",
    "1144024844091019264",
    "1137592981579366470",
    "1229620835912908920",
    "1229620718703087728",
    "1236771399905972225",
    "1271114173040037971",
    "1229620604987117598",
    "1229986688059707464",
    "1308406490771619892" 

    ],
    prf: [
    "1354220146268438639",
    "1288208627131482252",
    "1288208671293313056",
    "1019501996031615046",
    "1288184349790961795",
    "1288183731827511316",
    "1288183682422669435",
    "19661342036201472",
    "1234315628655939695",
    "1288207581977776128",
    "974403206773895289",
    "964583803697905714",
    "920140917921443851",
    "920140963916152852",
    "920141004668026880",
    "920141043876397056",
    "920141072703836200",
    "964583705039470643",
    "964583739155939338",
    "1049053413608017950",
    "921891104662650900",
    "921891149709471764",
    "1019630555807092787",
    "1174189830159204432",
    "1072345841454559332",
    "920831457797230622",
    "1074015545860558960",
    "920831486729523210",
    "1051149081487101953",
    "1070464680461615194",
    "1255912334174453870",
    "921890838546628668",
    "921890962387664967",
    "1255912523606265996",
    "1019455709810794606",
    "1019455586930274304",
    "1019455636372734012",
    "1072344856057356328",
    "1070464663499837572",
    "1102411774105489448",
    "1019630608672116776",
    "1168303250940887171"


    ],
    eb: [
    "1365046855750258828",
    "1365047098504122388",
    "1365047148135317586",
    "1365047216401547324",
    "1365047242012098650",
    "1365047795198853141",
    "1365047308139499602",
    "1365047844754558986",
    "1365047371154723028",
    "1365047419259326565",
    "1365047535844196422",
    "1365047594237169674",
    "1365047719797981195",
    "1365047951852048400",
    "1365048093313335296",
    "1365048163794288692",
    "1365048193984761907",
    "1429945812531810547",
    "1365049481363718205",
    "1365048807305384107",
    "1365049268716703874",
    "1429945489217945701"

    ],
    coe: [
    "1215018751305711647",  
    "1070467014549852252",
    "1393001159853215815",
    "1070467622136729610",
    "1009587287052521573",
    "1009587328643248148",
    "1070466897478430801"
    ]
  };

  // Map de cargos (por função/role)
  const CARGOS = [
    { key: 'pmerj', name: 'PMERJ', roleIds: ['1075201814770757642'] },
    { key: 'pcerj', name: 'PCERJ', roleIds: ['909536846638379019'] },
    { key: 'pf',    name: 'PF',    roleIds: ['1137579919417811015'] },
    { key: 'prf',   name: 'PRF',   roleIds: ['1075206178394611822'] },
    { key: 'coe',   name: 'COE',   roleIds: ['1001309492580982835'] },
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
