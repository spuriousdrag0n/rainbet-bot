setTimeout(function () {
'use strict';

  // ─────────────────────────────────────────────────────────────
  //  RAINBET MINES BOT v18.0
  //  Changes:
  //   1. Bonus changed to 40/49 mines (was 45) — ~4.9x per gem
  //   2. Claude autonomous $20→$200 play mode (runClaudeMode())
  //   3. Auto-restart watchdog (startWatchdog() / stopWatchdog())
  // ─────────────────────────────────────────────────────────────

  const VERSION     = 'v18.0';
  const STORAGE_KEY = 'rainbet_bot_v16';

  const log   = (msg)  => console.warn(msg);
  const table = (data) => console.table(data);

  const CLAUDE_API_KEY  = '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';
  const TUNE_EVERY_MINS = 5;

  const TIER_NORMAL = 0;
  const TIER_L1A    = 1;
  const TIER_L2A    = 2;
  const TIER_T3A    = 3;
  const TIER_L4     = 4;
  const TIER_L5     = 5;
  const TIER_L6     = 6;
  const TIER_HAIL   = 7;

  const TIERS = [
    { id: TIER_NORMAL, label: 'Normal',    mines: 10, multiplier: 1.21, winProb: 0.796 },
    { id: TIER_L1A,    label: 'Loss 1',    mines: 16, multiplier: 1.43, winProb: 0.673 },
    { id: TIER_L2A,    label: 'Loss 2',    mines: 20, multiplier: 1.62, winProb: 0.592 },
    { id: TIER_T3A,    label: 'T3a',       mines: 16, multiplier: 1.43, winProb: 0.673 },
    { id: TIER_L4,     label: 'Loss 4',    mines: 30, multiplier: 2.48, winProb: 0.388 },
    { id: TIER_L5,     label: 'Loss 5',    mines: 35, multiplier: 3.36, winProb: 0.286 },
    { id: TIER_L6,     label: 'Loss 6',    mines: 40, multiplier: null, winProb: 0.184, flatBet: 5.00 },
    { id: TIER_HAIL,   label: 'Hail Mary', mines: 45, multiplier: null, winProb: 0.082, flatBet: 5.00 },
  ];

  const CONFIG = {
    baseBet:           0.10,
    targetBankroll:    999999,
    tiles:             49,
    revealCount:       1,
    bonusTiles:        49,
    bonusMines:        39,      // 39 mines / 49 tiles = 20.4% win chance
    betTiers: [
      { upTo: 100,  bet: 0.10 },
      { upTo: 150,  bet: 0.20 },
      { upTo: 250,  bet: 0.30 },
      { upTo: 350,  bet: 0.40 },
      { upTo: 450,  bet: 0.50 },
      { upTo: 550,  bet: 0.60 },
      { upTo: 650,  bet: 0.70 },
      { upTo: 750,  bet: 0.80 },
      { upTo: 850,  bet: 0.90 },
      { upTo: 950,  bet: 1.00 },
      { upTo: 1050, bet: 1.10 },
      { upTo: 1150, bet: 1.20 },
      { upTo: 1250, bet: 1.30 },
      { upTo: 1350, bet: 1.40 },
      { upTo: 1450, bet: 1.50 },
      { upTo: 1550, bet: 1.60 },
      { upTo: 1650, bet: 1.70 },
      { upTo: 1750, bet: 1.80 },
      { upTo: 1850, bet: 1.90 },
      { upTo: 1950, bet: 2.00 },
    ],
    bonusPotShare:     0.20,   // 20% of profit -> bonus pot
    lossBufferShare:   0.40,   // 40% of profit -> loss buffer
    bankrollShare:     0.40,   // 40% of profit -> bankroll
    minBet:            0.10,
    delayMs:           3000,
    maxRounds:         999999,
    maxLogSize:        500,
    reportEveryRounds: 50,
    reportEveryMinutes:10,
  };

  let state = {
    running: false, bankroll: 0, currentBet: 0,
    rounds: 0, wins: 0, losses: 0,
    tier: 0, tierLosses: 0, lossStreakAmount: 0,
    t3aStreakSnapshot: 0,
    t3aActualBet: 0,
    streakBaseBet: 0,      // baseBet locked at streak start — prevents mid-chain drift
    peakBankroll: 0, startTime: Date.now(),
    lastReportMinute: -1, lastTuneMinute: -1,
    mineTiles: new Set(),
    bonusPot: 0, lossBuffer: 0,
    bonusRounds: 0, bonusWins: 0, bonusLosses: 0, bonusProfit: 0,
    hailMaryRounds: 0, hailMaryWins: 0, hailMaryLosses: 0,
    resets: 0, recoveries: 0,
    bufferAbsorbs: 0,
    t3aRounds: 0, t3aWins: 0,
    log: [],
    session: {
      startBankroll: 0, biggestWin: 0, biggestLoss: 0,
      lowestBankroll: 999999, totalBetted: 0, totalWon: 0, totalLost: 0, biggestConLoss: 0,
    },
  };

  const tileStats = Array.from({ length: 49 }, (_, i) => ({
    index: i, picks: 0, mines: 0, mineRate: 0,
  }));

  // ── Persistence ──────────────────────────────────────────────
  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        rounds: state.rounds, wins: state.wins, losses: state.losses,
        tier: state.tier, tierLosses: state.tierLosses,
        lossStreakAmount: state.lossStreakAmount,
        t3aStreakSnapshot: state.t3aStreakSnapshot || 0,
        t3aActualBet: state.t3aActualBet || 0,
        streakBaseBet: state.streakBaseBet || 0,
        bonusPot: state.bonusPot, lossBuffer: state.lossBuffer,
        bonusRounds: state.bonusRounds, bonusWins: state.bonusWins,
        bonusLosses: state.bonusLosses, bonusProfit: state.bonusProfit,
        hailMaryRounds: state.hailMaryRounds, hailMaryWins: state.hailMaryWins,
        hailMaryLosses: state.hailMaryLosses,
        resets: state.resets, recoveries: state.recoveries,
        bufferAbsorbs: state.bufferAbsorbs || 0,
        t3aRounds: state.t3aRounds || 0, t3aWins: state.t3aWins || 0,
        peakBankroll: state.peakBankroll, session: state.session,
        tileStats: tileStats.map(t => ({ ...t })),
        savedAt: Date.now(),
      }));
    } catch (e) { log('💾 Save failed: ' + e.message); }
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const mins = ((Date.now() - data.savedAt) / 60000).toFixed(1);
      log('📂 Saved! ' + mins + ' mins ago | R:' + data.rounds +
          ' | Tier: ' + (TIERS[data.tier] ? TIERS[data.tier].label : 'RESET') +
          ' | Pot:$' + data.bonusPot.toFixed(2) +
          ' | Buf:$' + (data.lossBuffer || 0).toFixed(2));
      return data;
    } catch (e) { log('📂 Load failed: ' + e.message); return false; }
  };

  const restoreState = (data) => {
    state.rounds              = data.rounds;
    state.wins                = data.wins;
    state.losses              = data.losses;
    state.tier                = data.tier                || 0;
    state.tierLosses          = data.tierLosses          || 0;
    state.lossStreakAmount    = data.lossStreakAmount     || 0;
    state.t3aStreakSnapshot   = data.t3aStreakSnapshot   || 0;
    state.t3aActualBet        = data.t3aActualBet        || 0;
    state.streakBaseBet        = data.streakBaseBet        || 0;
    state.bonusPot            = data.bonusPot;
    state.lossBuffer          = data.lossBuffer          || 0;
    state.bonusRounds         = data.bonusRounds;
    state.bonusWins           = data.bonusWins;
    state.bonusLosses         = data.bonusLosses         || 0;
    state.bonusProfit         = data.bonusProfit;
    state.hailMaryRounds      = data.hailMaryRounds      || 0;
    state.hailMaryWins        = data.hailMaryWins        || 0;
    state.hailMaryLosses      = data.hailMaryLosses      || 0;
    state.resets              = data.resets              || 0;
    state.recoveries          = data.recoveries          || 0;
    state.bufferAbsorbs       = data.bufferAbsorbs       || 0;
    state.t3aRounds           = data.t3aRounds           || 0;
    state.t3aWins             = data.t3aWins             || 0;
    state.peakBankroll        = data.peakBankroll;
    state.session             = data.session;
    (data.tileStats || []).forEach((t, i) => {
      tileStats[i].picks    = t.picks;
      tileStats[i].mines    = t.mines;
      tileStats[i].mineRate = t.mineRate;
    });
    log('✅ Restored from round ' + state.rounds +
        ' | Tier: ' + (TIERS[state.tier] ? TIERS[state.tier].label : 'RESET') +
        ' | Buffer: $' + state.lossBuffer.toFixed(2));
  };

  const resetState = () => {
    state.rounds = 0; state.wins = 0; state.losses = 0;
    state.tier = 0; state.tierLosses = 0; state.lossStreakAmount = 0;
    state.t3aStreakSnapshot = 0;
    state.t3aActualBet = 0;
    state.bonusPot = 0; state.lossBuffer = 0;
    state.bonusRounds = 0; state.bonusWins = 0; state.bonusLosses = 0; state.bonusProfit = 0;
    state.hailMaryRounds = 0; state.hailMaryWins = 0; state.hailMaryLosses = 0;
    state.resets = 0; state.recoveries = 0; state.bufferAbsorbs = 0;
    state.t3aRounds = 0; state.t3aWins = 0;
    state.streakBaseBet = 0;
    state.session = {
      startBankroll: 0, biggestWin: 0, biggestLoss: 0,
      lowestBankroll: 999999, totalBetted: 0, totalWon: 0, totalLost: 0, biggestConLoss: 0,
    };
    tileStats.forEach(t => { t.picks = 0; t.mines = 0; t.mineRate = 0; });
  };

  // ── Session History ───────────────────────────────────────────
  const SESSION_HISTORY_KEY = 'rainbet_bot_v16_history';
  const MAX_HISTORY         = 3;

  const saveSessionHistory = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]');
      const entry = {
        date:           new Date().toISOString(),
        rounds:         state.rounds,
        wins:           state.wins,
        losses:         state.losses,
        winRate:        state.rounds ? (state.wins / state.rounds * 100).toFixed(1) + '%' : '0%',
        netPL:          (state.bankroll - state.session.startBankroll).toFixed(2),
        startBankroll:  state.session.startBankroll,
        endBankroll:    state.bankroll,
        resets:         state.resets,
        bufferAbsorbs:  state.bufferAbsorbs,
        t3a:            state.t3aWins + '/' + state.t3aRounds,
        bonusRounds:    state.bonusRounds,
        bonusWins:      state.bonusWins,
        hailMaryRounds: state.hailMaryRounds,
        hailMaryWins:   state.hailMaryWins,
        biggestConLoss: state.session.biggestConLoss,
        peakBankroll:   state.peakBankroll,
        lowestBankroll: state.session.lowestBankroll,
        finalConfig: {
          bonusThreshold:  dynBonusThreshold,
          bonusBet:        dynBonusBet,
          bonusMines:      CONFIG.bonusMines,
          bonusPotShare:   CONFIG.bonusPotShare,
          lossBufferShare: CONFIG.lossBufferShare,
          bankrollShare:   CONFIG.bankrollShare,
          delayMs:         CONFIG.delayMs,
        },
        safestTiles: [...tileStats]
          .filter(t => t.picks >= 5)
          .sort((a, b) => a.mineRate - b.mineRate)
          .slice(0, 10)
          .map(t => ({ tile: t.index, picks: t.picks, mineRate: (t.mineRate * 100).toFixed(1) + '%' })),
        dangerousTiles: [...tileStats]
          .filter(t => t.picks >= 5)
          .sort((a, b) => b.mineRate - a.mineRate)
          .slice(0, 10)
          .map(t => ({ tile: t.index, picks: t.picks, mineRate: (t.mineRate * 100).toFixed(1) + '%' })),
      };
      existing.unshift(entry);
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(existing.slice(0, MAX_HISTORY)));
      log('📚 Session saved to history (' + Math.min(existing.length, MAX_HISTORY) + '/' + MAX_HISTORY + ')');
    } catch (e) { log('📚 History save failed: ' + e.message); }
  };

  const loadSessionHistory = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  };

  window.clearHistory = () => { localStorage.removeItem(SESSION_HISTORY_KEY); log('🗑️  History cleared'); };
  window.printHistory = () => {
    const history = loadSessionHistory();
    if (!history.length) { log('📚 No session history yet'); return; }
    log('📚 SESSION HISTORY (' + history.length + ' sessions):');
    history.forEach((s, i) => {
      log('  [' + (i+1) + '] ' + s.date.slice(0,16) + ' | R:' + s.rounds + ' WR:' + s.winRate +
          ' | P/L:$' + s.netPL + ' | Resets:' + s.resets +
          ' | BufAbsorbs:' + (s.bufferAbsorbs||0) +
          ' | T3a:' + (s.t3a||'?') + ' | Bonus:' + s.bonusWins + '/' + s.bonusRounds +
          ' | HailMary:' + s.hailMaryWins + '/' + s.hailMaryRounds);
    });
    table(history);
  };

  // ── Helpers ──────────────────────────────────────────────────
  const delay = ms => new Promise(r => setTimeout(r, ms));

  const pushLog = (entry) => {
    state.log.push(entry);
    if (state.log.length > CONFIG.maxLogSize) state.log.shift();
  };

  const getBaseBet = () => {
    for (const tier of CONFIG.betTiers) {
      if (state.bankroll <= tier.upTo) return tier.bet;
    }
    return Math.round(state.bankroll * 0.0015 * 100) / 100;
  };

  const calculateBet = (tierIndex) => {
    const t = TIERS[tierIndex];
    if (!t) return getBaseBet();
    if (t.flatBet) return t.flatBet;
    if (tierIndex === TIER_NORMAL) return getBaseBet();

    // Use locked streak base bet to prevent mid-chain drift
    const base   = state.streakBaseBet || getBaseBet();
    const maxBet = Math.max(state.bankroll * 0.20, base);

    if (tierIndex === TIER_L1A) {
      const recoveryBet = (state.lossStreakAmount + base) / (1.43 - 1);
      return Math.round(Math.min(Math.max(recoveryBet, base), maxBet) * 100) / 100;
    }
    if (tierIndex === TIER_L2A) {
      const recoveryBet = (state.lossStreakAmount + base) / (1.62 - 1);
      return Math.round(Math.min(Math.max(recoveryBet, base), maxBet) * 100) / 100;
    }
    if (tierIndex === TIER_T3A) {
      const recoveryBet = (state.lossStreakAmount + base) / (1.43 - 1);
      return Math.round(Math.min(Math.max(recoveryBet, base), maxBet) * 100) / 100;
    }
    const recoveryBet = (state.lossStreakAmount + base) / (t.multiplier - 1);
    return Math.round(Math.min(Math.max(recoveryBet, base), maxBet) * 100) / 100;
  };

  const pickTile = (maxTile) => {
    const available = tileStats.filter(t => t.index < maxTile && !state.mineTiles.has(t.index));
    if (available.length === 0) { state.mineTiles.clear(); return Math.floor(Math.random() * maxTile); }
    const sorted = available.sort((a, b) =>
      (a.mineRate * 0.7 + Math.random() * 0.3) - (b.mineRate * 0.7 + Math.random() * 0.3));
    sorted[0].picks++;
    return sorted[0].index;
  };

  const updateTileStats = (i, isMine) => {
    if (isMine) tileStats[i].mines++;
    tileStats[i].mineRate = tileStats[i].picks > 0 ? tileStats[i].mines / tileStats[i].picks : 0;
  };

  const applyLoss = (amount) => {
    if (state.lossBuffer >= amount) {
      state.lossBuffer = Math.max(0, state.lossBuffer - amount);
      state.bufferAbsorbs++;
      log('🛡️ Buffer absorbed $' + amount.toFixed(2) + ' | Buffer:$' + state.lossBuffer.toFixed(2) + ' | Bank SAFE');
      return { bankrollLoss: 0, bufferCovered: amount, bufferEmpty: state.lossBuffer === 0 };
    } else if (state.lossBuffer > 0) {
      const covered   = state.lossBuffer;
      const remainder = amount - state.lossBuffer;
      state.lossBuffer = 0;
      state.bankroll  -= remainder;
      state.bufferAbsorbs++;
      log('🛡️ Buffer covered $' + covered.toFixed(2) + ' | Bank:-$' + remainder.toFixed(2) + ' | Buffer EMPTY');
      return { bankrollLoss: remainder, bufferCovered: covered, bufferEmpty: true };
    } else {
      state.bankroll -= amount;
      return { bankrollLoss: amount, bufferCovered: 0, bufferEmpty: true };
    }
  };

  const tierLabel = () => TIERS[state.tier] ? TIERS[state.tier].label : 'RESET';

  // ── API ──────────────────────────────────────────────────────
  const api = (path, method = 'GET', body = null) =>
    fetch('https://originals.rainbet.com' + path, {
      credentials: 'include', method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null,
    }).then(r => r.json());

  const getRealBankroll = async () => {
    const res = await fetch('https://services.rainbet.com/v1/user/wallet', {
      credentials: 'include', headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());
    return parseFloat(res?.active?.primary || 0);
  };

  const callBackground = (payload) => new Promise((resolve, reject) => {
    if (typeof window.__claudeCall !== 'function') {
      return reject(new Error('window.__claudeCall not found'));
    }
    window.__claudeCall(payload.apiKey, payload.prompt).then(resolve).catch(reject);
  });

  // ── Dynamic Grid Recovery ─────────────────────────────────────
  const dynamicGridRecovery = async () => {
    log('🔍 [Recovery] Checking for orphaned games...');
    try {
      const game = await api('/v1/games/mines/check-game');
      if (!game || !game.game_id) { log('✅ [Recovery] Grid clean.'); return { recovered: false, action: 'none' }; }
      const gid    = game.game_id;
      const status = (game.status || game.state || '').toLowerCase();
      log('⚠️  [Recovery] Found game ' + gid + ' | status: "' + status + '"');
      if (['ended', 'lost', 'bust', 'finished'].includes(status)) {
        log('🗑️  [Recovery] Already ended — clearing.');
        state.recoveries++; saveState();
        return { recovered: true, action: 'cleared_ended' };
      }
      try {
        const co     = await api('/v1/games/mines/cashout');
        const payout = parseFloat(co?.amount || co?.payout || 0);
        log('✅ [Recovery] Cashed out $' + payout.toFixed(2));
        state.recoveries++; saveState();
        return { recovered: true, action: 'cashed_out', payout };
      } catch (e) {
        log('❌ [Recovery] Cashout failed: ' + e.message);
        state.recoveries++; saveState();
        return { recovered: true, action: 'force_cleared' };
      }
    } catch (e) {
      log('ℹ️  [Recovery] No active game: ' + e.message);
      return { recovered: false, action: 'api_error' };
    }
  };

  // ── Claude AI Auto-Tuner ──────────────────────────────────────
  const claudeTune = async () => {
    log('🤖 [AI Tuner] Sending snapshot to Claude...');
    try {
      const liveTileData = {
        safest: [...tileStats].filter(t => t.picks >= 5).sort((a, b) => a.mineRate - b.mineRate).slice(0, 10)
          .map(t => ({ tile: t.index, picks: t.picks, mineRate: (t.mineRate * 100).toFixed(1) + '%' })),
        mostDangerous: [...tileStats].filter(t => t.picks >= 5).sort((a, b) => b.mineRate - a.mineRate).slice(0, 10)
          .map(t => ({ tile: t.index, picks: t.picks, mineRate: (t.mineRate * 100).toFixed(1) + '%' })),
        totalTracked: tileStats.filter(t => t.picks > 0).length,
      };

      const snapshot = {
        rounds: state.rounds, wins: state.wins, losses: state.losses,
        winRate: state.rounds ? (state.wins / state.rounds * 100).toFixed(1) + '%' : '0%',
        bankroll: state.bankroll, startBankroll: state.session.startBankroll,
        netPL: (state.bankroll - state.session.startBankroll).toFixed(2),
        tier: state.tier, tierLabel: tierLabel(), tierLosses: state.tierLosses,
        lossStreakAmount: state.lossStreakAmount, resets: state.resets,
        bufferAbsorbs: state.bufferAbsorbs,
        t3a: state.t3aWins + '/' + state.t3aRounds,
        bonusPot: state.bonusPot, lossBuffer: state.lossBuffer,
        bonusRounds: state.bonusRounds, bonusWins: state.bonusWins, bonusLosses: state.bonusLosses,
        hailMaryRounds: state.hailMaryRounds, hailMaryWins: state.hailMaryWins, hailMaryLosses: state.hailMaryLosses,
        biggestConLoss: state.session.biggestConLoss, totalBetted: state.session.totalBetted,
        currentConfig: {
          bonusThreshold: dynBonusThreshold, bonusBet: dynBonusBet,
          bonusMines: CONFIG.bonusMines,
          bonusPotShare: CONFIG.bonusPotShare, lossBufferShare: CONFIG.lossBufferShare,
          bankrollShare: CONFIG.bankrollShare, delayMs: CONFIG.delayMs,
        },
        tileIntelligence: liveTileData,
        sessionHistory: loadSessionHistory(),
      };

      const prompt = `You are a live optimizer for a Rainbet Mines bot. Return ONLY a raw JSON object, no markdown, no explanation.

GAME MECHANICS: 49-tile board, reveal exactly 1 tile per round then cashout immediately.
WIN SPLIT: 40% bankroll / 20% bonus pot / 40% loss buffer.
BUFFER LOGIC: losses absorbed by buffer first. Only escalate recovery tiers when buffer=0.
BONUS: now uses 40/49 mines (9 safe tiles, ~4.9x per gem pick). Triggers when pot >= bonusThreshold.

SNAPSHOT: ${JSON.stringify(snapshot, null, 2)}

TUNABLE (only include keys to change):
bonusPotShare: ${CONFIG.bonusPotShare} (min 0.10, max 0.40)
lossBufferShare: ${CONFIG.lossBufferShare} (min 0.30, max 0.50)
delayMs: ${CONFIG.delayMs} (min 2000, max 5000)

RULES: winRate<70% -> lossBufferShare=0.50 | resets>2per100 -> lossBufferShare=0.50 | bankroll dropping -> lossBufferShare=0.50 | winRate>80%+noResets+rounds>100 -> bonusPotShare=0.45 | healthy -> return {}

Return ONLY JSON. Return {} if no changes needed.`;

      const data = await callBackground({ type: 'CLAUDE_TUNE', apiKey: CLAUDE_API_KEY, prompt });
      if (data?.usage) log('🤖 [AI Tuner] tokens in:' + data.usage.input_tokens + ' out:' + data.usage.output_tokens);
      const raw     = data?.content?.[0]?.text?.trim() || '{}';
      const changes = JSON.parse(raw.replace(/```json|```/g, '').trim());

      if (Object.keys(changes).length === 0) { log('🤖 [AI Tuner] No changes needed.'); return; }

      const allowed = {
        bonusThreshold:  { min: 3,    max: 15   },
        bonusBet:        { min: 3,    max: 15   },
        bonusPotShare:        { min: 0.10, max: 0.40 },
        lossBufferShare: { min: 0.20, max: 0.50 },
        delayMs:         { min: 2000, max: 5000 },
      };
      const applied = [];
      for (const [key, val] of Object.entries(changes)) {
        if (!allowed[key]) continue;
        const clamped = Math.min(Math.max(parseFloat(val), allowed[key].min), allowed[key].max);
        applied.push(key + ': ' + CONFIG[key] + ' → ' + clamped);
        CONFIG[key] = clamped;
      }
      if (CONFIG.bonusPotShare + CONFIG.lossBufferShare > 0.90) {
        CONFIG.lossBufferShare = 0.90 - CONFIG.bonusPotShare; // keep bankrollShare >= 0.10
        applied.push('lossBufferShare clamped to keep bankrollShare>=0.10');
      }
      CONFIG.bankrollShare = Math.round((1 - CONFIG.bonusPotShare - CONFIG.lossBufferShare) * 100) / 100;
      log('🤖 [AI Tuner] Applied ' + applied.length + ' change(s):');
      applied.forEach(c => log('   ✅ ' + c));
      saveState();
    } catch (e) { log('🤖 [AI Tuner] Error: ' + e.message); }
  };

  window.testClaude = async () => {
    console.warn('🧪 ===== CLAUDE API TEST =====');
    console.warn('Step 1 — __claudeCall: ' + typeof window.__claudeCall);
    if (typeof window.__claudeCall !== 'function') {
      console.warn('❌ __claudeCall not injected — reload extension then refresh page');
      return;
    }
    console.warn('Step 2 — API key: ' + CLAUDE_API_KEY.slice(0, 20) + '...');
    console.warn('Step 3 — Sending via background bridge...');
    try {
      const data = await callBackground({
        type: 'CLAUDE_TUNE',
        apiKey: CLAUDE_API_KEY,
        prompt: 'Reply with only this exact JSON: {"status":"ok","msg":"AI tuner working"}',
      });
      const text = data?.content?.[0]?.text?.trim();
      console.warn('✅ Claude replied: ' + text);
      console.warn('🎉 AI Tuner is working!');
    } catch (e) { console.warn('❌ Failed: ' + e.message); }
  };


  // ── 40/49 Pre-Loss: 3 attempts before recovery ──────────────
  const runPreLoss = async (betAmt) => {
    log('🎯 [PRE-LOSS] 3x $' + betAmt.toFixed(2) + ' on 40/49 before recovery');
    for (let i = 0; i < 3; i++) {
      try {
        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: 49, mines: 39, betAmount: betAmt, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ [PRE-LOSS] ' + bet.error); await delay(CONFIG.delayMs); continue; }
        const tile   = Math.floor(Math.random() * 49);
        const reveal = await api('/v1/games/mines/reveal', 'POST', { index: tile });
        if (reveal.error) { log('❌ [PRE-LOSS] ' + reveal.error); await delay(CONFIG.delayMs); continue; }
        if (reveal.cell === 'M') {
          state.bankroll -= betAmt;
          state.losses++;
          log('💣 [PRE-LOSS] ' + (i+1) + '/3 LOSS | bank:$' + state.bankroll.toFixed(2));
        } else {
          await api('/v1/games/mines/cashout');
          const profit      = (betAmt * reveal.multiplier) - betAmt;
          const bonusShare  = Math.round(profit * CONFIG.bonusPotShare  * 10000) / 10000;
          const bufferShare = Math.round(profit * CONFIG.lossBufferShare * 10000) / 10000;
          const keepShare   = Math.round(profit * CONFIG.bankrollShare   * 10000) / 10000;
          state.bankroll   += keepShare;
          state.bonusPot   += bonusShare;
          state.lossBuffer += bufferShare;
          state.wins++;
          log('💎 [PRE-LOSS] ' + (i+1) + '/3 WIN x' + reveal.multiplier + ' +$' + profit.toFixed(4) + ' | bank:$' + state.bankroll.toFixed(2));
          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.streakBaseBet = 0;
          state.mineTiles.clear();
          await delay(CONFIG.delayMs);
          return true;
        }
      } catch(e) { log('❌ [PRE-LOSS] ' + e.message); }
      await delay(CONFIG.delayMs);
    }
    log('🔄 [PRE-LOSS] All 3 failed → recovery chain');
    return false;
  };

  // ── Bonus Round (40/49 mines) ─────────────────────────────────
  // 40 mines, 9 safe tiles, ~4.9x multiplier on 1 pick
  const placeBonusBet = async () => {
    // Bonus bet scales with balance
    const dynBonusBet = state.bankroll < 100 ? 10 :
                        state.bankroll < 300 ? 20 :
                        state.bankroll < 400 ? 30 :
                        state.bankroll < 500 ? 40 : 50;
    const BONUS_BET = Math.min(dynBonusBet, state.bonusPot);
    log(['🎰 ====== BONUS TRIGGERED ======',
      'Pot: $' + state.bonusPot.toFixed(2) + ' | Bet: $' + BONUS_BET.toFixed(2),
      'Board: ' + CONFIG.bonusTiles + ' tiles / ' + CONFIG.bonusMines + ' mines (39/49)',
      'Buffer: $' + state.lossBuffer.toFixed(2),
      'Win: ~20.4% | Prize: ~$' + (BONUS_BET * 4.6).toFixed(2),
      '================================'].join('\n'));
    try {
      const bet = await api('/v1/games/mines/new-game', 'POST', {
        tiles: CONFIG.bonusTiles, mines: CONFIG.bonusMines,
        betAmount: BONUS_BET, balanceType: false, currency: 'USD',
      });
      if (bet.error) { log('❌ Bonus bet error: ' + bet.error); state.bonusPot = 0; return; }

      const tileIndex = Math.floor(Math.random() * CONFIG.bonusTiles);
      const reveal    = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
      if (reveal.error) { log('❌ Bonus reveal error: ' + reveal.error); return; }

      state.bonusRounds++;
      if (reveal.cell === 'M') {
        state.bankroll -= BONUS_BET;
        state.bonusPot  = 0;
        state.bonusLosses++;
        log('💣 BONUS LOST | -$' + BONUS_BET.toFixed(2) + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds, result: '🎰💣', baseBet: '-', bet: BONUS_BET.toFixed(2), tile: tileIndex, multiplier: '-', profit: (-BONUS_BET).toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: state.tierLosses, streakLoss: state.lossStreakAmount.toFixed(2), bonusPot: '0.00', lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'BONUS', type: 'BONUS LOSS' });
      } else {
        await api('/v1/games/mines/cashout');
        const profit    = (BONUS_BET * reveal.multiplier) - BONUS_BET;
        state.bankroll += profit;
        state.bonusPot  = 0;
        state.bonusWins++;
        state.bonusProfit += profit;
        if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;
        log('🎉 BONUS WON! +$' + profit.toFixed(2) + ' x' + reveal.multiplier + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds, result: '🎰🎉', baseBet: '-', bet: BONUS_BET.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: profit.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: '0.00', lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'BONUS', type: 'BONUS WIN' });
      }
      saveState();
    } catch (e) { log('❌ Bonus error: ' + e.message); }
  };

  // ── Hail Mary (T7 — still 45 mines, tier system unchanged) ────
  const placeHailMaryBet = async () => {
    const tier = TIERS[TIER_HAIL];
    log(['💀 ====== HAIL MARY T7 ======',
      'After 6 losses (buffer=0) | Streak: $' + state.lossStreakAmount.toFixed(2),
      'Board: 49 tiles / 45 mines (1 reveal) | Bet: $' + tier.flatBet.toFixed(2) + ' | Win: ~8.16%',
      'Buffer: $' + state.lossBuffer.toFixed(2) + ' | Bank: $' + state.bankroll.toFixed(2),
      '============================'].join('\n'));
    try {
      const bet = await api('/v1/games/mines/new-game', 'POST', {
        tiles: CONFIG.tiles, mines: tier.mines,
        betAmount: tier.flatBet, balanceType: false, currency: 'USD',
      });
      if (bet.error) { log('❌ Hail Mary bet error: ' + bet.error); return false; }

      const tileIndex = pickTile(CONFIG.tiles);
      const reveal    = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
      if (reveal.error) { log('❌ Hail Mary reveal error: ' + reveal.error); return false; }

      state.hailMaryRounds++;
      if (reveal.cell === 'M') {
        const { bankrollLoss } = applyLoss(tier.flatBet);
        state.hailMaryLosses++;
        state.session.totalBetted += tier.flatBet;
        state.session.totalLost   += tier.flatBet;
        updateTileStats(tileIndex, true);
        if (bankrollLoss > state.session.biggestLoss) state.session.biggestLoss = bankrollLoss;
        if (state.bankroll < state.session.lowestBankroll) state.session.lowestBankroll = state.bankroll;
        log('💀 HAIL MARY LOST | Bank: $' + state.bankroll.toFixed(2) + ' | RESET -> T0');
        pushLog({ round: state.rounds+1, result: '💀💣', baseBet: getBaseBet().toFixed(2), bet: tier.flatBet.toFixed(2), tile: tileIndex, multiplier: '-', profit: (-bankrollLoss).toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: state.tierLosses, streakLoss: state.lossStreakAmount.toFixed(2), bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'HAIL MARY T7', type: 'HAIL MARY LOSS' });
        return false;
      } else {
        const cashout = await api('/v1/games/mines/cashout');
        if (cashout.error) { log('❌ Hail Mary cashout: ' + cashout.error); return false; }
        const profit    = (tier.flatBet * reveal.multiplier) - tier.flatBet;
        state.bankroll += profit;
        state.hailMaryWins++;
        state.session.totalBetted += tier.flatBet;
        state.session.totalWon    += profit;
        updateTileStats(tileIndex, false);
        if (profit > state.session.biggestWin) state.session.biggestWin = profit;
        if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;
        log('🔥 HAIL MARY WON! +$' + profit.toFixed(2) + ' x' + reveal.multiplier + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds+1, result: '🔥💎', baseBet: getBaseBet().toFixed(2), bet: tier.flatBet.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: profit.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'HAIL MARY T7', type: 'HAIL MARY WIN' });
        return true;
      }
    } catch (e) { log('❌ Hail Mary error: ' + e.message); return false; }
  };

  // ════════════════════════════════════════════════════════════
  //  NEW: CLAUDE AUTONOMOUS MODE — $20 → $200
  // ════════════════════════════════════════════════════════════
  const CLAUDE_MODE_CONFIG = {
    startingBankroll: 20.00,
    targetBankroll:   200.00,
    stopLoss:         10.00,    // hard stop below this
    tuneEveryN:       10,       // consult Claude every N bets
  };

  // All Claude calls go through background bridge
  const askClaudeDirect = async (prompt) => {
    const data  = await callBackground({ type: 'CLAUDE_TUNE', apiKey: CLAUDE_API_KEY, prompt });
    if (data?.usage) log('[CLAUDE API] tokens in:' + data.usage.input_tokens + ' out:' + data.usage.output_tokens);
    const text  = data?.content?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  };

  const buildClaudeAutoPrompt = (cmState, sessionHistory) => {
    const winRate = cmState.bets > 0
      ? ((cmState.wins / cmState.bets) * 100).toFixed(1) : '0.0';
    const progress = ((cmState.balance / CLAUDE_MODE_CONFIG.targetBankroll) * 100).toFixed(1);
    const recent   = cmState.history.slice(-15).map(b =>
      b.win ? ('WIN  mines:' + b.mines + ' bet:' + b.bet.toFixed(3) + ' profit:+' + b.profit.toFixed(4))
            : ('LOSS mines:' + b.mines + ' bet:' + b.bet.toFixed(3))
    ).join('\n');

    return `You are an expert Rainbet Mines strategy AI managing a live bankroll.

GAME FACTS (provably fair — outcomes are random, house edge ~1%):
- 49-tile grid, choose mines count (1–24) + how many gems to reveal before cashout
- More mines = higher multiplier per gem, higher bust risk
- 3 mines/1 gem = 1.21x (79.6% win) — safest, slowest growth
- 10 mines/1 gem = 1.28x (79.6% win) — same win%, tiny better mult
- 5 mines/1 gem = 1.26x (89.8% win) — very safe
- 24 mines/1 gem = 4.9x (51.0% win) — aggressive
- Strategy: on a winning streak scale up mines for higher mult; on losing streak go conservative

MISSION: Grow $${CLAUDE_MODE_CONFIG.startingBankroll} → $${CLAUDE_MODE_CONFIG.targetBankroll}
HARD STOP LOSS: $${CLAUDE_MODE_CONFIG.stopLoss}

SESSION STATE:
- Balance:   $${cmState.balance.toFixed(2)}  (started: $${CLAUDE_MODE_CONFIG.startingBankroll})
- Progress:  ${progress}% of target
- Bets:      ${cmState.bets}  Wins: ${cmState.wins}  Losses: ${cmState.losses}
- Win rate:  ${winRate}%
- Streak:    ${cmState.streak > 0 ? '+' + cmState.streak + ' wins' : cmState.streak + ' losses'}
- Net P/L:   $${(cmState.balance - CLAUDE_MODE_CONFIG.startingBankroll).toFixed(2)}

PAST SESSION HISTORY:
${JSON.stringify(sessionHistory.slice(0, 2), null, 2)}

RECENT BETS:
${recent || 'none yet'}

DECISION RULES:
- If balance <= stopLoss: action=stop
- If balance >= target: action=stop  
- Winning streak >= 5: increase mines by 2-3, increase bet up to 8% of balance
- Losing streak >= 3: reduce mines to 3-5, reduce bet to 2-3% of balance
- Normal: bet 3-5% of balance, mines 3-7
- Max single bet: 10% of balance ($${(cmState.balance * 0.10).toFixed(2)})
- Min bet: $0.10

Respond ONLY with valid JSON, no markdown:
{
  "betAmount": <number>,
  "mines": <number 3-24>,
  "gemsTarget": 1,
  "action": "bet" | "stop",
  "reason": "<one sentence>"
}`;
  };

  window.runClaudeMode = async () => {
    log('═══════════════════════════════════════════');
    log('🤖 CLAUDE AUTONOMOUS MODE — $' + CLAUDE_MODE_CONFIG.startingBankroll + ' → $' + CLAUDE_MODE_CONFIG.targetBankroll);
    log('═══════════════════════════════════════════');

    const cmState = {
      balance: await getRealBankroll(),
      bets: 0, wins: 0, losses: 0, streak: 0,
      history:  [],
      decisions: [],
    };

    // If real bankroll > starting, cap context to starting amount
    log('💰 Real balance: $' + cmState.balance.toFixed(2));
    if (cmState.balance < CLAUDE_MODE_CONFIG.stopLoss) {
      log('🛑 Balance $' + cmState.balance.toFixed(2) + ' already below stop loss $' + CLAUDE_MODE_CONFIG.stopLoss);
      return;
    }

    let currentPlay = { betAmount: 0.10, mines: 3, gemsTarget: 1 };
    const sessionHistory = loadSessionHistory();

    while (true) {
      // Stop conditions
      if (cmState.balance >= CLAUDE_MODE_CONFIG.targetBankroll) {
        log('🎯 TARGET REACHED! Balance: $' + cmState.balance.toFixed(2)); break;
      }
      if (cmState.balance <= CLAUDE_MODE_CONFIG.stopLoss) {
        log('🛑 STOP LOSS. Balance: $' + cmState.balance.toFixed(2)); break;
      }

      // Consult Claude every N bets or on first bet
      if (cmState.bets === 0 || cmState.bets % CLAUDE_MODE_CONFIG.tuneEveryN === 0) {
        log('🤖 [Claude Mode] Consulting Claude (bet #' + cmState.bets + ')...');
        try {
          const decision = await askClaudeDirect(buildClaudeAutoPrompt(cmState, sessionHistory));

          if (decision.action === 'stop') {
            log('🤖 Claude says STOP — ' + decision.reason); break;
          }

          const prevBet   = currentPlay.betAmount;
          const prevMines = currentPlay.mines;

          currentPlay.betAmount = Math.max(0.10,
            Math.min(parseFloat(decision.betAmount) || 0.10, cmState.balance * 0.10));
          currentPlay.mines = Math.max(3, Math.min(24, parseInt(decision.mines) || 3));

          const changes = [];
          if (Math.abs(prevBet - currentPlay.betAmount) > 0.001)
            changes.push('bet: $' + prevBet.toFixed(2) + ' → $' + currentPlay.betAmount.toFixed(2));
          if (prevMines !== currentPlay.mines)
            changes.push('mines: ' + prevMines + ' → ' + currentPlay.mines);

          cmState.decisions.push({
            bet:     cmState.bets,
            changes: changes.join(', ') || 'no change',
            reason:  decision.reason,
            balance: cmState.balance.toFixed(2),
          });

          log('🤖 ' + (changes.length ? changes.join(' | ') : 'no change'));
          log('💭 ' + decision.reason);
          if (cmState.decisions.length > 1) table(cmState.decisions.slice(-3));

        } catch (e) {
          log('🤖 [Claude Mode] API error: ' + e.message + ' — using last params');
        }
      }

      // Place the bet
      try {
        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: 49, mines: currentPlay.mines,
          betAmount: currentPlay.betAmount, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ Bet error: ' + bet.error); await delay(3000); continue; }

        const tileIndex = Math.floor(Math.random() * 49);
        const reveal    = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
        if (reveal.error) { log('❌ Reveal error: ' + reveal.error); await delay(3000); continue; }

        cmState.bets++;

        if (reveal.cell === 'M') {
          // Loss
          cmState.balance -= currentPlay.betAmount;
          cmState.losses++;
          cmState.streak  = cmState.streak > 0 ? -1 : cmState.streak - 1;
          cmState.history.push({ win: false, mines: currentPlay.mines, bet: currentPlay.betAmount, profit: -currentPlay.betAmount });
          log('💣 [CM #' + cmState.bets + '] LOSS | bet:$' + currentPlay.betAmount.toFixed(2) +
              ' mines:' + currentPlay.mines + ' | balance:$' + cmState.balance.toFixed(2) +
              ' streak:' + cmState.streak);
        } else {
          // Win — cashout
          const cashout = await api('/v1/games/mines/cashout');
          const profit  = (currentPlay.betAmount * reveal.multiplier) - currentPlay.betAmount;
          cmState.balance += profit;
          cmState.wins++;
          cmState.streak  = cmState.streak < 0 ? 1 : cmState.streak + 1;
          cmState.history.push({ win: true, mines: currentPlay.mines, bet: currentPlay.betAmount, profit });
          log('💎 [CM #' + cmState.bets + '] WIN x' + reveal.multiplier +
              ' +$' + profit.toFixed(4) + ' | balance:$' + cmState.balance.toFixed(2) +
              ' streak:+' + cmState.streak +
              ' progress:' + ((cmState.balance / CLAUDE_MODE_CONFIG.targetBankroll) * 100).toFixed(1) + '%');
        }

        if (cmState.history.length > 50) cmState.history.shift();

      } catch (e) {
        log('❌ [Claude Mode] Round error: ' + e.message);
        await dynamicGridRecovery();
      }

      await delay(CONFIG.delayMs);
    }

    // Final summary
    log('═══════════════════════════════════════════');
    log('🏁 CLAUDE MODE COMPLETE');
    table({
      start:    '$' + CLAUDE_MODE_CONFIG.startingBankroll,
      end:      '$' + cmState.balance.toFixed(2),
      profit:   '$' + (cmState.balance - CLAUDE_MODE_CONFIG.startingBankroll).toFixed(2),
      bets:     cmState.bets,
      wins:     cmState.wins,
      losses:   cmState.losses,
      winRate:  cmState.bets ? (cmState.wins / cmState.bets * 100).toFixed(1) + '%' : '0%',
      decisions: cmState.decisions.length,
    });
    log('═══════════════════════════════════════════');
  };

  // ════════════════════════════════════════════════════════════
  //  NEW: WATCHDOG — auto restart on death
  // ════════════════════════════════════════════════════════════
  let _watchdogTimer = null;

  window.startWatchdog = () => {
    if (_watchdogTimer) { log('👁️ Watchdog already running'); return; }
    log('👁️ Watchdog started — checks every 10s');
    _watchdogTimer = setInterval(async () => {
      if (!state.running) return;
      const bal = await getRealBankroll().catch(() => null);
      if (bal === null) return;
      if (bal <= CONFIG.minBet) {
        log('👁️ [Watchdog] Balance $' + bal.toFixed(2) + ' ≤ min — bot died. Restarting in 5s...');
        clearInterval(_watchdogTimer);
        _watchdogTimer = null;
        state.running  = false;
        await delay(5000);
        // Reset critical state, keep history
        state.tier = 0; state.tierLosses = 0;
        state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0;
        state.lossBuffer = 0; state.mineTiles.clear();
        log('👁️ [Watchdog] Restarting runBot(autoResume=true)...');
        window.runBot(true);
      }
    }, 10000);
  };

  window.stopWatchdog = () => {
    if (_watchdogTimer) { clearInterval(_watchdogTimer); _watchdogTimer = null; }
    log('👁️ Watchdog stopped');
  };

  // ── setBet — live bet size control ──────────────────────────
  // Changes base bet AND rebuilds the betTiers ladder proportionally
  window.setBet = (newBaseBet) => {
    if (typeof newBaseBet !== 'number' || newBaseBet < 0.10 || newBaseBet > 10) {
      log('❌ [setBet] Invalid — must be a number between 0.10 and 10');
      log('   Usage: setBet(0.20)  or  setBet(0.50)');
      return;
    }
    const old = CONFIG.baseBet;
    const ratio = newBaseBet / 0.10; // scale ratio vs default 0.10 base
    CONFIG.baseBet = newBaseBet;
    CONFIG.minBet  = newBaseBet;

    // Rebuild betTiers proportionally
    // Rebuild proportionally from new base
    const defaultTiers = [
      { upTo: 100,  bet: 0.10 },
      { upTo: 150,  bet: 0.20 },
      { upTo: 250,  bet: 0.30 },
      { upTo: 350,  bet: 0.40 },
      { upTo: 450,  bet: 0.50 },
      { upTo: 550,  bet: 0.60 },
      { upTo: 650,  bet: 0.70 },
      { upTo: 750,  bet: 0.80 },
      { upTo: 850,  bet: 0.90 },
      { upTo: 950,  bet: 1.00 },
      { upTo: 1050, bet: 1.10 },
      { upTo: 1150, bet: 1.20 },
      { upTo: 1250, bet: 1.30 },
      { upTo: 1350, bet: 1.40 },
      { upTo: 1450, bet: 1.50 },
      { upTo: 1550, bet: 1.60 },
      { upTo: 1650, bet: 1.70 },
      { upTo: 1750, bet: 1.80 },
      { upTo: 1850, bet: 1.90 },
      { upTo: 1950, bet: 2.00 },
    ];
    CONFIG.betTiers = defaultTiers.map(t => ({
      upTo: Math.round(t.upTo * ratio),
      bet:  Math.round(t.bet  * ratio * 100) / 100,
    }));
    CONFIG.minBet = newBaseBet;

    log('✅ [setBet] Base bet changed: $' + old.toFixed(2) + ' → $' + newBaseBet.toFixed(2));
    log('   New bet ladder:');
    CONFIG.betTiers.forEach(t => log('     balance ≤ $' + t.upTo + '  →  bet $' + t.bet.toFixed(2)));
    log('   Current base bet now: $' + getBaseBet().toFixed(2));
  };

  // ── setTarget — change target bankroll live ───────────────────
  window.setTarget = (amount) => {
    if (typeof amount !== 'number' || amount < 1) {
      log('❌ [setTarget] Must be a number > 1. Usage: setTarget(500)');
      return;
    }
    const old = CONFIG.targetBankroll;
    CONFIG.targetBankroll = amount;
    log('✅ [setTarget] Target: $' + old + ' → $' + amount);
  };

  // ── Stats / Print ─────────────────────────────────────────────
  window.printStats = () => {
    const mins    = ((Date.now() - state.startTime) / 60000).toFixed(1);
    const winRate = state.rounds ? (state.wins / state.rounds * 100).toFixed(1) : '0.0';
    const net     = (state.bankroll - state.session.startBankroll).toFixed(2);
    const progress= ((state.bankroll / CONFIG.targetBankroll) * 100).toFixed(1);
    const avgBet  = state.rounds ? (state.session.totalBetted / state.rounds).toFixed(2) : '0.00';
    const safest  = [...tileStats].filter(t => t.picks > 0).sort((a, b) => a.mineRate - b.mineRate).slice(0, 5)
      .map(t => 'tile' + t.index + '(' + (t.mineRate*100).toFixed(0) + '%)').join(', ');
    const curTier = TIERS[state.tier];
    log([
      '📊 =========== STATS ' + VERSION + ' ===========',
      '⏱️  Time:            ' + mins + 'm',
      '💰 Bankroll:        $' + state.bankroll.toFixed(2) + ' (' + progress + '% of $' + CONFIG.targetBankroll + ')',
      '📈 Peak:            $' + state.peakBankroll.toFixed(2),
      '💹 Net P/L:         ' + (net >= 0 ? '+' : '') + '$' + net,
      '💵 Base Bet:        $' + getBaseBet().toFixed(2),
      '🎰 Bonus Pot:       $' + state.bonusPot.toFixed(2) + ' / $' + dynBonusThreshold + ' | bet: $' + dynBonusBet + ' (40/49 mines)',
      '🛡️  Loss Buffer:     $' + state.lossBuffer.toFixed(2),
      '🔢 Buffer Absorbs:  ' + state.bufferAbsorbs,
      '📍 Current Tier:    ' + (curTier ? curTier.label : 'RESET'),
      '💸 Streak Loss:     $' + state.lossStreakAmount.toFixed(2),
      '🔄 Resets:          ' + state.resets,
      '─────────────── BONUS (40/49 mines) ────────',
      '🎰 Rounds:  ' + state.bonusRounds + '  Wins: ' + state.bonusWins + '  Losses: ' + state.bonusLosses,
      '💰 Profit:  $' + state.bonusProfit.toFixed(2),
      '─────────────── HAIL MARY T7 ─────────────',
      '💀 Rounds:  ' + state.hailMaryRounds + '  Wins: ' + state.hailMaryWins,
      '─────────────── ROUNDS ───────────────────',
      '🎮 Rounds:  ' + state.rounds + '  Wins: ' + state.wins + ' (' + winRate + '%)  Losses: ' + state.losses,
      '📊 Avg Bet: $' + avgBet + '  Total Betted: $' + state.session.totalBetted.toFixed(2),
      '🟢 Safest:  ' + (safest || 'collecting...'),
      '==============================================',
    ].join('\n'));
  };

  window.printSnapshot = () => {
    const net = (state.bankroll - state.session.startBankroll).toFixed(2);
    log('📤 ====== SNAPSHOT ======');
    log(JSON.stringify({
      version: VERSION,
      session: {
        startBankroll: state.session.startBankroll, currentBankroll: state.bankroll,
        net, rounds: state.rounds, wins: state.wins, losses: state.losses,
        winRate: state.rounds ? (state.wins / state.rounds * 100).toFixed(1) + '%' : '0%',
        tier: tierLabel(), lossStreakAmount: state.lossStreakAmount,
        resets: state.resets, bufferAbsorbs: state.bufferAbsorbs,
        bonusPot: state.bonusPot, lossBuffer: state.lossBuffer,
        bonusConfig: { mines: CONFIG.bonusMines, threshold: dynBonusThreshold, bet: dynBonusBet },
      },
      last20: state.log.slice(-20),
    }, null, 2));
  };

  window.printFullLog   = () => { window.printStats(); window.printSnapshot(); table(state.log); };
  window.printLog       = () => table(state.log);
  window.printTileStats = () => {
    log('🗺️  TILE STATS:');
    table([...tileStats].filter(t => t.picks > 0).sort((a, b) => a.mineRate - b.mineRate)
      .map(t => ({ tile: t.index, picks: t.picks, mines: t.mines, mineRate: (t.mineRate*100).toFixed(1)+'%' })));
  };

  window.stopBot    = () => { state.running = false; saveState(); saveSessionHistory(); log('🛑 Stopped + saved'); window.printFullLog(); };
  window.clearSaved = () => { localStorage.removeItem(STORAGE_KEY); log('🗑️  Cleared'); };
  window.recoverGrid= async () => { const r = await dynamicGridRecovery(); log('Result: ' + JSON.stringify(r)); return r; };

  window.botHelp = () => log([
    '╔══════════════════════════════════════════════════╗',
    '║         RAINBET MINES BOT v18.0                  ║',
    '║  Bonus: 40/49 mines | scales with bankroll       ║',
    '║  Split: 20% bank / 20% pot / 60% buffer          ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── BOT CONTROL ────────────────────────────     ║',
    '║  runBot()              → start normal bot        ║',
    '║  stopBot()             → stop + save state       ║',
    '║  recoverGrid()         → recover orphaned game   ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── CLAUDE AI ──────────────────────────────     ║',
    '║  runClaudeMode()       → Claude plays $20→$200   ║',
    '║  testClaude()          → test AI tuner bridge    ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── WATCHDOG ───────────────────────────────     ║',
    '║  startWatchdog()       → auto-restart on death   ║',
    '║  stopWatchdog()        → stop watchdog           ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── LIVE CONFIG ────────────────────────────     ║',
    '║  setBet(0.10)          → set base bet size       ║',
    '║  setBet(0.20)          → doubles all bet tiers   ║',
    '║  setTarget(1000)       → change profit target    ║',
    '║  CONFIG.delayMs = 3000           → bet delay ms  ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── STATS & LOGS ───────────────────────────     ║',
    '║  printStats()          → full session stats      ║',
    '║  printLog()            → round-by-round table    ║',
    '║  printFullLog()        → stats + snapshot + log  ║',
    '║  printSnapshot()       → JSON for Claude         ║',
    '║  printTileStats()      → tile mine rate map      ║',
    '║  printHistory()        → last 3 sessions         ║',
    '╠══════════════════════════════════════════════════╣',
    '║  ── RESET ──────────────────────────────────     ║',
    '║  clearSaved()          → wipe localStorage       ║',
    '║  clearHistory()        → wipe session history    ║',
    '║  botHelp()             → this menu               ║',
    '╚══════════════════════════════════════════════════╝',
  ].join('\n'));

  // ── Main Loop (unchanged from v16) ───────────────────────────
  window.runBot = async (autoResume = false) => {
    state.running = true; state.startTime = Date.now();
    state.mineTiles = new Set(); state.lastReportMinute = -1; state.lastTuneMinute = -1; state.log = [];

    await dynamicGridRecovery();

    const saved = loadState();
    if (saved) {
      if (autoResume) {
        // Called from watchdog — auto-resume, no prompt
        restoreState(saved);
        log('👁️ [Watchdog] Auto-resumed from R' + saved.rounds +
            ' | Tier:' + (TIERS[saved.tier||0]?.label||'?') +
            ' | Pot:$' + saved.bonusPot.toFixed(2) +
            ' | Buf:$' + (saved.lossBuffer||0).toFixed(2));
      } else {
        const resume = confirm(
          'Resume R' + saved.rounds +
          ' | Tier:' + (TIERS[saved.tier||0]?.label||'?') +
          ' | Pot:$' + saved.bonusPot.toFixed(2) +
          ' | Buf:$' + (saved.lossBuffer||0).toFixed(2) + '?'
        );
        if (resume) restoreState(saved); else { window.clearSaved(); resetState(); }
      }
    } else { resetState(); }

    state.bankroll = await getRealBankroll();
    if (!state.peakBankroll || state.peakBankroll < state.bankroll) state.peakBankroll = state.bankroll;
    if (!state.session.startBankroll) {
      state.session.startBankroll  = state.bankroll;
      state.session.lowestBankroll = state.bankroll;
    }

    log([
      '🤖 ========= BOT v18.0 =========',
      '💰 Bankroll:  $' + state.bankroll.toFixed(2) + ' | 🎯 Target: $' + CONFIG.targetBankroll,
      '🎰 Bonus:     39/49 mines (~4.6x) | pot >= $' + (state.bankroll < 100 ? 10 : state.bankroll < 300 ? 20 : state.bankroll < 400 ? 30 : state.bankroll < 500 ? 40 : 50) + ' → dynamic bet',
      '🛡️  Buffer:    Losses absorbed first. Recovery only when buffer=0',
      '🤖 AI Tuner: every ' + TUNE_EVERY_MINS + ' min',
      '▶️  botHelp() | runClaudeMode() | startWatchdog()',
    ].join('\n'));

    while (state.running && state.rounds < CONFIG.maxRounds) {
      if (state.bankroll >= CONFIG.targetBankroll) { log('🎉 TARGET! $' + state.bankroll.toFixed(2)); break; }
      if (state.bankroll < CONFIG.minBet)          { log('💀 Broke! $' + state.bankroll.toFixed(2));  break; }

      try {
        if (state.rounds % 10 === 0 && state.rounds > 0 && state.tier === 0) {
          state.bankroll = await getRealBankroll();
          log('🔄 R' + state.rounds + ' [' + tierLabel() + '] Bank:$' + state.bankroll.toFixed(2) +
              ' Pot:$' + state.bonusPot.toFixed(2) + ' Buf:$' + state.lossBuffer.toFixed(2));
        }

        const dynBonusThreshold = state.bankroll < 100 ? 10 :
                                   state.bankroll < 300 ? 20 :
                                   state.bankroll < 400 ? 30 :
                                   state.bankroll < 500 ? 40 : 50;
        if (state.bonusPot >= dynBonusThreshold) {
          await placeBonusBet();
          await delay(CONFIG.delayMs);
          continue;
        }

        if (state.tier === TIER_HAIL) {  // index 9
          const won = await placeHailMaryBet();
          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0; state.t3aActualBet = 0;
          state.streakBaseBet = 0;
          state.mineTiles.clear();
          if (!won) { state.resets++; log('🔄 RESET -> T0 | Total: ' + state.resets); }
          saveState(); await delay(CONFIG.delayMs); continue;
        }

        if (state.tier >= TIERS.length) {
          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0;
          state.mineTiles.clear(); state.resets++;
          saveState(); continue;
        }

        const curTier    = TIERS[state.tier];
        state.currentBet = calculateBet(state.tier);
        const tileIndex  = pickTile(CONFIG.tiles);

        if (state.tier === TIER_T3A && state.t3aStreakSnapshot === 0) {
          state.t3aStreakSnapshot = state.lossStreakAmount;
          state.t3aActualBet = calculateBet(TIER_T3A); // save now before streak grows
        }

        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: CONFIG.tiles, mines: curTier.mines,
          betAmount: state.currentBet, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ Bet error: ' + bet.error); await delay(3000); continue; }

        const reveal = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
        if (reveal.error) {
          log('❌ Reveal error: ' + reveal.error);
          await dynamicGridRecovery(); await delay(3000); continue;
        }

        if (reveal.cell === 'M') {
          const { bankrollLoss, bufferEmpty } = applyLoss(state.currentBet);
          state.losses++;
          state.session.totalBetted += state.currentBet;
          state.session.totalLost   += state.currentBet;
          state.mineTiles.add(tileIndex);
          updateTileStats(tileIndex, true);
          if (bankrollLoss > state.session.biggestLoss) state.session.biggestLoss = bankrollLoss;
          if (state.bankroll < state.session.lowestBankroll) state.session.lowestBankroll = state.bankroll;

          if (state.tier === TIER_T3A) state.t3aRounds++;

          if (!bufferEmpty) {
            state.tier = 0; state.tierLosses = 0;
            state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0; state.t3aActualBet = 0;
            state.streakBaseBet = 0;
            state.mineTiles.clear();
            pushLog({ round: state.rounds+1, result: '🛡️💣', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: '-', profit: '0.0000', bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'T0 (buf)', type: 'LOSS (buf absorbed)' });
          } else {
            state.tierLosses++;
            state.lossStreakAmount += state.currentBet;
            if (state.tierLosses > state.session.biggestConLoss) state.session.biggestConLoss = state.tierLosses;
            const prevLabel = curTier.label;

            if (state.tierLosses === 1) {
              state.streakBaseBet = getBaseBet();
              const recovered = await runPreLoss(state.streakBaseBet);
              if (recovered) { saveState(); await delay(CONFIG.delayMs); continue; }
              // All 3 preloss failed — add their cost to streak so recovery covers all 4 bets
              state.lossStreakAmount += state.streakBaseBet * 3;
              log('🔄 Pre-loss failed — streak adjusted to cover 4 bets: $' + state.lossStreakAmount.toFixed(2));
            }

            // T0 → L1 → L2 → T3a → T4 → T5 → T6 → Hail → RESET
            // Budget caps:
            //   bank < $100  → reset after Loss 2  (max ~$4)
            //   bank < $400  → reset after T3a     (max ~$14-$43)
            //   bank >= $400 → full chain
            if (state.tier === TIER_L1A) {
              state.tier = TIER_L2A;
              log('⚠️  Loss 1 FAILED → Loss 2');
            } else if (state.tier === TIER_L2A) {
              if (state.bankroll < 100) {
                state.tier = 0; state.tierLosses = 0;
                state.lossStreakAmount = 0; state.streakBaseBet = 0;
                state.mineTiles.clear(); state.resets++;
                log('🔄 RESET after Loss 2 (bank<$100) max loss ~$4');
              } else {
                state.tier = TIER_T3A;
                log('⚠️  Loss 2 FAILED → T3a');
              }
            } else if (state.tier === TIER_T3A) {
              state.t3aStreakSnapshot = 0;
              state.t3aActualBet = 0;
              if (state.bankroll < 400) {
                state.tier = 0; state.tierLosses = 0;
                state.lossStreakAmount = 0; state.streakBaseBet = 0;
                state.mineTiles.clear(); state.resets++;
                log('🔄 RESET after T3a (bank<$400) max loss ~$43');
              } else {
                state.tier = TIER_L4;
                log('⚠️  T3a FAILED → T4 (bank>=$400)');
              }
            } else {
              state.tier = Math.min(state.tier + 1, TIER_HAIL);
            }

            pushLog({ round: state.rounds+1, result: '💣', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: '-', profit: (-bankrollLoss).toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: state.tierLosses, streakLoss: state.lossStreakAmount.toFixed(2), bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: prevLabel, type: 'LOSS (buf=0 → ' + tierLabel() + ')' });
            log('💣 R' + (state.rounds+1) + ' [' + prevLabel + '→' + tierLabel() + '] LOSS | Bet:$' +
                state.currentBet.toFixed(2) + ' Streak:$' + state.lossStreakAmount.toFixed(2) + ' Bank:$' + state.bankroll.toFixed(2));
          }

        } else {
          const cashout = await api('/v1/games/mines/cashout');
          if (cashout.error) { log('❌ Cashout error: ' + cashout.error); }

          const profit      = (state.currentBet * reveal.multiplier) - state.currentBet;
          const bonusShare  = Math.round(profit * CONFIG.bonusPotShare    * 10000) / 10000;
          const bufferShare = Math.round(profit * CONFIG.lossBufferShare   * 10000) / 10000;
          const keepShare   = Math.round(profit * CONFIG.bankrollShare     * 10000) / 10000;

          state.bankroll   += keepShare;
          state.bonusPot   += bonusShare;
          state.lossBuffer += bufferShare;

          if (state.tier === TIER_T3A) { state.t3aRounds++; state.t3aWins++; }

          state.wins++;
          const wasRecovery = state.tier > 0;
          const prevLabel   = curTier.label;

          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0; state.t3aActualBet = 0;
          state.streakBaseBet = 0;
          state.mineTiles.clear();

          state.session.totalBetted += state.currentBet;
          state.session.totalWon    += profit;
          updateTileStats(tileIndex, false);
          if (profit > state.session.biggestWin) state.session.biggestWin = profit;
          if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;

          pushLog({ round: state.rounds+1, result: wasRecovery ? '♻️💎' : '💎', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: keepShare.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: prevLabel, type: wasRecovery ? 'RECOVERY WIN' : 'NORMAL' });
          log((wasRecovery ? '♻️ ' : '💎') + ' R' + (state.rounds+1) +
              ' [' + prevLabel + '] WIN x' + reveal.multiplier +
              ' bank:+$' + keepShare.toFixed(4) +
              ' pot:+$' + bonusShare.toFixed(4) +
              ' buf:+$' + bufferShare.toFixed(4) +
              ' | Pot:$' + state.bonusPot.toFixed(2) +
              ' Buf:$' + state.lossBuffer.toFixed(2) +
              ' Bank:$' + state.bankroll.toFixed(2));
        }

        state.rounds++;
        saveState();

        const minutesElapsed = Math.floor((Date.now() - state.startTime) / 60000);
        if (state.rounds % CONFIG.reportEveryRounds === 0) { window.printStats(); window.printSnapshot(); }

        const tuneMinute = Math.floor((Date.now() - state.startTime) / 60000);
        if (tuneMinute > 0 && tuneMinute % TUNE_EVERY_MINS === 0 && tuneMinute !== state.lastTuneMinute) {
          state.lastTuneMinute = tuneMinute;
          await claudeTune();
        }

        await delay(CONFIG.delayMs);

      } catch (e) {
        log('❌ Error: ' + e.message);
        await dynamicGridRecovery();
        await delay(3000);
      }
    }

    state.bankroll = await getRealBankroll();
    saveState(); saveSessionHistory();
    log('🏁 Done | Final: $' + state.bankroll.toFixed(2));
    window.printFullLog();
    state.running = false;
  };

  // ── Background bridge ─────────────────────────────────────────
  setTimeout(() => {
    if (typeof window.__claudeCall === 'function') {
      log('🤖 [AI Tuner] __claudeCall ready ✅');
    } else {
      try {
        chrome.runtime.sendMessage({ type: 'INJECT_HELPER' }, () => {
          setTimeout(() => {
            log(typeof window.__claudeCall === 'function'
              ? '🤖 [AI Tuner] __claudeCall injected ✅'
              : '🤖 [AI Tuner] Injection failed — tuner disabled');
          }, 1000);
        });
      } catch(e) { log('🤖 [AI Tuner] chrome.runtime not available: ' + e.message); }
    }
  }, 1000);

  // ── Boot ──────────────────────────────────────────────────────
  log([
    '✅ BOT v18.0 READY',
    '🎰 Bonus: 40/49 mines (~4.9x) ← NEW',
    '🤖 runClaudeMode()   → Claude plays $20 → $200 ← NEW',
    '👁️  startWatchdog()  → auto-restart on death   ← NEW',
    '▶️  runBot() | ⏹️  stopBot() | ❓ botHelp()',
  ].join('\n'));

}, 3000);
