setTimeout(function () {
'use strict';

  const VERSION     = 'v18.5';
  const STORAGE_KEY = 'rainbet_bot_v16';

  const log   = (msg)  => console.warn(msg);
  const table = (data) => console.table(data);

  const CLAUDE_API_KEY  = 'YOUR_CLAUDE_API_KEY';
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
    { id: TIER_L1A,    label: 'Loss 1',    mines:  8, multiplier: 1.42, winProb: 0.6973, reveals: 2 },
    { id: TIER_L2A,    label: 'Loss 2',    mines:  8, multiplier: 1.71, winProb: 0.5786, reveals: 3 },
    { id: TIER_T3A,    label: 'T3a',       mines: 15, multiplier: 2.08, winProb: 0.477, reveals: 2 },
    { id: TIER_L4,     label: 'Loss 4',    mines: 20, multiplier: 4.99, winProb: 0.1983, reveals: 3 },
    { id: TIER_L5,     label: 'Loss 5',    mines: 35, multiplier: 50.11, winProb: 0.0198, reveals: 3 },
    { id: TIER_L6,     label: 'Loss 6',    mines: 40, multiplier: null, winProb: 0.184, flatBet: 5.00 },
    { id: TIER_HAIL,   label: 'Hail Mary', mines: 45, multiplier: null, winProb: 0.082, flatBet: 5.00 },
  ];



  const CONFIG = {
    baseBet:           0.10,
    targetBankroll:    999999,
    tiles:             49,
    bonusTiles:        49,
    bonusMines:        20,   // 20m/2rev: best EV of all bonus configs
    bonusReveals:      2,
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
    bonusPotShare:     0.40,
    lossBufferShare:   0.30,
    bankrollShare:     0.30,
    minBet:            0.10,
    delayMs:           3000,
    revealCount:       1,    // gems to reveal before cashout (1-3)
    normalMines:       12,   // mines for T0 normal bets (Claude can tune 3-14) — 12 optimal: 75.5% win / 1.31x
    // ── Recovery profit targets ────────────────────────────
    // How much profit to aim for when each tier wins
    recoveryTargets: [0, 0.10, 1.00, 0.00, 0.00, 0.00, 0, 0],   // T2≤$4 T3≤$10 T4+T5≤$20 T7≤$70
    // index:          T0  T1    T2    T3a   T4    T5    T6  T7
    // ── Claude-tunable params ─────────────────────────────
    betMultiplier:     1.0,   // scales entire bet ladder (1.0–3.0, min 1.0)
    maxBetPct:         0.20,  // max recovery bet as % bankroll (0.05–0.30)
    tileStatWeight:    0.70,  // tile stats vs random 0=random 1=full stats (0.0–1.0)
    resetBank1:        100,   // reset after L2 if bank below this (50–300)
    resetBank3:        300,   // reset after T4/T5 if bank below this (200–500)
    resetBank2:        200,   // reset after T3a if bank below this (100–400)
    preLossEnabled:    true,  // run 1 pre-loss attempt before T1
    preLossMines:      25,    // mines count for pre-loss attempt (25–45), 2 reveals
    luckyBet:          2.00,  // Lucky Shot flat bet (0.10–10.0)
    luckyStopMin:      10,    // Lucky Shot min reveals (1–17) — 10 adds $331/$711 jackpots
    luckyStopMax:      17,    // Lucky Shot max reveals (1–17)
    claudeModeTarget:  200,   // Claude mode target bankroll (50–10000)
    claudeModeEnabled: true,  // trigger Claude mode after bonus #5 win
    // ─────────────────────────────────────────────────────
    // ── Recovery chain ────────────────────────────────────
    recoveryChain: [
      { id: 1, label: 'Loss1',    tierConst: 1, enabled: true,  mines:  8, reveals: 2, flatBet: null, wins: 0, losses: 0 },
      { id: 2, label: 'Loss2',    tierConst: 2, enabled: true,  mines:  8, reveals: 3, flatBet: null, wins: 0, losses: 0 },
      { id: 3, label: 'T3a',      tierConst: 3, enabled: true,  mines: 15, reveals: 2, flatBet: null, wins: 0, losses: 0 },
      { id: 4, label: 'Loss4',    tierConst: 4, enabled: true,  mines: 20, reveals: 3, flatBet: null, wins: 0, losses: 0 },
      { id: 5, label: 'Loss5',    tierConst: 5, enabled: true,  mines: 35, reveals: 3, flatBet: null, wins: 0, losses: 0 },
      { id: 6, label: 'Loss6',    tierConst: 6, enabled: true,  mines: 40, flatBet: 5.00, wins: 0, losses: 0 },
      { id: 7, label: 'HailMary', tierConst: 7, enabled: true,  mines: 45, flatBet: 5.00, wins: 0, losses: 0 },
    ],
    // ─────────────────────────────────────────────────────
    maxRounds:         999999,
    maxLogSize:        500,
    reportEveryRounds: 50,
    reportEveryMinutes:10,
  };

  // ── Recovery chain helpers ────────────────────────────────
  // Returns next enabled tier after currentTier
  const getNextTier = (currentTier) => {
    const chain = (CONFIG.recoveryChain || []).filter(c => c.enabled);
    const next = chain.find(c => c.tierConst > currentTier);
    if (next) return next.tierConst;
    // No more enabled tiers — check if HailMary is enabled
    const hail = (CONFIG.recoveryChain||[]).find(c => c.id === 7);
    if (hail && hail.enabled) return TIER_HAIL;
    // HailMary disabled (bank too low) — reset to T0 instead
    return 0;
  };

  // Auto-disable tiers whose bet would exceed safe bankroll %
  // Called every round before getNextTier
  const autoGuardChain = () => {
    const bank = state.bankroll;
    // Bankroll thresholds per tier — code-enforced, Claude cannot override
    const minBank = { 3: 40, 4: 200, 5: 200, 6: 300, 7: 300 };
    let changed = false;
    (CONFIG.recoveryChain||[]).forEach(c => {
      if (c.id <= 2) return;  // T1/T2 always stay on
      const needed = minBank[c.id];
      if (!needed) return;
      const shouldEnable = bank >= needed;
      if (c.enabled !== shouldEnable) {
        c.enabled = shouldEnable;
        changed = true;
        if (TIERS[c.tierConst]) {
          TIERS[c.tierConst].mines = c.mines;
          if (c.flatBet) TIERS[c.tierConst].flatBet = c.flatBet;
        }
        log('🔒 [AutoGuard] ' + c.label + (shouldEnable ? ' ENABLED' : ' DISABLED') +
            ' (bank=$' + bank.toFixed(2) + ' ' + (shouldEnable ? '≥' : '<') + ' $' + needed + ')');
      }
    });
    return changed;
  };

  // Sync CONFIG.recoveryChain mines/flatBet into TIERS array
  const syncRecoveryChain = () => {
    (CONFIG.recoveryChain || []).forEach(c => {
      if (TIERS[c.tierConst]) {
        TIERS[c.tierConst].mines = c.mines;
        if (c.flatBet !== null) TIERS[c.tierConst].flatBet = c.flatBet;
      }
    });
  };

  let state = {
    running: false, claudeModeRunning: false, bankroll: 0, currentBet: 0, winStreak: 0, aggressiveBoostRounds: 0,
    rounds: 0, wins: 0, losses: 0,
    tier: 0, tierLosses: 0, lossStreakAmount: 0,
    t3aStreakSnapshot: 0,
    t3aActualBet: 0,
    streakBaseBet: 0,
    peakBankroll: 0, launchBankroll: 0, startTime: Date.now(),
    lastReportMinute: -1, lastTuneMinute: -1,
    mineTiles: new Set(),
    bonusPot: 0,  // total of all pots (for compatibility)
    bonusPots: [0, 0, 0, 0, 0],  // individual pots: #1=$1 #2=$2 #3=$4 #4=$8 #5=$12
    lossBuffer: 0,
    bonusRounds: 0, bonusWins: 0, bonusLosses: 0, bonusProfit: 0,
    bonusByTier: [  // index 0-4 = tiers $1,$2,$4,$8,$12
      { rounds:0, wins:0, losses:0, profit:0, bet:1  },
      { rounds:0, wins:0, losses:0, profit:0, bet:2  },
      { rounds:0, wins:0, losses:0, profit:0, bet:4  },
      { rounds:0, wins:0, losses:0, profit:0, bet:8  },
      { rounds:0, wins:0, losses:0, profit:0, bet:10 },
    ],
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
        bankroll: state.bankroll,
        rounds: state.rounds, wins: state.wins, losses: state.losses,
        tier: state.tier, tierLosses: state.tierLosses,
        lossStreakAmount: state.lossStreakAmount,
        t3aStreakSnapshot: state.t3aStreakSnapshot || 0,
        t3aActualBet: state.t3aActualBet || 0,
        streakBaseBet: state.streakBaseBet || 0,
        launchBankroll: state.launchBankroll || 0,
        bonusPot: state.bonusPot, bonusPots: state.bonusPots, lossBuffer: state.lossBuffer,
        recoveryChain: CONFIG.recoveryChain,
        recoveryTargets: CONFIG.recoveryTargets,
        bonusRounds: state.bonusRounds, bonusWins: state.bonusWins,
        bonusLosses: state.bonusLosses, bonusProfit: state.bonusProfit,
        bonusByTier: state.bonusByTier,
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
          ' | Bank:$' + (data.bankroll||0).toFixed(2) +
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
    state.bonusPots           = data.bonusPots            || [0,0,0,0,0];
    state.lossBuffer          = data.lossBuffer          || 0;
    if (data.recoveryTargets) CONFIG.recoveryTargets = data.recoveryTargets;
    if (data.recoveryChain) {
      data.recoveryChain.forEach(s => {
        const e = (CONFIG.recoveryChain||[]).find(c => c.id === s.id);
        if (e) Object.assign(e, s);
      });
    }
    state.bonusRounds         = data.bonusRounds;
    state.bonusWins           = data.bonusWins;
    state.bonusLosses         = data.bonusLosses         || 0;
    state.bonusProfit         = data.bonusProfit;
    if (data.bonusByTier) data.bonusByTier.forEach((t,i) => { if(state.bonusByTier[i]) Object.assign(state.bonusByTier[i], t); });
    state.hailMaryRounds      = data.hailMaryRounds      || 0;
    state.hailMaryWins        = data.hailMaryWins        || 0;
    state.hailMaryLosses      = data.hailMaryLosses      || 0;
    state.resets              = data.resets              || 0;
    state.recoveries          = data.recoveries          || 0;
    state.bufferAbsorbs       = data.bufferAbsorbs       || 0;
    state.t3aRounds           = data.t3aRounds           || 0;
    state.t3aWins             = data.t3aWins             || 0;
    state.peakBankroll        = data.peakBankroll;
    state.launchBankroll      = data.launchBankroll    || 0;
    if (data.bankroll) state.bankroll = data.bankroll;  // restored until real wallet sync
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
    state.bonusPot = 0; state.bonusPots = [0,0,0,0,0]; state.lossBuffer = 0;
    state.bonusRounds = 0; state.bonusWins = 0; state.bonusLosses = 0; state.bonusProfit = 0;
    state.bonusByTier.forEach(t => { t.rounds=0; t.wins=0; t.losses=0; t.profit=0; });
    (CONFIG.recoveryChain||[]).forEach(c => { c.wins=0; c.losses=0; });
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
          bonusThreshold:  getDynBonusThreshold(),
          bonusBet:        getDynBonusBet(),
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
    const mult = CONFIG.betMultiplier || 1.0;
    for (const tier of CONFIG.betTiers) {
      if (state.bankroll <= tier.upTo) return Math.max(0.10, Math.round(tier.bet * mult * 100) / 100);
    }
    return Math.max(0.10, Math.round(state.bankroll * 0.0015 * mult * 100) / 100);
  };

  // Multi-bonus ladder: thresholds and bets scale with bankroll
  // Base scale: bank<100=$1x, bank<300=$2x, bank<600=$5x, bank<1000=$10x, bank>=1000=$20x
  // Dynamic profit split: more pots at low bank (faster Lucky Shot fill)
  // more buffer when struggling, normal split when healthy
  // Recovery targets scale proportionally with bankroll
  const getDynamicTargets = () => {
    const bank = state.bankroll;
    const base = CONFIG.recoveryTargets || [0,0.10,1.00,0.00,0.00,0.00,0,0];
    if (bank < 100) return base;
    const t1 = Math.max(base[1], Math.round(bank * 0.001 * 100) / 100);
    const t2 = Math.max(base[2], Math.round(bank * 0.010 * 100) / 100);
    return [0, t1, t2, base[3], base[4], base[5], 0, 0];
  };

  // maxBetPct scales down as bankroll grows to protect gains
  const getDynamicMaxBetPct = () => {
    const bank = state.bankroll;
    const base = CONFIG.maxBetPct || 0.20;
    if (bank >= 5000) return Math.min(base, 0.05);
    if (bank >= 1000) return Math.min(base, 0.08);
    if (bank >= 500)  return Math.min(base, 0.12);
    if (bank >= 200)  return Math.min(base, 0.18);
    return base;
  };

  const getDynamicSplit = () => {
    const bank = CONFIG.bankrollShare   || 0.30;
    const buf  = CONFIG.lossBufferShare || 0.30;
    const pot  = (CONFIG.bonusPotShare  || 0.40) / 5;
    if (state.bankroll < 100) {
      // Low bank: boost pots slightly for faster Lucky Shots
      // Always normalize so bank+buf+pots×5 = exactly 1.0
      const lowBuf = Math.min(buf, 0.35);           // buffer max 35%
      const lowPot = Math.min(pot * 1.3, 0.10);    // up to 10% each pot
      const lowBank = Math.max(1.0 - lowPot*5 - lowBuf, 0.05); // remainder
      const total = lowBank + lowBuf + lowPot * 5;
      // Normalize to exactly 1.0 — prevent overflow
      return { bank: lowBank/total, buf: lowBuf/total, pot: lowPot/total };
    }
    // Normal: normalize CONFIG values too
    const total = bank + buf + pot * 5;
    return { bank: bank/total, buf: buf/total, pot: pot/total };
  };

  const getBonusScale = () =>
    state.bankroll < 100  ? 1  :
    state.bankroll < 300  ? 2  :
    state.bankroll < 600  ? 5  :
    state.bankroll < 1000 ? 10 : 20;

  // Static ladder ratios — scaled at runtime
  const BONUS_LADDER_BASE = [
    { ratio: 1,  betRatio: 1,   luckyShot: false },  // fires at 1x scale
    { ratio: 2,  betRatio: 2,   luckyShot: false },  // fires at 2x scale
    { ratio: 4,  betRatio: 4,   luckyShot: false },  // fires at 4x scale
    { ratio: 8,  betRatio: 8,   luckyShot: false },  // fires at 8x scale
    { ratio: 12, betRatio: 10,  luckyShot: true  },  // fires at 12x scale + Lucky Shot
  ];

  // Live accessor — recalculates with current bankroll each call
  const getBonusLadder = () => {
    const s = getBonusScale();
    return BONUS_LADDER_BASE.map(b => ({
      threshold: b.ratio    * s,
      bet:       b.betRatio * s,
      luckyShot: b.luckyShot,
    }));
  };

  const getNextBonus = () => {
    const ladder = getBonusLadder();
    for (let i = 0; i < ladder.length; i++) {
      if (state.bonusPots[i] >= ladder[i].threshold) return { ...ladder[i], potIndex: i };
    }
    return null;
  };

  // Keep these for compatibility with stats/snapshot/tuner
  const getDynBonusThreshold = () => 12;
  const getDynBonusBet = () => 10;

  const calculateBet = (tierIndex) => {
    const t = TIERS[tierIndex];
    if (!t) return getBaseBet();
    if (t.flatBet) return t.flatBet;
    if (tierIndex === TIER_NORMAL) return getBaseBet();

    const base   = state.streakBaseBet || getBaseBet();
    const maxBet = Math.max(state.bankroll * getDynamicMaxBetPct(), base);

    // Recovery bet targets progressively higher profit per tier
    const _dyn = getDynamicTargets();
    const target = (_dyn && _dyn[tierIndex]) || base;
    const recoveryBet = (state.lossStreakAmount + target) / (t.multiplier - 1);
    return Math.max(0.10, Math.round(Math.min(Math.max(recoveryBet, base), maxBet) * 100) / 100);
  };

  const pickTile = (maxTile) => {
    const available = tileStats.filter(t => t.index < maxTile && !state.mineTiles.has(t.index));
    if (available.length === 0) { state.mineTiles.clear(); return Math.floor(Math.random() * maxTile); }
    const w = CONFIG.tileStatWeight !== undefined ? CONFIG.tileStatWeight : 0.70;
    const sorted = available.sort((a, b) =>
      (a.mineRate * w + Math.random() * (1-w)) - (b.mineRate * w + Math.random() * (1-w)));
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
          normalMines: CONFIG.normalMines, revealCount: CONFIG.revealCount,
          tileWeight: CONFIG.tileStatWeight, maxBetPct: CONFIG.maxBetPct,
          preLossMines: CONFIG.preLossMines,
          bankrollShare: CONFIG.bankrollShare, lossBufferShare: CONFIG.lossBufferShare,
          potShareEach: parseFloat((CONFIG.bonusPotShare/5).toFixed(3)),
          delayMs: CONFIG.delayMs,
        },
        tileIntelligence: liveTileData,
        sessionHistory: loadSessionHistory(),
      };

      const ladder = getBonusLadder();
      const bonusPotsSummary = state.bonusPots.map((p,i) =>
        '#' + (i+1) + ':$' + p.toFixed(3) + '/$' + ladder[i].threshold + '(bet$' + ladder[i].bet + ')'
      ).join(' ');

      const prompt = `You are a live optimizer for a Rainbet Mines bot. Return ONLY a raw JSON object, no markdown, no explanation.

GAME: 49-tile board, reveal tiles then cashout. House edge ~1%.
SPLIT: ${(CONFIG.bankrollShare*100).toFixed(0)}% bankroll / ${(CONFIG.bonusPotShare*100).toFixed(0)}% bonus pots (${(CONFIG.bonusPotShare/5*100).toFixed(1)}% each) / ${(CONFIG.lossBufferShare*100).toFixed(0)}% buffer.
POTS: ${bonusPotsSummary}
TILES: ${snapshot.tileIntelligence ? 'tracked=' + snapshot.tileIntelligence.totalTracked + ' safest=' + JSON.stringify(snapshot.tileIntelligence.safest.slice(0,3)) : 'n/a'}

SNAPSHOT:
rounds=${snapshot.rounds} | winRate=${snapshot.winRate} | netPL=$${snapshot.netPL} | time=${Math.floor((Date.now()-state.startTime)/60000)}m
bankroll=$${snapshot.bankroll} | launch=$${state.launchBankroll.toFixed(2)} | peak=$${state.peakBankroll.toFixed(2)} | drawdown=${state.launchBankroll>0?((1-state.bankroll/state.launchBankroll)*100).toFixed(1)+'%':'n/a'}
tier=${snapshot.tierLabel} | resets=${snapshot.resets} | winStreak=${state.winStreak||0} | buffer=$${snapshot.lossBuffer}
sessionMode=${state.winStreak>=3 && snapshot.winRate>75 ? 'WIN_MOMENTUM' : snapshot.recentResets>2 || snapshot.lossBuffer<0.10 ? 'LOSS_RECOVERY' : 'NEUTRAL'} | bufAbsorbs=${snapshot.bufferAbsorbs} | bigConLoss=${snapshot.biggestConLoss}
bonusPots=${bonusPotsSummary}
bonusLadder=${JSON.stringify(state.bonusByTier.map((t,i)=>({tier:'#'+(i+1),bet:t.bet,rounds:t.rounds,wins:t.wins,losses:t.losses,wr:t.rounds?(t.wins/t.rounds*100).toFixed(0)+'%':'n/a',pl:'$'+t.profit.toFixed(2)})))}
recoveryChain=${JSON.stringify((CONFIG.recoveryChain||[]).map(c=>({id:c.id,label:c.label,on:c.enabled,mines:c.mines,defMines:{1:16,2:20,3:16,4:30,5:35,6:40,7:45}[c.id],wins:c.wins||0,losses:c.losses||0,wr:(c.wins||0)+(c.losses||0)>0?(((c.wins||0)/((c.wins||0)+(c.losses||0)))*100).toFixed(0)+'%':'n/a'})))}
avgBet=$${snapshot.rounds?(snapshot.totalBetted/snapshot.rounds).toFixed(3):'0'} | totalBetted=$${snapshot.totalBetted}
safestTiles=${JSON.stringify((snapshot.tileIntelligence?.safest||[]).slice(0,5))}
dangerousTiles=${JSON.stringify((snapshot.tileIntelligence?.mostDangerous||[]).slice(0,5))}
config=${JSON.stringify(snapshot.currentConfig)}
normalMines=${CONFIG.normalMines||10} | T0winRate=${((49-(CONFIG.normalMines||10))/49*100).toFixed(1)}%

TUNABLE (include ONLY keys to change — all others stay as-is):
SPLIT (must sum to 1.0):
  bankrollShare   ${CONFIG.bankrollShare}  [0.20-0.50]  % profit to bankroll
  lossBufferShare ${CONFIG.lossBufferShare}  [0.20-0.40]  % profit to loss buffer
  potShare        ${(CONFIG.bonusPotShare/5).toFixed(3)}  [0.02-0.15]  % profit to each of 5 pots
TIMING:
  delayMs         ${CONFIG.delayMs}  [2000-5000]  ms between bets
GAMEPLAY:
  normalMines      ${CONFIG.normalMines||10}  [3-14]      T0 mines — HARD MAX 14 (guarantees ≥70% win rate)
                                               mines→winRate: 3=94% 5=90% 8=84% 10=80% 12=76% 14=71%
  betMultiplier    ${CONFIG.betMultiplier||1}  [0.5-3.0]   scales entire bet ladder
  maxBetPct        ${CONFIG.maxBetPct}  [0.05-0.30]  recovery max bet as % of bankroll
  revealCount      ${CONFIG.revealCount||1}  [1-3]        gems revealed before cashout
  tileStatWeight   ${CONFIG.tileStatWeight||0.7}  [0.0-1.0]   tile stats vs random (1=full stats). Use safestTiles data above.
  resetBank1       ${CONFIG.resetBank1||100}  [50-300]     reset after L2 if bank below this
  resetBank2       ${CONFIG.resetBank2||400}  [200-800]    reset after T3a if bank below this
  preLossEnabled   ${CONFIG.preLossEnabled!==false}  true/false   1 pre-loss attempt before T1
  luckyBet         ${CONFIG.luckyBet||2}  [0.10-10.0]  Lucky Shot flat bet
  luckyStopMin     ${CONFIG.luckyStopMin||12}  [1-17]       Lucky Shot min reveals before cashout
  luckyStopMax     ${CONFIG.luckyStopMax||17}  [1-17]       Lucky Shot max reveals before cashout
  claudeModeTarget ${CONFIG.claudeModeTarget||200}  [50-10000]   Claude mode target bankroll
  claudeModeEnabled ${CONFIG.claudeModeEnabled!==false}  true/false  trigger Claude mode on bonus #5 win

RULES:
- Pots not firing / very slow → increase potShare, cut bankrollShare
- Buffer at 0 constantly → increase lossBufferShare
- Win rate > 82% stable → try normalMines 12-15 for more profit; try revealCount 2
- Win rate < 72% → normalMines 3-7, revealCount 1
- Tile picks >= 100 and clear pattern → tileWeight 0.85-0.95
- Tile picks sparse → tileWeight 0.40-0.50
- BiggestConLoss >= 5 → maxBetPct 0.12-0.15
- Bankroll > $300 growing well → increase luckyBet to 5-10 for bigger Lucky Shot
- Bankroll shrinking / many resets → increase bankrollShare, decrease potShare
═══════════════════════════════════════════════════════
ULTRA-THINK: RECOVERY WITHOUT LOSING MORE
═══════════════════════════════════════════════════════
Core principle: every change must increase profit/win OR reduce loss/streak. Never increase risk without reward.

PROFIT PER WIN FORMULA: profit = bet × (multiplier-1) × bankrollShare
  10 mines (1.21x): $0.10 × 0.21 × 0.30 = $0.0063/win
  12 mines (1.44x): $0.10 × 0.44 × 0.30 = $0.0132/win — 2.1x better, still 75.5% win rate
  14 mines (1.71x): $0.10 × 0.71 × 0.30 = $0.0213/win — 3.4x better, still 71.4% win rate
→ MORE MINES = MORE PROFIT PER WIN. Most powerful lever available.

LOW BANKROLL PROTOCOL (bank < $100 AND not improving after 50+ rounds):
  → normalMines: increase to 12-14 (not 10) — higher mult, ≥71% win rate
  → betMultiplier: 1.2-1.5 if win rate > 75%
  → potShare: 0.10-0.12 each — fill pots faster for bonus action
  → lossBufferShare: 0.35 — buffer needs to be strong at low bank
  → bankrollShare: 0.20 — pots+buffer more important at this stage
  → delayMs: 2000 — faster compounding when winning
  Apply gradually: change normalMines first, wait 20+ rounds, then betMultiplier if still not improving

RECOVERY WITHOUT LOSING MORE:
  Chain bet formula: bet = (streak + target) / (multiplier-1)
  Win the bet → recover ALL previous losses + target profit (that's the design)
  To reduce losses WITHOUT breaking recovery math:
    1. Improve T1 win rate → reduce id1 mines to 12-14 (higher mult = smaller bet needed)
    2. Keep buffer strong (lossBufferShare 0.30-0.35) → absorbs losses before escalation
    3. Keep preLossEnabled=true, preLossMines=35+ → free interception before T1
    4. Better tile picking (tileStatWeight=0.85 if safestTiles mineRate<10%)
  NEVER increase T1/T2 mines to reduce bets — it makes wins less likely
  NEVER disable T1 — it's the primary recovery mechanism

SESSION MODES — Claude should actively switch between these:

MODE 1: WIN MOMENTUM (winStreak ≥ 3 AND win rate > 75%)
  → Use some of the accumulated wins to push harder
  → normalMines: increase by 1-2 (more profit per win)
  → betMultiplier: increase by 0.1-0.2 (up to 1.5 max)
  → potShare: increase slightly (fill pots faster = more Lucky Shots)
  → delayMs: decrease to 2000-2500 (compound faster)
  → DO NOT: disable tiers or reduce buffer during win streak

MODE 2: LOSS RECOVERY (resets > 2 in last 10 OR buffer < $0.10)
  → Protect what's left, recover slowly and safely
  → normalMines: reduce to 10-12 (higher win rate)
  → betMultiplier: reduce to 1.0 (minimum bets)
  → lossBufferShare: increase to 0.35-0.40 (absorb more losses)
  → bankrollShare: increase to 0.35 (keep more of each win)
  → delayMs: increase to 3500-4000 (slow down, let RNG settle)
  → preLossEnabled: true (intercept losses before T1)
  → DO NOT: increase mines, bets, or disable tiers in this mode

MODE 3: NEUTRAL (everything else)
  → Maintain current settings or restore defaults gradually

TRANSITION RULES:
  Win streak ends (first loss after streak ≥ 5) → drop to NEUTRAL immediately
  Buffer refills above $0.30 AND resets < 2 → exit LOSS RECOVERY → NEUTRAL
  Consecutive win streaks (3+ times) → allow WIN MOMENTUM with higher cap

WHEN TO CHANGE (bad conditions):
- bank < $100 AND rounds > 50 AND netPL ≤ 0: apply LOW BANKROLL PROTOCOL above
- win rate < 70%: delayMs=4000, lossBufferShare+0.02
- resets > 3 in 10 rounds: check T1 mines, increase lossBufferShare
- buffer always 0: lossBufferShare=0.35, reduce potShare
- drawdown > 15%: increase bankrollShare, disable chain tiers 4-5
- T1 win rate < 60%: reduce id1 mines by 2
- safestTiles mineRate < 8% AND picks > 20: tileStatWeight=0.90

WHEN TO RESTORE (good conditions):
- winStreak ≥ 5 AND win rate ≥ 70%: delayMs+500ms (ease up)
- winStreak ≥ 10 AND win rate ≥ 75%: delayMs=3000, betMultiplier=1.0
- win rate > 80% for 30+ rounds AND resets < 2 AND buffer > $0.30 AND netPL > 0:
  → RESTORE ALL: delayMs=3000, betMultiplier=1.0, normalMines=10, tileStatWeight=0.70
  → RESTORE split: bankrollShare=0.30, lossBufferShare=0.30, potShare=0.08
  → RESTORE chain: re-enable all, mines+reveals (id1=8m/2rev,id2=8m/3rev,id3=15m/2rev,id4=20m/3rev,id5=30m/3rev,id6=40m/1rev,id7=45m/1rev)
  → RESTORE targets: [0, 0.10, 1.00, 0.00, 0.00, 0.00, 0, 0]
  → RESTORE preloss: preLossEnabled=true, preLossMines=39
- win rate > 75% for 20+ rounds AND resets < 2: re-enable disabled chain tiers

ALWAYS verify budget caps: T2≤$4 | T3≤$10 | T4+T5≤$20 | T7≤$70
Session healthy, bankroll growing → return {}

RECOVERY CHAIN — tune which tiers fire and their mine counts:
  Current chain: ${JSON.stringify((CONFIG.recoveryChain||[]).map(c=>({id:c.id,label:c.label,enabled:c.enabled,mines:c.mines,flatBet:c.flatBet,wins:c.wins||0,losses:c.losses||0})))}
  Current recoveryTargets: ${JSON.stringify(CONFIG.recoveryTargets)}
  To disable a tier: {"recoveryChain": [{"id": 3, "enabled": false}]}
  To change mines:   {"recoveryChain": [{"id": 1, "mines": 20}]}
  To adjust flatBet: {"recoveryChain": [{"id": 7, "flatBet": 3.00}]}
  To change targets: {"recoveryTargets": [0, 0.10, 1.00, 0.36, 15.00, 24.00, 0, 0]}

  AUTO-SCALING (code-managed, not tunable):
    maxBetPct scales DOWN as bank grows: <$200=20% $500=12% $1000=8% $5000=5%
    T1/T2 targets scale UP: T1=max(0.10,bank×0.1%) T2=max(1.00,bank×1%) when bank≥$100
    resetBank1 = max($100, launchBankroll+$10) at boot

  SAFETY RULES — enforced by code regardless of what you send:
    bankrollShare ≥ 0.15 (never starve the bankroll)
    lossBufferShare ≥ 0.25 (buffer must always have fuel)
    split auto-normalized if sum > 1.0 (prevents overflow drain)
    betMultiplier: 1.0–2.5 | normalMines: 3–14 | preLossMines ≥ 25

  YOUR RESPONSIBILITY (code cannot enforce these):
    Never combine multiple aggressive changes at once
    If bankroll < $50: ONLY reduce betMultiplier or increase buffer — never increase bets
    If resets > 5 in last 10 rounds: reduce mines, NOT increase
    Think about bankroll endurance first — profit second

  BUDGET CAPS (code-enforced — never violate):
    Bank $40–$200:  max total loss ≤ $10  (T1+T2+T3a only, resets after T3a)
    Bank $200–$300: max total loss ≤ $20  (T1+T2+T3a+T4+T5, resets after T5)
    Bank $300+:     max total loss ≤ $70  (full chain)
    T3a=20mines(1.67x) T5=40mines(5.39x) — DO NOT change these mines
    FORMULA: T_bet = (lossStreakAmount + target) / (multiplier - 1)

  AUTO-GUARD (enforced by code — Claude cannot override these thresholds):
    T3a: requires bank ≥ $40
    T4/T5: requires bank ≥ $200
    T6/T7: requires bank ≥ $300
    Tiers auto-enable/disable every 10 rounds as bankroll changes.

  DISABLE a tier when: that tier has 3+ consecutive losses, OR resets >3 in last 10 rounds.
  RE-ENABLE a tier when: last 20 rounds have <2 resets AND overall win rate > 75% AND buffer > $0.10.
    → Only re-enable if bankroll also meets the threshold above (e.g. don't re-enable T3a if bank<$40)
    → When re-enabling: also check if mines should be restored to default.
  RESTORE mines to default when: win rate >78% for 30+ rounds AND no resets in last 10.
    Default mines: id1=16 id2=20 id3=16 id4=30 id5=35 id6=40 id7=45
  RESTORE recoveryTargets to default [0,0.10,1.00,0.36,15.00,24.00,0,0] when:
    win rate >80% for 20+ rounds AND resets=0 in last 10 AND buffer > $0.20.
  RESTORE all params to balanced defaults when session fully stabilizes:
    - win rate >80% for 30+ rounds
    - resets <2 in last 20 rounds
    - buffer > $0.30
    - bankroll growing (netPL positive)
    → restore: delayMs=3000, betMultiplier=1.0, tileStatWeight=0.70, preLossEnabled=true
    → restore: bankrollShare=0.30, lossBufferShare=0.30, potShare=0.08
    → re-enable all chain tiers, restore default mines, restore default targets
  Always try to restore disabled tiers once session stabilizes — shorter chain = less coverage.

Return ONLY JSON. Return {} if no changes needed.` ;

      const data = await callBackground({ type: 'CLAUDE_TUNE', apiKey: CLAUDE_API_KEY, prompt });
      if (data?.usage) log('🤖 [AI Tuner] tokens in:' + data.usage.input_tokens + ' out:' + data.usage.output_tokens);
      const raw     = data?.content?.[0]?.text?.trim() || '{}';
      const changes = JSON.parse(raw.replace(/```json|```/g, '').trim());

      if (Object.keys(changes).length === 0) { log('🤖 [AI Tuner] No changes needed.'); return; }

      const applied = [];

      if (changes.delayMs !== undefined) {
        const v = Math.min(Math.max(parseFloat(changes.delayMs), 2000), 5000);
        applied.push('delayMs: ' + CONFIG.delayMs + ' → ' + v); CONFIG.delayMs = v;
      }

      // Split validation
      const newBank   = changes.bankrollShare   !== undefined ? parseFloat(changes.bankrollShare)  : CONFIG.bankrollShare;
      const newBuf    = changes.lossBufferShare  !== undefined ? parseFloat(changes.lossBufferShare) : CONFIG.lossBufferShare;
      const newPot1   = changes.potShare         !== undefined ? parseFloat(changes.potShare)        : CONFIG.bonusPotShare / 5;
      const total     = Math.round((newBank + newBuf + newPot1 * 5) * 1000) / 1000;
      if (Math.abs(total - 1.0) <= 0.02) {
        const cb = Math.min(Math.max(newBank, 0.20), 0.50);
        const cf = Math.min(Math.max(newBuf,  0.20), 0.40);
        const cp = Math.min(Math.max(newPot1, 0.02), 0.15);
        if (Math.abs(cb - CONFIG.bankrollShare)   > 0.001) { applied.push('bankrollShare: '   + CONFIG.bankrollShare   + '→' + cb); CONFIG.bankrollShare   = cb; }
        if (Math.abs(cf - CONFIG.lossBufferShare) > 0.001) { applied.push('lossBufferShare: ' + CONFIG.lossBufferShare + '→' + cf); CONFIG.lossBufferShare = cf; }
        const cp5 = CONFIG.bonusPotShare / 5;
        if (Math.abs(cp - cp5) > 0.001) { applied.push('potShare: ' + cp5.toFixed(3) + '→' + cp); CONFIG.bonusPotShare = Math.round(cp * 5 * 1000) / 1000; }
      } else if (changes.bankrollShare !== undefined || changes.lossBufferShare !== undefined || changes.potShare !== undefined) {
        log('🤖 [AI Tuner] Split rejected — sum=' + total + ' (need ~1.0)');
      }

      // All numeric/boolean gameplay params
      const gp = [
        // [configKey, min, max, isInt]
        ['normalMines',      3,     14,    true ],  // hard cap 14 — guarantees T0 win rate ≥ 70%
        ['betMultiplier',    1.0,   3.0,   false],  // min 1.0 keeps base bet ≥ $0.10
        ['maxBetPct',        0.05,  0.30,  false],
        ['revealCount',      1,     3,     true ],
        ['tileStatWeight',   0.0,   1.0,   false],
        ['resetBank1',       50,    300,   true ],
        ['resetBank2',       200,   800,   true ],
        ['luckyBet',         0.10,  10.0,  false],  // min $0.10
        ['luckyStopMin',     1,     17,    true ],
        ['luckyStopMax',     1,     17,   true ],
        ['claudeModeTarget', 50,    10000, true ],
        ['preLossMines',     25,    45,    true ],
        ['resetBank1',       50,    300,   true ],
        ['resetBank2',       200,   800,   true ],
      ];
      for (const [key, min, max, isInt] of gp) {
        if (changes[key] === undefined) continue;
        let v = parseFloat(changes[key]);
        if (isNaN(v)) continue;
        v = Math.min(Math.max(v, min), max);
        if (isInt) v = Math.round(v);
        if (Math.abs(v - (CONFIG[key]||0)) > 0.0001) {
          applied.push(key + ': ' + CONFIG[key] + ' → ' + v);
          CONFIG[key] = v;
        }
      }
      // Boolean params
      ['preLossEnabled','claudeModeEnabled'].forEach(key => {
        if (changes[key] === undefined) return;
        const v = changes[key] === true || changes[key] === 'true';
        if (v !== CONFIG[key]) { applied.push(key + ': ' + CONFIG[key] + ' → ' + v); CONFIG[key] = v; }
      });
      // Enforce luckyStopMin <= luckyStopMax
      if ((CONFIG.luckyStopMin||12) > (CONFIG.luckyStopMax||17)) CONFIG.luckyStopMax = CONFIG.luckyStopMin;

      // Apply recoveryChain changes
      if (changes.recoveryChain && Array.isArray(changes.recoveryChain)) {
        changes.recoveryChain.forEach(change => {
          if (!change.id) return;
          const entry = (CONFIG.recoveryChain||[]).find(c => c.id === change.id);
          if (!entry) return;
          if (change.id === 1 && change.enabled === false) {
            log('🤖 [AI Tuner] Cannot disable tier 1 — skipped'); return;
          }
          if (change.enabled !== undefined) {
            const v = change.enabled === true || change.enabled === 'true';
            if (v !== entry.enabled) { applied.push('chain[' + change.id + '].enabled: ' + entry.enabled + '→' + v); entry.enabled = v; }
          }
          if (change.mines !== undefined) {
            const v = Math.round(Math.min(Math.max(parseInt(change.mines), 3), 45));
            if (v !== entry.mines) { applied.push('chain[' + change.id + '].mines: ' + entry.mines + '→' + v); entry.mines = v; }
          }
          if (change.flatBet !== undefined && (change.id === 6 || change.id === 7)) {
            const v = Math.round(Math.min(Math.max(parseFloat(change.flatBet), 0.10), 50) * 100) / 100;
            if (v !== entry.flatBet) { applied.push('chain[' + change.id + '].flatBet: ' + entry.flatBet + '→' + v); entry.flatBet = v; }
          }
          if (TIERS[entry.tierConst]) {
            TIERS[entry.tierConst].mines = entry.mines;
            if (entry.flatBet !== null) TIERS[entry.tierConst].flatBet = entry.flatBet;
          }
        });
      }

      if (applied.length === 0) { log('🤖 [AI Tuner] No effective changes.'); return; }
      log('🤖 [AI Tuner] Applied ' + applied.length + ' change(s):');
      applied.forEach(c => log('   ✅ ' + c));
      // Clamp split to safe ranges
      // Safety rails — hard limits Claude cannot bypass
      CONFIG.bankrollShare   = Math.min(Math.max(CONFIG.bankrollShare,   0.15), 0.50);
      CONFIG.lossBufferShare = Math.min(Math.max(CONFIG.lossBufferShare, 0.25), 0.50);
      CONFIG.bonusPotShare   = Math.min(Math.max(CONFIG.bonusPotShare,   0.10), 0.60);
      // Prevent overflow — normalize if sum > 1.0
      const _splitSum = CONFIG.bankrollShare + CONFIG.lossBufferShare + CONFIG.bonusPotShare;
      if (_splitSum > 1.01) {
        const _s = 1.0 / _splitSum;
        CONFIG.bankrollShare   = Math.round(CONFIG.bankrollShare   * _s * 1000) / 1000;
        CONFIG.lossBufferShare = Math.round(CONFIG.lossBufferShare * _s * 1000) / 1000;
        CONFIG.bonusPotShare   = Math.round((1.0 - CONFIG.bankrollShare - CONFIG.lossBufferShare) * 1000) / 1000;
        log('⚠️ [Safety] Split overflow normalized: ' + CONFIG.bankrollShare + '/' + CONFIG.lossBufferShare + '/' + CONFIG.bonusPotShare);
      }
      // betMultiplier hard cap
      if (CONFIG.betMultiplier !== undefined) CONFIG.betMultiplier = Math.min(Math.max(CONFIG.betMultiplier, 1.0), 2.5);
      // normalMines hard cap
      if (CONFIG.normalMines !== undefined) CONFIG.normalMines = Math.min(Math.max(Math.round(CONFIG.normalMines), 3), 14);
      // resetBank floors
      if (CONFIG.resetBank1 !== undefined) CONFIG.resetBank1 = Math.max(CONFIG.resetBank1, 50);
      if (CONFIG.resetBank3 !== undefined) CONFIG.resetBank3 = Math.max(CONFIG.resetBank3, 200);
      log('   📊 Split: bank=' + (CONFIG.bankrollShare*100).toFixed(0) + '% buf=' + (CONFIG.lossBufferShare*100).toFixed(0) + '% pots=' + (CONFIG.bonusPotShare*100).toFixed(0) + '% (each=' + (CONFIG.bonusPotShare/5*100).toFixed(1) + '%)');
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
    log('🎯 [PRE-LOSS] 1x $' + betAmt.toFixed(2) + ' on 40/49 before recovery');
    for (let i = 0; i < 1; i++) {
      try {
        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: 49, mines: Math.max(25, CONFIG.preLossMines || 25), betAmount: betAmt, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ [PRE-LOSS] ' + bet.error); await delay(CONFIG.delayMs); continue; }
        const tile    = Math.floor(Math.random() * 49);
        let   reveal  = await api('/v1/games/mines/reveal', 'POST', { index: tile });
        if (reveal.error) { log('❌ [PRE-LOSS] ' + reveal.error); await delay(CONFIG.delayMs); continue; }
        if (reveal.cell === 'M') {
          state.bankroll -= betAmt;
          state.losses++;
          state.session.totalBetted += betAmt;
          state.session.totalLost   += betAmt;
          if (state.bankroll < state.session.lowestBankroll) state.session.lowestBankroll = state.bankroll;
          log('💣 [PRE-LOSS] ' + (i+1) + '/1 LOSS | bank:$' + state.bankroll.toFixed(2));
        } else {
          // 2nd reveal for higher multiplier (25m/2rev=4.22x vs 1rev=2.03x)
          const tile2 = Math.floor(Math.random() * 49);
          if (tile2 !== tile) {
            const rev2 = await api('/v1/games/mines/reveal', 'POST', { index: tile2 });
            if (rev2 && !rev2.error && rev2.cell !== 'M') { reveal = rev2; }
          }
          await api('/v1/games/mines/cashout');
          const profit      = (betAmt * reveal.multiplier) - betAmt;
          const bufferShare = Math.round(profit * CONFIG.lossBufferShare * 10000) / 10000;
          const keepShare   = Math.round(profit * CONFIG.bankrollShare   * 10000) / 10000;
          const potShare    = Math.round(profit * (CONFIG.bonusPotShare / 5) * 10000) / 10000;
          state.bankroll   += keepShare;
          state.lossBuffer += bufferShare;
          state.bonusPots.forEach((_, i) => { state.bonusPots[i] += potShare; });
          state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);
          state.wins++;
          log('💎 [PRE-LOSS] ' + (i+1) + '/1 WIN x' + reveal.multiplier + ' +$' + profit.toFixed(4) + ' | bank:$' + state.bankroll.toFixed(2));
          const plProfit = keepShare;
          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.streakBaseBet = 0;
          state.mineTiles.clear();
          pushLog({ round: state.rounds+1, result: '🎯💎', baseBet: getBaseBet().toFixed(2),
            bet: betAmt.toFixed(2), tile: tile, multiplier: reveal.multiplier,
            profit: plProfit.toFixed(4), bankroll: state.bankroll.toFixed(2),
            conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2),
            lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'PreLoss', type: 'PRELOSS WIN' });
          await delay(CONFIG.delayMs);
          return true;
        }
      } catch(e) { log('❌ [PRE-LOSS] ' + e.message); }
      await delay(CONFIG.delayMs);
    }
    log('🔄 [PRE-LOSS] Failed → recovery chain');
    return false;
  };

  // ── Lucky Shot: $2 greedy multi-reveal (post-bonus) ─────────
  // Mimics screenshot: 25-tile board, 3 mines, reveal all safe tiles greedily
  // $2 flat bet, cashout only if mine hit or all safe tiles revealed
  const runLuckyShot = async () => {
       const LS_BET   = CONFIG.luckyBet !== undefined ? CONFIG.luckyBet : 2.00;
    const LS_TILES = 25;
    const LS_MINES = 8;
    const safeTiles = LS_TILES - LS_MINES; // 17 safe tiles
    log(['🍀 ====== LUCKY SHOT ======',
      'Board: ' + LS_TILES + ' tiles / ' + LS_MINES + ' mines | Bet: $' + LS_BET.toFixed(2),
      'Strategy: reveal ALL safe tiles (greedy) | Max mult ~x' + (safeTiles) + '+',
      'Bank: $' + state.bankroll.toFixed(2),
      '========================='].join('\n'));

    if (state.bankroll < LS_BET) {
      log('🍀 [Lucky Shot] Skipped — insufficient bank ($' + state.bankroll.toFixed(2) + ')');
      return;
    }

    try {
      const bet = await api('/v1/games/mines/new-game', 'POST', {
        tiles: LS_TILES, mines: LS_MINES,
        betAmount: LS_BET, balanceType: false, currency: 'USD',
      });
      if (bet.error) { log('❌ [Lucky Shot] Bet error: ' + bet.error); return; }

      const revealed = new Set();
      let busted     = false;
      let lastMult   = 1;

      // Random cashout target between 12 and 17 reveals
      const stopMin = Math.max(1, Math.min(CONFIG.luckyStopMin || 10, safeTiles));
      const stopMax = Math.max(stopMin, Math.min(CONFIG.luckyStopMax || 17, safeTiles));
      const stopAt = stopMin + Math.floor(Math.random() * (stopMax - stopMin + 1));
      log('🍀 [Lucky Shot] Target: ' + stopAt + ' reveals before cashout');

      // Reveal tiles one by one until mine or stopAt reached
      for (let attempt = 0; attempt < stopAt; attempt++) {
        // Pick a random tile not yet revealed
        const available = [];
        for (let i = 0; i < LS_TILES; i++) { if (!revealed.has(i)) available.push(i); }
        if (available.length === 0) break;
        const tileIndex = available[Math.floor(Math.random() * available.length)];

        const reveal = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
        if (reveal.error) { log('❌ [Lucky Shot] Reveal error: ' + reveal.error); break; }

        if (reveal.cell === 'M') {
          const { bankrollLoss: lsBankrollLoss } = applyLoss(LS_BET);
          state.session.totalBetted += LS_BET;
          state.session.totalLost   += LS_BET;
          if (LS_BET > state.session.biggestLoss) state.session.biggestLoss = LS_BET;
          busted = true;
          updateTileStats(tileIndex, true);
          log('💣 [Lucky Shot] Mine on reveal ' + (attempt+1) + ' | -$' + LS_BET.toFixed(2) +
              ' | Bank: $' + state.bankroll.toFixed(2));
          pushLog({ round: state.rounds, result: '🍀💣', baseBet: '-', bet: LS_BET.toFixed(2),
            tile: tileIndex, multiplier: '-', profit: (-LS_BET).toFixed(4),
            bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0',
            bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2),
            tierLabel: 'LUCKY SHOT', type: 'LUCKY SHOT BUST (reveal ' + (attempt+1) + ')' });
          break;
        }

        revealed.add(tileIndex);
        updateTileStats(tileIndex, false);
        lastMult = reveal.multiplier || lastMult;
        log('💎 [Lucky Shot] Reveal ' + (attempt+1) + '/' + stopAt +
            ' | mult x' + lastMult + ' | tile ' + tileIndex);
        await delay(400); // fast inner delay between reveals
      }

      if (!busted) {
        // Cashout after revealing all safe tiles
        const cashout = await api('/v1/games/mines/cashout');
        if (cashout.error) { log('❌ [Lucky Shot] Cashout error: ' + cashout.error); return; }
        const profit      = (LS_BET * lastMult) - LS_BET;
        const lsKeep      = Math.round(profit * CONFIG.bankrollShare   * 10000) / 10000;
        const lsBuffer    = Math.round(profit * CONFIG.lossBufferShare  * 10000) / 10000;
        const lsPot       = Math.round(profit * (CONFIG.bonusPotShare / 5) * 10000) / 10000;
        state.bankroll   += lsKeep;
        state.lossBuffer += lsBuffer;
        state.bonusPots.forEach((_, i) => { state.bonusPots[i] += lsPot; });
        state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);
        state.session.totalBetted += LS_BET;
        state.session.totalWon    += profit;
        if (lsKeep > state.session.biggestWin) state.session.biggestWin = lsKeep;
        // Big win: boost bets for next 30 rounds to compound gains
        if (profit >= 50 && state.bankroll >= 100) {
          const boost = Math.min(CONFIG.betMultiplier * 1.3, 2.0);
          log('🚀 [PostLS] Big win $' + profit.toFixed(2) + ' — boosting betMultiplier ' + CONFIG.betMultiplier + '→' + boost + ' for 30 rounds');
          CONFIG.betMultiplier = boost;
          state.aggressiveBoostRounds = 30;
        }
        if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;
        log(['🎉🍀 LUCKY SHOT WON! ' + revealed.size + '/' + stopAt + ' gems revealed!',
          'Mult: x' + lastMult + ' | Profit: +$' + profit.toFixed(2),
          'bank+$' + lsKeep.toFixed(2) + ' | buf+$' + lsBuffer.toFixed(2) + ' | pots+$' + (lsPot*5).toFixed(2),
          'Bank: $' + state.bankroll.toFixed(2)].join('\n'));
        pushLog({ round: state.rounds, result: '🍀🎉', baseBet: '-', bet: LS_BET.toFixed(2),
          tile: '-', multiplier: lastMult, profit: profit.toFixed(4),
          bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0',
          bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2),
          tierLabel: 'LUCKY SHOT', type: 'LUCKY SHOT WIN (' + revealed.size + '/' + stopAt + ' gems)' });
        saveState();
      }
    } catch (e) { log('❌ [Lucky Shot] Error: ' + e.message); }
  };

  // ── Bonus Round ───────────────────────────────────────────────
  const placeBonusBet = async (overrideBet, potIndex) => {
    const potBalance = potIndex !== undefined ? state.bonusPots[potIndex] : state.bonusPot;
    const BONUS_BET = Math.min(overrideBet !== undefined ? overrideBet : getDynBonusBet(), potBalance);
    const _ladder = getBonusLadder();
    const bonusTierIdx = potIndex !== undefined ? potIndex : _ladder.findIndex(b => b.bet === (overrideBet || getDynBonusBet()));
    const bonusTier = bonusTierIdx + 1;
    const tierStats = state.bonusByTier[bonusTierIdx] || state.bonusByTier[4];
    log(['🎰 ====== BONUS #' + bonusTier + '/5 TRIGGERED ======',
      'Pot: $' + state.bonusPot.toFixed(2) + ' | Bet: $' + BONUS_BET.toFixed(2),
      'Board: ' + CONFIG.bonusTiles + ' tiles / ' + CONFIG.bonusMines + ' mines (39/49)',
      'Buffer: $' + state.lossBuffer.toFixed(2),
      'Win: ~20.4% | Prize: ~$' + (BONUS_BET * 4.6).toFixed(2),
      (overrideBet === 10 ? '🍀 Lucky Shot fires after this!' : ''),
      '================================'].join('\n'));
    try {
      const bet = await api('/v1/games/mines/new-game', 'POST', {
        tiles: CONFIG.bonusTiles, mines: CONFIG.bonusMines,
        betAmount: BONUS_BET, balanceType: false, currency: 'USD',
      });
      if (bet.error) { log('❌ Bonus bet error: ' + bet.error + ' — pot preserved'); return; }

      // Multi-reveal: 20m/2rev gives best bonus EV
      const bonusRevCount = CONFIG.bonusReveals || 2;
      const bonusRevTiles = new Set();
      let lastReveal = null;
      for (let br = 0; br < bonusRevCount; br++) {
        const avail = [];
        for (let t = 0; t < CONFIG.bonusTiles; t++) if (!bonusRevTiles.has(t)) avail.push(t);
        if (!avail.length) break;
        const bTile = avail[Math.floor(Math.random() * avail.length)];
        bonusRevTiles.add(bTile);
        lastReveal = await api('/v1/games/mines/reveal', 'POST', { index: bTile });
        if (!lastReveal || lastReveal.cell === 'M') break;
      }
      const tileIndex = bonusRevTiles.size > 0 ? [...bonusRevTiles][0] : 0;
      const reveal    = lastReveal;
      if (reveal.error) { log('❌ Bonus reveal error: ' + reveal.error); return; }

      state.bonusRounds++;
      if (reveal.cell === 'M') {
        state.bankroll -= BONUS_BET;
        state.session.totalBetted += BONUS_BET;
        state.session.totalLost   += BONUS_BET;
        if (BONUS_BET > state.session.biggestLoss) state.session.biggestLoss = BONUS_BET;
        state.bonusPot  = 0;
        state.bonusPots[bonusTierIdx] = 0;
        state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);
        state.bonusLosses++;
        tierStats.rounds++; tierStats.losses++; tierStats.profit -= BONUS_BET;
        updateTileStats(tileIndex, true);
        log('💣 BONUS #' + bonusTier + ' LOST! | -$' + BONUS_BET.toFixed(2) + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds, result: '🎰💣', baseBet: '-', bet: BONUS_BET.toFixed(2), tile: tileIndex, multiplier: '-', profit: (-BONUS_BET).toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: state.tierLosses, streakLoss: state.lossStreakAmount.toFixed(2), bonusPot: '0.00', lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'BONUS', type: 'BONUS LOSS' });
      } else {
        await api('/v1/games/mines/cashout');
        const profit    = (BONUS_BET * reveal.multiplier) - BONUS_BET;
        state.bankroll += profit;
        state.session.totalBetted += BONUS_BET;
        state.session.totalWon    += profit;
        if (profit > state.session.biggestWin) state.session.biggestWin = profit;
        state.bonusPot  = 0;
        state.bonusPots[bonusTierIdx] = 0;
        state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);
        state.bonusWins++;
        state.bonusProfit += profit;
        tierStats.rounds++; tierStats.wins++; tierStats.profit += profit;
        updateTileStats(tileIndex, false);
        // Bonus #5 win → fire Claude mode once (non-blocking, no loop risk)
        if (bonusTierIdx === 4 && CONFIG.claudeModeEnabled !== false) {
          log('🤖 [Bonus #5 WIN] Triggering Claude mode (target: $' + (CONFIG.claudeModeTarget||200) + ')...');
          setTimeout(async () => {
            if (!state.running) return;  // bot stopped — skip
            await window.runClaudeMode().catch(e => {
              log('🤖 [Claude mode] Error: ' + e.message);
              state.claudeModeRunning = false;  // ensure cleared on error
            });
            // Sync real balance back into runBot after Claude mode
            try {
              state.bankroll = await getRealBankroll();
              log('🔄 [runBot] Balance synced after Claude mode: $' + state.bankroll.toFixed(2));
            } catch(e) { log('🔄 Sync after Claude mode failed: ' + e.message); }
          }, CONFIG.delayMs + 500);
        }
        if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;
        log('🎉 BONUS #' + bonusTier + ' WON! +$' + profit.toFixed(2) + ' x' + reveal.multiplier + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds, result: '🎰🎉', baseBet: '-', bet: BONUS_BET.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: profit.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: '0.00', lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'BONUS', type: 'BONUS WIN' });
      }
      saveState();
    } catch (e) { log('❌ Bonus error: ' + e.message); }
  };

  // ── Hail Mary ────────────────────────────────────────────────
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
        const profit      = (tier.flatBet * reveal.multiplier) - tier.flatBet;
        // Split profit same as normal win: 30% bankroll, 40% pots, 30% buffer
        const hmKeep      = Math.round(profit * CONFIG.bankrollShare   * 10000) / 10000;
        const hmBuffer    = Math.round(profit * CONFIG.lossBufferShare  * 10000) / 10000;
        const hmPot       = Math.round(profit * (CONFIG.bonusPotShare / 5) * 10000) / 10000;
        state.bankroll   += hmKeep;
        state.lossBuffer += hmBuffer;
        state.bonusPots.forEach((_, i) => { state.bonusPots[i] += hmPot; });
        state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);
        state.hailMaryWins++;
        state.session.totalBetted += tier.flatBet;
        state.session.totalWon    += profit;
        updateTileStats(tileIndex, false);
        if (hmKeep > state.session.biggestWin) state.session.biggestWin = hmKeep;
        if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;
        log('🔥 HAIL MARY WON! +$' + profit.toFixed(2) + ' x' + reveal.multiplier +
            ' | bank+$' + hmKeep.toFixed(2) + ' buf+$' + hmBuffer.toFixed(2) +
            ' pot+$' + (hmPot*5).toFixed(2) + ' | Bank: $' + state.bankroll.toFixed(2));
        pushLog({ round: state.rounds+1, result: '🔥💎', baseBet: getBaseBet().toFixed(2), bet: tier.flatBet.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: profit.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'HAIL MARY T7', type: 'HAIL MARY WIN' });
        return true;
      }
    } catch (e) { log('❌ Hail Mary error: ' + e.message); return false; }
  };

  // ════════════════════════════════════════════════════════════
  //  CLAUDE AUTONOMOUS MODE
  // ════════════════════════════════════════════════════════════
  const CLAUDE_MODE_CONFIG = {
    startingBankroll: 20.00,
    get targetBankroll() { return CONFIG.claudeModeTarget || 200; },
    stopLoss:         10.00,
    tuneEveryN:       10,
  };

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
- 5 mines/1 gem = 1.26x (89.8% win) — very safe
- 24 mines/1 gem = 4.9x (51.0% win) — aggressive

MISSION: Grow $${CLAUDE_MODE_CONFIG.startingBankroll} → $${CLAUDE_MODE_CONFIG.targetBankroll}
STOP FLOOR: $${(cmState.startBalance - 20).toFixed(2)} (stop if down $20 from $${cmState.startBalance.toFixed(2)})

SESSION STATE:
- Balance:   $${cmState.balance.toFixed(2)}
- Progress:  ${progress}% of target
- Bets:      ${cmState.bets}  Wins: ${cmState.wins}  Losses: ${cmState.losses}
- Win rate:  ${winRate}%
- Streak:    ${cmState.streak > 0 ? '+' + cmState.streak + ' wins' : cmState.streak + ' losses'}
- Net P/L:   $${(cmState.balance - CLAUDE_MODE_CONFIG.startingBankroll).toFixed(2)}

PAST SESSION HISTORY:
${JSON.stringify(sessionHistory.slice(0, 2), null, 2)}

RECENT BETS:
${recent || 'none yet'}

HARD CONSTRAINTS (never violate):
- Cumulative loss budget per tier exit: T2≤$4 | T3≤$15 | T4≤$35 | T5≤$60 | T7≤$70
- Current targets achieve this: [0, 0.10, 1.00, 0.36, 15.00, 24.00, 0, 0]
- If you change recoveryTargets verify: T1_bet+T2_bet≤$3.80, T3_bet≤$10.05, T4_bet≤$19.60, T5_bet≤$24.41
- Recovery at each tier MUST net positive profit (covers all previous losses + target amount)

DECISION RULES:
- Winning streak >= 5: increase mines by 2-3, increase bet up to 8% of balance
- Losing streak >= 3: reduce mines to 3-5, reduce bet to 2-3% of balance
- Normal: bet 3-5% of balance, mines 3-7
- Max single bet: 10% of balance ($${(cmState.balance * 0.10).toFixed(2)})
- Min bet: $0.10

Respond ONLY with valid JSON:
{
  "betAmount": <number>,
  "mines": <number 3-24>,
  "gemsTarget": 1,
  "action": "bet" | "stop",
  "reason": "<one sentence>"
}`;
  };

  window.runClaudeMode = async () => {
    if (state.claudeModeRunning) {
      log('🤖 [Claude mode] Already running — skipping duplicate launch');
      return;
    }
    state.claudeModeRunning = true;
    const realStart = await getRealBankroll();
    const maxLoss   = 20.00;  // stop if down $20 from real start balance
    const stopFloor = Math.max(0.10, realStart - maxLoss);

    log([
      '🤖 ════ CLAUDE AUTONOMOUS MODE ════',
      '💰 Real start balance: $' + realStart.toFixed(2),
      '🎯 Target: $' + (CONFIG.claudeModeTarget || 200),
      '🛑 Stop if balance drops to: $' + stopFloor.toFixed(2) + ' (loss of $' + maxLoss.toFixed(2) + ')',
    ].join('\n'));

    if (realStart <= stopFloor) {
      log('🛑 Already at or below stop floor — aborting'); return;
    }

    const cmState = {
      balance:      realStart,
      startBalance: realStart,
      bets: 0, wins: 0, losses: 0, streak: 0,
      history: [], decisions: [],
      lastRealSync: Date.now(),
    };

    let currentPlay = { betAmount: 0.10, mines: 3, gemsTarget: 1 };
    const sessionHistory = loadSessionHistory();
    const target = CONFIG.claudeModeTarget || 200;

    while (true) {
      // ── Stop conditions ─────────────────────────────────
      if (cmState.balance >= target) {
        log('🎯 TARGET $' + target + ' reached! Balance: $' + cmState.balance.toFixed(2)); break;
      }
      if (cmState.balance <= stopFloor) {
        log('🛑 STOP LOSS — down $' + (cmState.startBalance - cmState.balance).toFixed(2) +
            ' | Balance: $' + cmState.balance.toFixed(2) + ' | Floor: $' + stopFloor.toFixed(2)); break;
      }

      // ── Sync real balance every 20 bets ─────────────────
      if (cmState.bets > 0 && cmState.bets % 20 === 0) {
        try {
          const realBal = await getRealBankroll();
          const drift   = Math.abs(realBal - cmState.balance);
          if (drift > 0.50) {
            log('🔄 [CM] Balance synced: internal $' + cmState.balance.toFixed(2) +
                ' → real $' + realBal.toFixed(2) + ' (drift: $' + drift.toFixed(2) + ')');
            cmState.balance = realBal;
          }
          // Re-check stop after sync
          if (cmState.balance <= stopFloor) {
            log('🛑 STOP LOSS after sync — real balance $' + cmState.balance.toFixed(2)); break;
          }
        } catch(e) { log('🔄 [CM] Sync failed: ' + e.message); }
      }

      // ── Consult Claude every N bets ──────────────────────
      if (cmState.bets === 0 || cmState.bets % CLAUDE_MODE_CONFIG.tuneEveryN === 0) {
        try {
          const decision = await askClaudeDirect(buildClaudeAutoPrompt(cmState, sessionHistory));
          if (decision.action === 'stop') { log('🤖 Claude says STOP — ' + decision.reason); break; }
          const prevBet   = currentPlay.betAmount;
          const prevMines = currentPlay.mines;
          currentPlay.betAmount = Math.max(0.10, Math.min(parseFloat(decision.betAmount) || 0.10, cmState.balance * 0.10));
          currentPlay.mines = Math.max(3, Math.min(24, parseInt(decision.mines) || 3));
          const changes = [];
          if (Math.abs(prevBet - currentPlay.betAmount) > 0.001)
            changes.push('bet: $' + prevBet.toFixed(2) + ' → $' + currentPlay.betAmount.toFixed(2));
          if (prevMines !== currentPlay.mines)
            changes.push('mines: ' + prevMines + ' → ' + currentPlay.mines);
          cmState.decisions.push({
            bet: cmState.bets, changes: changes.join(', ') || 'no change',
            reason: decision.reason, balance: cmState.balance.toFixed(2),
          });
          log('🤖 ' + (changes.length ? changes.join(' | ') : 'no change'));
          log('💭 ' + decision.reason);
          log('📊 P/L: $' + (cmState.balance - cmState.startBalance).toFixed(2) +
              ' | Floor: $' + stopFloor.toFixed(2) +
              ' | Remaining: $' + (cmState.balance - stopFloor).toFixed(2));
          if (cmState.decisions.length > 1) table(cmState.decisions.slice(-3));
        } catch (e) { log('🤖 API error: ' + e.message + ' — using last params'); }
      }

      // ── Place bet ────────────────────────────────────────
      try {
        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: 49, mines: currentPlay.mines,
          betAmount: currentPlay.betAmount, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ ' + bet.error); await delay(3000); continue; }

        const tileIndex = Math.floor(Math.random() * 49);
        const reveal    = await api('/v1/games/mines/reveal', 'POST', { index: tileIndex });
        if (reveal.error) { log('❌ ' + reveal.error); await delay(3000); continue; }

        cmState.bets++;
        if (reveal.cell === 'M') {
          cmState.balance -= currentPlay.betAmount;
          cmState.losses++;
          cmState.streak = cmState.streak > 0 ? -1 : cmState.streak - 1;
          cmState.history.push({ win: false, mines: currentPlay.mines, bet: currentPlay.betAmount, profit: -currentPlay.betAmount });
          log('💣 [CM #' + cmState.bets + '] LOSS | $' + cmState.balance.toFixed(2) +
              ' | streak:' + cmState.streak +
              ' | P/L:$' + (cmState.balance - cmState.startBalance).toFixed(2));
        } else {
          await api('/v1/games/mines/cashout');
          const profit = (currentPlay.betAmount * reveal.multiplier) - currentPlay.betAmount;
          cmState.balance += profit;
          cmState.wins++;
          cmState.streak = cmState.streak < 0 ? 1 : cmState.streak + 1;
          cmState.history.push({ win: true, mines: currentPlay.mines, bet: currentPlay.betAmount, profit });
          log('💎 [CM #' + cmState.bets + '] WIN x' + reveal.multiplier +
              ' +$' + profit.toFixed(4) + ' | $' + cmState.balance.toFixed(2) +
              ' | streak:+' + cmState.streak);
        }
        if (cmState.history.length > 50) cmState.history.shift();
      } catch (e) {
        log('❌ [CM] ' + e.message);
        await dynamicGridRecovery();
      }
      await delay(CONFIG.delayMs);
    }

    // ── Claude mode ended — resume runBot ──────────────────
    state.claudeModeRunning = false;
    log('▶️  [Claude mode] Ended — runBot resuming...');

    // ── Final real balance sync ──────────────────────────
    let finalBal = cmState.balance;
    try { finalBal = await getRealBankroll(); } catch(e) {}

    log([
      '🏁 ════ CLAUDE MODE DONE ════',
      '💰 Start:  $' + cmState.startBalance.toFixed(2),
      '💰 Final:  $' + finalBal.toFixed(2),
      '💹 P/L:    $' + (finalBal - cmState.startBalance).toFixed(2),
      '🎮 Bets:   ' + cmState.bets + ' | Wins: ' + cmState.wins + ' | Losses: ' + cmState.losses,
      '📊 Win rate: ' + (cmState.bets ? (cmState.wins/cmState.bets*100).toFixed(1) + '%' : 'n/a'),
    ].join('\n'));
  };

  // ── Watchdog ─────────────────────────────────────────────────
  let _watchdogTimer = null;

  let _watchdogFailCount = 0;
  const WATCHDOG_MAX_FAILS = 3;  // consecutive API failures before treating as dead

  window.startWatchdog = () => {
    if (_watchdogTimer) { log('👁️ Watchdog already running'); return; }
    _watchdogFailCount = 0;
    log('👁️ Watchdog started — checks every 10s, restarts after ' + WATCHDOG_MAX_FAILS + ' consecutive failures');
    _watchdogTimer = setInterval(async () => {
      if (!state.running) return;

      let bal = null;
      try {
        bal = await getRealBankroll();
        _watchdogFailCount = 0;  // reset on success
      } catch (e) {
        _watchdogFailCount++;
        log('👁️ [Watchdog] API fail #' + _watchdogFailCount + '/' + WATCHDOG_MAX_FAILS + ': ' + e.message);
        if (_watchdogFailCount < WATCHDOG_MAX_FAILS) return;  // wait for more failures before acting
        log('👁️ [Watchdog] ' + WATCHDOG_MAX_FAILS + ' consecutive failures — attempting restart...');
        bal = 0;  // treat as dead after repeated failures
      }

      // Sanity check: 0 balance could be connection issue, not actual bust
      // Only restart if bal is explicitly <= minBet AND not null (caught above)
      if (bal === null || bal === undefined) return;

      if (bal <= CONFIG.minBet) {
        // Don't restart while Claude mode is active
        if (state.claudeModeRunning) {
          log('👁️ [Watchdog] Balance low but Claude mode running — skipping restart');
          return;
        }
        if (_watchdogFailCount >= WATCHDOG_MAX_FAILS) {
          log('👁️ [Watchdog] Connection lost — attempting page recovery...');
        } else {
          log('👁️ [Watchdog] Balance $' + bal.toFixed(2) + ' ≤ min $' + CONFIG.minBet + ' — restarting in 5s...');
        }
        clearInterval(_watchdogTimer); _watchdogTimer = null; state.running = false;
        await delay(5000);

        // Verify balance is still dead before full reset (avoids false restart)
        let verifyBal = null;
        try { verifyBal = await getRealBankroll(); } catch(e) { verifyBal = null; }

        // Retry for up to 1 hour (120 × 30s attempts)
        const MAX_RETRIES = 120;
        let retries = 0;
        while (verifyBal === null && retries < MAX_RETRIES) {
          retries++;
          log('👁️ [Watchdog] No connection — retry ' + retries + '/' + MAX_RETRIES + ' in 30s...');
          await delay(30000);
          try { verifyBal = await getRealBankroll(); } catch(e) { verifyBal = null; }
          if (verifyBal !== null) {
            log('👁️ [Watchdog] Connection restored after ' + (retries * 30) + 's!');
          }
        }

        if (verifyBal === null) {
          log('👁️ [Watchdog] Connection still down after 1hr — giving up. Run runBot() manually when back online.');
          return;
        }

        if (verifyBal > CONFIG.minBet) {
          log('👁️ [Watchdog] Balance recovered: $' + verifyBal.toFixed(2) + ' — false alarm, restarting normally.');
        } else {
          log('👁️ [Watchdog] Balance confirmed dead: $' + verifyBal.toFixed(2) + ' — full reset.');
          state.tier = 0; state.tierLosses = 0; state.lossStreakAmount = 0;
          state.t3aStreakSnapshot = 0; state.lossBuffer = 0; state.mineTiles.clear();
        }

        _watchdogFailCount = 0;
        log('👁️ [Watchdog] Restarting runBot(autoResume=true)...');
        window.runBot(true);
        window.startWatchdog();  // restart watchdog after bot resumes
      }
    }, 10000);
  };

  window.stopWatchdog = () => {
    if (_watchdogTimer) { clearInterval(_watchdogTimer); _watchdogTimer = null; }
    log('👁️ Watchdog stopped');
  };

  // ── setBet / setTarget ────────────────────────────────────────
  window.setBet = (newBaseBet) => {
    if (typeof newBaseBet !== 'number' || newBaseBet < 0.10 || newBaseBet > 10) {
      log('❌ setBet: must be 0.10–10'); return;
    }
    const ratio = newBaseBet / 0.10;
    CONFIG.baseBet = newBaseBet; CONFIG.minBet = newBaseBet;
    const base = [
      { upTo: 100,  bet: 0.10 },{ upTo: 150,  bet: 0.20 },{ upTo: 250,  bet: 0.30 },
      { upTo: 350,  bet: 0.40 },{ upTo: 450,  bet: 0.50 },{ upTo: 550,  bet: 0.60 },
      { upTo: 650,  bet: 0.70 },{ upTo: 750,  bet: 0.80 },{ upTo: 850,  bet: 0.90 },
      { upTo: 950,  bet: 1.00 },{ upTo: 1050, bet: 1.10 },{ upTo: 1150, bet: 1.20 },
      { upTo: 1250, bet: 1.30 },{ upTo: 1350, bet: 1.40 },{ upTo: 1450, bet: 1.50 },
      { upTo: 1550, bet: 1.60 },{ upTo: 1650, bet: 1.70 },{ upTo: 1750, bet: 1.80 },
      { upTo: 1850, bet: 1.90 },{ upTo: 1950, bet: 2.00 },
    ];
    CONFIG.betTiers = base.map(t => ({ upTo: Math.round(t.upTo * ratio), bet: Math.round(t.bet * ratio * 100) / 100 }));
    log('✅ [setBet] Base bet: $' + newBaseBet.toFixed(2) + ' | current: $' + getBaseBet().toFixed(2));
    log('   New bet ladder:');
    CONFIG.betTiers.forEach(t => log('     balance ≤ $' + t.upTo + '  →  bet $' + t.bet.toFixed(2)));
  };

  window.setTarget = (amount) => {
    if (typeof amount !== 'number' || amount < 1) { log('❌ setTarget: must be >1'); return; }
    CONFIG.targetBankroll = amount;
    log('✅ setTarget: $' + amount);
  };

  // ── Stats ─────────────────────────────────────────────────────
  // Expose internals to console for debugging
  window._CONFIG = CONFIG;
  window._state  = state;
  window._TIERS  = TIERS;

  // Snapshot of defaults to detect AI changes
  const _CONFIG_DEFAULTS = {
    normalMines: 10, betMultiplier: 1.0, maxBetPct: 0.20, delayMs: 3000,
    tileStatWeight: 0.70, resetBank1: 100, resetBank2: 400,
    preLossEnabled: true, preLossMines: 25,
    normalMines: 12, luckyBet: 2.00, luckyStopMin: 10, luckyStopMax: 17,
    claudeModeTarget: 200, claudeModeEnabled: true,
    bankrollShare: 0.30, lossBufferShare: 0.30, bonusPotShare: 0.40,
    recoveryTargets: [0, 0.10, 0.40, 1.20, 3.60, 10.80, 0, 0],
  };
  const _CHAIN_DEFAULTS = { mines: {1:8,2:8,3:15,4:20,5:35,6:40,7:45}, reveals: {1:2,2:3,3:2,4:3,5:3}, enabled: {1:true,2:true,3:true,4:true,5:true,6:true,7:true}, flatBet: {6:5.00,7:5.00} };

  window.showChanges = () => {
    const changes = [];

    // Scalar params
    for (const [k, def] of Object.entries(_CONFIG_DEFAULTS)) {
      const cur = CONFIG[k];
      if (k === 'recoveryTargets') {
        const t = CONFIG.recoveryTargets || def;
        const diffs = def.map((d,i) => Math.abs((t[i]||0)-d) > 0.001 ? 'T'+i+':'+d+'→'+t[i] : null).filter(Boolean);
        if (diffs.length) changes.push({ param: 'recoveryTargets', default: def.join(','), current: t.join(','), changed: diffs.join(' | ') });
      } else if (typeof def === 'number') {
        if (Math.abs((cur||def) - def) > 0.001) changes.push({ param: k, default: def, current: cur, delta: ((cur-def)>=0?'+':'')+(cur-def).toFixed(3) });
      } else if (typeof def === 'boolean') {
        if (cur !== def) changes.push({ param: k, default: def, current: cur, delta: def+'→'+cur });
      }
    }

    // Recovery chain
    (CONFIG.recoveryChain||[]).forEach(c => {
      if (c.enabled !== _CHAIN_DEFAULTS.enabled[c.id])
        changes.push({ param: 'chain['+c.id+'] '+c.label+' enabled', default: _CHAIN_DEFAULTS.enabled[c.id], current: c.enabled, delta: _CHAIN_DEFAULTS.enabled[c.id]+'→'+c.enabled });
      if (Math.abs(c.mines - _CHAIN_DEFAULTS.mines[c.id]) > 0)
        changes.push({ param: 'chain['+c.id+'] '+c.label+' mines', default: _CHAIN_DEFAULTS.mines[c.id], current: c.mines, delta: _CHAIN_DEFAULTS.mines[c.id]+'→'+c.mines });
      if (_CHAIN_DEFAULTS.flatBet[c.id] !== undefined && Math.abs((c.flatBet||0) - _CHAIN_DEFAULTS.flatBet[c.id]) > 0.001)
        changes.push({ param: 'chain['+c.id+'] '+c.label+' flatBet', default: _CHAIN_DEFAULTS.flatBet[c.id], current: c.flatBet, delta: _CHAIN_DEFAULTS.flatBet[c.id]+'→'+c.flatBet });
    });

    if (changes.length === 0) {
      console.warn('✅ No AI changes — all values at default');
    } else {
      console.warn('🤖 AI has changed ' + changes.length + ' param(s):');
      console.table(changes);
    }
  };

  window.printStats = () => {
    const mins    = ((Date.now() - state.startTime) / 60000).toFixed(1);
    const winRate = state.rounds ? (state.wins / state.rounds * 100).toFixed(1) : '0.0';
    const net     = (state.bankroll - state.session.startBankroll).toFixed(2);
    const progress= ((state.bankroll / CONFIG.targetBankroll) * 100).toFixed(1);
    const safest  = [...tileStats].filter(t => t.picks > 0).sort((a, b) => a.mineRate - b.mineRate).slice(0, 5)
      .map(t => 'tile' + t.index + '(' + (t.mineRate*100).toFixed(0) + '%)').join(', ');
    const curTier = TIERS[state.tier];
    const drawdown = state.launchBankroll > 0
      ? ((1 - state.bankroll / state.launchBankroll) * 100).toFixed(1) + '%'
      : 'n/a';
    const avgBet = state.rounds ? (state.session.totalBetted / state.rounds).toFixed(2) : '0.00';
    log([
      '📊 =========== STATS ' + VERSION + ' ===========',
      '⏱️  Time:            ' + mins + 'm',
      '💰 Bankroll:        $' + state.bankroll.toFixed(2) + ' (' + progress + '% of $' + CONFIG.targetBankroll + ')',
      '📌 Launch:          $' + (state.launchBankroll||0).toFixed(2) + ' | Drawdown: ' + drawdown,
      '📈 Peak:            $' + state.peakBankroll.toFixed(2),
      '💹 Net P/L:         ' + (net >= 0 ? '+' : '') + '$' + net,
      '💵 Base Bet:        $' + getBaseBet().toFixed(2),
      '🎰 Bonus Pots:      ' + (() => { const l = getBonusLadder(); return state.bonusPots.map((p,i) =>
        '#' + (i+1) + ':$' + p.toFixed(2) + '/$' + l[i].threshold +
        (p >= l[i].threshold ? '🔥' : '')
      ).join(' | '); })(),
      '🛡️  Loss Buffer:     $' + state.lossBuffer.toFixed(2),
      '🔢 Buffer Absorbs:  ' + state.bufferAbsorbs,
      '📍 Current Tier:    ' + (curTier ? curTier.label : 'RESET'),
      '💸 Streak Loss:     $' + state.lossStreakAmount.toFixed(2),
      '🔄 Resets:          ' + state.resets,
      '─────────────── BONUS LADDER ────────────────',
      ...(() => { const l = getBonusLadder(); return state.bonusByTier.map((t,i) =>
        '  #' + (i+1) + ' $' + l[i].bet.toFixed(0) + 'bet(t=$' + l[i].threshold + '): ' +
        t.rounds + 'r ' + t.wins + 'w/' + t.losses + 'l' +
        (t.rounds ? ' (' + (t.wins/t.rounds*100).toFixed(0) + '%)' : '') +
        ' P/L:$' + t.profit.toFixed(2)
      ); })(),
      '  Total: ' + state.bonusRounds + 'r ' + state.bonusWins + 'w/' + state.bonusLosses + 'l | Profit: $' + state.bonusProfit.toFixed(2),
      '─────────────── RECOVERY CHAIN ─────────────',
      ...( CONFIG.recoveryChain||[] ).map(c => {
        const tot = (c.wins||0) + (c.losses||0);
        const wr  = tot > 0 ? ((c.wins||0)/tot*100).toFixed(0)+'%' : 'n/a';
        return '  #' + c.id + ' ' + c.label + ' [' + (c.enabled?'ON ':'OFF') + '] '
          + 'mines:' + c.mines + ' '
          + c.wins + 'w/' + c.losses + 'l (' + wr + ')';
      }),
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
        launchBankroll: state.launchBankroll,
        drawdownPct: state.launchBankroll > 0 ? ((1 - state.bankroll / state.launchBankroll) * 100).toFixed(1) + '%' : 'n/a',
        net, rounds: state.rounds, wins: state.wins, losses: state.losses,
        winRate: state.rounds ? (state.wins / state.rounds * 100).toFixed(1) + '%' : '0%',
        tier: tierLabel(), lossStreakAmount: state.lossStreakAmount,
        resets: state.resets, bufferAbsorbs: state.bufferAbsorbs,
        bonusPot: state.bonusPot, lossBuffer: state.lossBuffer,
        bonusConfig: { mines: CONFIG.bonusMines, threshold: getDynBonusThreshold(), bet: getDynBonusBet() },
        recoveryChain: (CONFIG.recoveryChain||[]).map(c=>({
          id:c.id, label:c.label, enabled:c.enabled, mines:c.mines,
          defaultMines:{1:16,2:20,3:16,4:30,5:35,6:40,7:45}[c.id],
          wins:c.wins||0, losses:c.losses||0,
          winRate: (c.wins||0)+(c.losses||0) > 0
            ? (((c.wins||0)/((c.wins||0)+(c.losses||0)))*100).toFixed(0)+'%' : 'n/a',
        })),
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

  window.stopBot    = () => { state.running = false; saveState(); saveSessionHistory(); log('🛑 Stopped'); window.printFullLog(); };
  window.clearSaved = () => { localStorage.removeItem(STORAGE_KEY); log('🗑️  Cleared'); };
  window.resetConfig = () => {
    CONFIG.bankrollShare=0.30; CONFIG.bonusPotShare=0.40; CONFIG.lossBufferShare=0.30;
    CONFIG.delayMs=3000; CONFIG.revealCount=1;
    CONFIG.normalMines=12; CONFIG.betMultiplier=1.0; CONFIG.maxBetPct=0.20; CONFIG.tileStatWeight=0.70;
    CONFIG.resetBank1=100; CONFIG.resetBank2=400;
    CONFIG.preLossEnabled=true; CONFIG.preLossMines=25;
    CONFIG.bonusMines=20; CONFIG.bonusReveals=2; CONFIG.luckyBet=2.00; CONFIG.luckyStopMin=10; CONFIG.luckyStopMax=17;
    CONFIG.claudeModeTarget=200; CONFIG.claudeModeEnabled=true;
    // Re-enable all recovery chain tiers and restore default mines
    CONFIG.recoveryTargets = [0, 0.10, 1.00, 0.00, 0.00, 0.00, 0, 0];
    const defMines = {1:8,2:8,3:15,4:20,5:35,6:40,7:45};
    const defReveals = {1:2,2:3,3:2,4:3,5:3};
    const defFlat  = {6:5.00,7:5.00};
    (CONFIG.recoveryChain||[]).forEach(c => {
      c.enabled = true;
      c.mines   = defMines[c.id] || c.mines;
      if (defReveals[c.id]) c.reveals = defReveals[c.id];
      if (defFlat[c.id] !== undefined) c.flatBet = defFlat[c.id];
      if (TIERS[c.tierConst]) { TIERS[c.tierConst].mines = c.mines; if(c.flatBet) TIERS[c.tierConst].flatBet = c.flatBet; }
    });
    log('✅ CONFIG fully reset: split=30/40/30 | all defaults | recovery chain restored');
  };
  window.recoverGrid = async () => { const r = await dynamicGridRecovery(); log('Result: ' + JSON.stringify(r)); return r; };

  window.botHelp = () => log([
    '╔══════════════════════════════════════════════════╗',
    '║         RAINBET MINES BOT ' + VERSION + '               ║',
    '║  5 bonus pots: $1→$2→$4→$8→$12 | split 30/40/30 ║',
    '╠══════════════════════════════════════════════════╣',
    '║  runBot()              → start normal bot        ║',
    '║  stopBot()             → stop + save             ║',
    '║  runClaudeMode()       → Claude plays $20→$200   ║',
    '║  startWatchdog()       → auto-restart on death   ║',
    '║  stopWatchdog()        → stop watchdog           ║',
    '║  setBet(0.10)          → set base bet            ║',
    '║  setTarget(1000)       → change profit target    ║',
    '║  printStats()          → full session stats      ║',
    '║  printHistory()        → last 3 sessions         ║',
    '║  showChanges()         → show AI-changed params  ║',
    '║  resetConfig()         → reset all params/chain  ║',
    '║  clearSaved()          → wipe localStorage       ║',
    '║  recoverGrid()         → recover orphaned game   ║',
    '║  testClaude()          → test AI tuner           ║',
    '╚══════════════════════════════════════════════════╝',
  ].join('\n'));

  // ── Main Loop ─────────────────────────────────────────────────
  window.runBot = async (autoResume = false) => {
    state.running = true; state.startTime = Date.now();
    state.mineTiles = new Set(); state.lastReportMinute = -1; state.lastTuneMinute = -1; state.log = [];

    await dynamicGridRecovery();

    const saved = loadState();
    if (saved) {
      if (autoResume) {
        restoreState(saved);
        log('👁️ Auto-resumed from R' + saved.rounds);
      } else {
        const resume = confirm('Resume R' + saved.rounds + ' | Tier:' + (TIERS[saved.tier||0]?.label||'?') + ' | Pot:$' + saved.bonusPot.toFixed(2) + ' | Buf:$' + (saved.lossBuffer||0).toFixed(2) + '?');
        if (resume) restoreState(saved); else { window.clearSaved(); resetState(); }
      }
    } else { resetState(); }

    state.bankroll = await getRealBankroll();
    autoGuardChain();  // set chain tiers correctly for current bankroll at boot
    if (state.launchBankroll > 0 && state.launchBankroll < 200) {
      CONFIG.resetBank1 = Math.max(100, Math.ceil(state.launchBankroll + 10));
      log('📌 resetBank1=$' + CONFIG.resetBank1 + ' (launch=$' + state.launchBankroll.toFixed(2) + ')');
    }
    if (!state.peakBankroll || state.peakBankroll < state.bankroll) state.peakBankroll = state.bankroll;
    if (!state.launchBankroll) {
      state.launchBankroll = state.bankroll;  // locked at launch — used for 30% drawdown bonus guard
    }
    log('📌 Launch bankroll: $' + state.launchBankroll.toFixed(2));
    if (!state.session.startBankroll) {
      state.session.startBankroll  = state.bankroll;
      state.session.lowestBankroll = state.bankroll;
    }

    log([
      '🤖 ========= BOT ' + VERSION + ' =========',
      '💰 Bankroll:  $' + state.bankroll.toFixed(2) + ' | 🎯 Target: $' + CONFIG.targetBankroll,
      '🛡️  Buffer:    Losses absorbed first. Recovery only when buffer=0',
      '🎰 Bonus scale: ' + getBonusScale() + 'x | thresholds: $' + getBonusLadder().map(b=>b.threshold).join('/$'),
      '🤖 AI Tuner: every ' + TUNE_EVERY_MINS + ' min',
      '▶️  botHelp() | runClaudeMode() | startWatchdog()',
    ].join('\n'));

    while (state.running && state.rounds < CONFIG.maxRounds) {
      if (state.bankroll >= CONFIG.targetBankroll) { log('🎉 TARGET!'); break; }
      if (state.bankroll < CONFIG.minBet)          { log('💀 Broke!');  break; }

      try {
        // Decrement aggressive boost counter
        if (state.aggressiveBoostRounds > 0) {
          state.aggressiveBoostRounds--;
          if (state.aggressiveBoostRounds === 0) {
            CONFIG.betMultiplier = Math.max(1.0, CONFIG.betMultiplier / 1.3);
            CONFIG.betMultiplier = Math.round(CONFIG.betMultiplier * 100) / 100;
            log('📉 [PostLS] Boost expired — betMultiplier restored to ' + CONFIG.betMultiplier);
          }
        }

        if (state.rounds % 10 === 0 && state.rounds > 0) {
          state.bankroll = await getRealBankroll();
          autoGuardChain();  // adjust chain tiers to match bankroll
          log('🔄 R' + state.rounds + ' [' + tierLabel() + '] Bank:$' + state.bankroll.toFixed(2) +
              ' Pot:$' + state.bonusPot.toFixed(2) + ' Buf:$' + state.lossBuffer.toFixed(2));
        }

        // Pause if Claude mode is running (avoid conflicting bets)
        if (state.claudeModeRunning) {
          log('⏸️  [runBot] Paused — Claude mode active...');
          await delay(5000);
          continue;
        }

        // Multi-bonus ladder check
        const nextBonus = getNextBonus();
        if (nextBonus) {
          await placeBonusBet(nextBonus.bet, nextBonus.potIndex);
          state.rounds++;  // count bonus rounds so each gets unique round number
          await delay(CONFIG.delayMs);
          if (nextBonus.luckyShot) {
            // Pot #5 only — $2 Lucky Shot
            await runLuckyShot();
            await delay(CONFIG.delayMs);
          }
          continue;
        }

        if (state.tier === TIER_HAIL) {
          const won = await placeHailMaryBet();
          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0; state.t3aActualBet = 0;
          state.streakBaseBet = 0; state.mineTiles.clear();
          if (!won) { state.resets++; log('🔄 RESET -> T0 | Total: ' + state.resets); }
          saveState(); await delay(CONFIG.delayMs); continue;
        }

        if (state.tier >= TIERS.length) {
          state.tier = 0; state.tierLosses = 0; state.lossStreakAmount = 0;
          state.t3aStreakSnapshot = 0; state.mineTiles.clear(); state.resets++;
          saveState(); continue;
        }

        const curTier    = TIERS[state.tier];
        // Use CONFIG.normalMines for T0, hardcoded for recovery tiers
        // Boost tileStatWeight when stats are mature (500+ picks on best tile)
        const maturePicks = state.tileStats ? Math.max(...Object.values(state.tileStats).map(t=>t.picks||0)) : 0;
        if (maturePicks >= 500 && (CONFIG.tileStatWeight || 0.70) < 0.85) {
          CONFIG.tileStatWeight = 0.85;
          log('📊 [TileStat] 500+ picks — tileStatWeight boosted to 0.85');
        } else if (maturePicks >= 2000 && (CONFIG.tileStatWeight || 0.70) < 0.95) {
          CONFIG.tileStatWeight = 0.95;
          log('📊 [TileStat] 2000+ picks — tileStatWeight boosted to 0.95 (very mature stats)');
        }
        const effectiveMines = state.tier === TIER_NORMAL ? Math.min(14, CONFIG.normalMines || 10) : curTier.mines;
        state.currentBet = calculateBet(state.tier);
        const tileIndex  = pickTile(CONFIG.tiles);

        if (state.tier === TIER_T3A && state.t3aStreakSnapshot === 0) {
          state.t3aStreakSnapshot = state.lossStreakAmount;
          state.t3aActualBet = calculateBet(TIER_T3A);
        }

        const bet = await api('/v1/games/mines/new-game', 'POST', {
          tiles: CONFIG.tiles, mines: effectiveMines,
          betAmount: state.currentBet, balanceType: false, currency: 'USD',
        });
        if (bet.error) { log('❌ Bet error: ' + bet.error); await delay(3000); continue; }

        // Multi-reveal: T0 uses CONFIG.revealCount, recovery tiers use tier.reveals
        const effectiveReveals = (state.tier === TIER_NORMAL)
          ? (CONFIG.revealCount || 1)
          : (curTier.reveals || 1);
        let reveal = null;
        let revealedCount = 0;
        let hitMine = false;
        const revealedTiles = new Set();
        for (let rv = 0; rv < effectiveReveals; rv++) {
          // Pick next tile (avoid already revealed)
          const rvTile = rv === 0 ? tileIndex : (() => {
            const avail = [];
            for (let t = 0; t < CONFIG.tiles; t++) { if (!revealedTiles.has(t) && !state.mineTiles.has(t)) avail.push(t); }
            return avail.length ? avail[Math.floor(Math.random() * avail.length)] : tileIndex;
          })();
          reveal = await api('/v1/games/mines/reveal', 'POST', { index: rvTile });
          if (reveal.error) {
            log('❌ Reveal error: ' + reveal.error);
            await dynamicGridRecovery(); await delay(3000);
            reveal = null; break;  // API error — do not treat as mine
          }
          if (reveal.cell === 'M') { hitMine = true; break; }
          revealedTiles.add(rvTile);
          revealedCount++;
        }
        if (reveal === null) continue; // API error — skip round without loss
        // Treat as mine if any reveal hit mine
        if (hitMine && reveal && reveal.cell !== 'M') reveal = { cell: 'M' };

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
            state.streakBaseBet = 0; state.mineTiles.clear();
            pushLog({ round: state.rounds+1, result: '🛡️💣', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: '-', profit: '0.0000', bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: 'T0 (buf)', type: 'LOSS (buf absorbed)' });
          } else {
            state.winStreak = 0;  // reset win streak on loss
            state.tierLosses++;
            state.lossStreakAmount += state.currentBet;
            if (state.tierLosses > state.session.biggestConLoss) state.session.biggestConLoss = state.tierLosses;
            // Track per-tier loss
            const chainEntryLoss = (CONFIG.recoveryChain||[]).find(c => c.tierConst === state.tier);
            if (chainEntryLoss) chainEntryLoss.losses++;
            const prevLabel = curTier.label;

            if (state.tierLosses === 1) {
              state.streakBaseBet = getBaseBet();
              if (CONFIG.preLossEnabled !== false) {
                const recovered = await runPreLoss(state.streakBaseBet);
                if (recovered) { saveState(); await delay(CONFIG.delayMs); continue; }
                state.lossStreakAmount += state.streakBaseBet * 1;
                log('🔄 Pre-loss failed — streak: $' + state.lossStreakAmount.toFixed(2));
              }
            }

            // Dynamic recovery: use getNextTier() which respects CONFIG.recoveryChain
            if (state.tier === TIER_T3A) { state.t3aStreakSnapshot = 0; state.t3aActualBet = 0; }
            const isBudgetReset = (
              (state.tier === TIER_L2A && state.bankroll < (CONFIG.resetBank1||100)) ||
              (state.tier === TIER_T3A && state.bankroll < (CONFIG.resetBank2||400)) ||
              (state.tier === TIER_L4  && state.bankroll < (CONFIG.resetBank3||300)) ||
              (state.tier === TIER_L5  && state.bankroll < (CONFIG.resetBank3||300))
            );
            if (isBudgetReset) {
              const resetReason = 
                state.tier === TIER_L2A ? 'L2 bank<$'  + (CONFIG.resetBank1||100) :
                state.tier === TIER_T3A ? 'T3a bank<$' + (CONFIG.resetBank2||400) :
                state.tier === TIER_L4  ? 'T4 bank<$'+(CONFIG.resetBank3||300) :
                state.tier === TIER_L5  ? 'T5 bank<$'+(CONFIG.resetBank3||300) : 'budget cap';
              state.tier = 0; state.tierLosses = 0; state.lossStreakAmount = 0;
              state.streakBaseBet = 0; state.mineTiles.clear(); state.resets++;
              state.recentResets = (state.recentResets || 0) + 1;
              // Cooldown: slow down after repeated resets to let RNG settle
              if (state.recentResets >= 3) {
                const cooldownMs = Math.min(state.recentResets * 2000, 15000);
                log('⏳ COOLDOWN ' + (cooldownMs/1000).toFixed(0) + 's after ' + state.recentResets + ' resets...');
                await delay(cooldownMs);
              }
              log('🔄 RESET (' + resetReason + ') | consecutive resets: ' + state.recentResets);
            } else {
              const prevLabel2 = tierLabel();
              const nextT = getNextTier(state.tier);
              if (nextT === 0) {
                // All higher tiers disabled (bankroll too low) — forced reset
                state.tier = 0; state.tierLosses = 0; state.lossStreakAmount = 0;
                state.streakBaseBet = 0; state.mineTiles.clear(); state.resets++;
                log('🔒 [AutoGuard] No higher tier available at $' + state.bankroll.toFixed(2) + ' — forced T0 reset');
              } else {
                state.tier = nextT;
                log('⚠️  ' + prevLabel2 + ' → ' + (TIERS[state.tier]?.label || 'HailMary'));
              }
            }

            pushLog({ round: state.rounds+1, result: '💣', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: '-', profit: (-bankrollLoss).toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: state.tierLosses, streakLoss: state.lossStreakAmount.toFixed(2), bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: prevLabel, type: 'LOSS → ' + tierLabel() });
            log('💣 R' + (state.rounds+1) + ' [' + prevLabel + '→' + tierLabel() + '] LOSS | Bet:$' +
                state.currentBet.toFixed(2) + ' Streak:$' + state.lossStreakAmount.toFixed(2) + ' Bank:$' + state.bankroll.toFixed(2));
          }

        } else {
          const cashout = await api('/v1/games/mines/cashout');
          if (cashout.error) { log('❌ Cashout: ' + cashout.error); }

          const profit      = (state.currentBet * reveal.multiplier) - state.currentBet;
          const _sp = getDynamicSplit();
          const bufferShare = Math.round(profit * _sp.buf  * 10000) / 10000;
          const keepShare   = Math.round(profit * _sp.bank * 10000) / 10000;
          const potShare    = Math.round(profit * _sp.pot  * 10000) / 10000;

          state.bankroll   += keepShare;
          state.lossBuffer += bufferShare;
          state.bonusPots.forEach((_, i) => { state.bonusPots[i] += potShare; });
          state.bonusPot = state.bonusPots.reduce((a,b) => a+b, 0);

          if (state.tier === TIER_T3A) { state.t3aRounds++; state.t3aWins++; }

          state.wins++;
          const wasRecovery = state.tier > 0;
          const prevLabel   = curTier.label;
          state.recentResets = 0;  // win clears the reset counter
          state.winStreak = (state.winStreak || 0) + 1;
          // Track per-tier win
          if (wasRecovery) {
            const chainEntry = (CONFIG.recoveryChain||[]).find(c => c.tierConst === state.tier);
            if (chainEntry) chainEntry.wins++;
          }

          state.tier = 0; state.tierLosses = 0;
          state.lossStreakAmount = 0; state.t3aStreakSnapshot = 0; state.t3aActualBet = 0;
          state.streakBaseBet = 0; state.mineTiles.clear();

          state.session.totalBetted += state.currentBet;
          state.session.totalWon    += profit;
          updateTileStats(tileIndex, false);
          if (profit > state.session.biggestWin) state.session.biggestWin = profit;
          if (state.bankroll > state.peakBankroll) state.peakBankroll = state.bankroll;

          pushLog({ round: state.rounds+1, result: wasRecovery ? '♻️💎' : '💎', baseBet: getBaseBet().toFixed(2), bet: state.currentBet.toFixed(2), tile: tileIndex, multiplier: reveal.multiplier, profit: keepShare.toFixed(4), bankroll: state.bankroll.toFixed(2), conLoss: 0, streakLoss: '0', bonusPot: state.bonusPot.toFixed(2), lossBuffer: state.lossBuffer.toFixed(2), tierLabel: prevLabel, type: wasRecovery ? 'RECOVERY WIN' : 'NORMAL' });
          log((wasRecovery ? '♻️' : '💎') + ' R' + (state.rounds+1) +
              ' [' + prevLabel + '] WIN x' + reveal.multiplier +
              ' +$' + keepShare.toFixed(4) + ' | Bank:$' + state.bankroll.toFixed(2));
        }

        state.rounds++;
        saveState();

        const tuneMinute = Math.floor((Date.now() - state.startTime) / 60000);
        if (tuneMinute > 0 && tuneMinute % TUNE_EVERY_MINS === 0 && tuneMinute !== state.lastTuneMinute) {
          state.lastTuneMinute = tuneMinute;
          await claudeTune();
        }
        if (state.rounds % CONFIG.reportEveryRounds === 0) { window.printStats(); }

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
              ? '🤖 __claudeCall injected ✅'
              : '🤖 Injection failed — tuner disabled');
          }, 1000);
        });
      } catch(e) { log('🤖 chrome.runtime unavailable: ' + e.message); }
    }
  }, 1000);

  log([
    '✅ BOT ' + VERSION + ' READY',
    '🎰 5 bonus pots: $1→$2→$4→$8→$12 | split 30/40/30',
    '▶️  runBot() | ⏹️  stopBot() | ❓ botHelp()',
  ].join('\n'));

}, 3000);
