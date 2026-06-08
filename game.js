// =============================================
//  RUPIAH VS DOLLAR — game.js (REMASTERED)
//  Author: @gochandra11
//  Role: Game Designer, Viral Engineer, Psychologist
// =============================================

'use strict';

/* ===== CONFIG ===== */
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzJa_GB_lGISHEvhu3C_fJTx5cB6Al0xavzk_OQ42hPC490HzxFmxD6Bazx1vLVM9SQmA/exec',
  WA_ROOM: 'https://chat.whatsapp.com/C8K3sre2X8k8Sv2QkDTCmX',

  START_RATE: 15800,
  DEATH_RATE: 20000,
  MAX_HP: 100,
  MAX_ENERGY: 100,
  PLAYER_SPEED: 5,
  BULLET_SPEED: 10,
  ENEMY_SPEED_BASE: 1.2,
  SPAWN_RATE_BASE: 60,
  TOTAL_WAVES: 10,
  CRIT_CHANCE: 0.12,

  SPECIAL_COOLDOWNS: { bailout: 18000, hawkish: 15000, devalue: 25000 },

  WAVES: [
    { total: 12, spawnRate: 55, types: { minion: 1 }, subtitle: 'The Dollar Attacks' },
    { total: 18, spawnRate: 50, types: { minion: 0.85, elite: 0.15 }, subtitle: 'Elite Forces Incoming' },
    { total: 22, spawnRate: 48, types: { minion: 0.75, elite: 0.15, speculator: 0.10 }, subtitle: 'Invisible Speculators!' },
    { total: 28, spawnRate: 45, types: { minion: 0.65, elite: 0.25, speculator: 0.10 }, subtitle: 'Heavy Pressure' },
    { total: 20, spawnRate: 42, types: { minion: 0.60, elite: 0.20, speculator: 0.10, trump: 0.10 }, subtitle: 'TRUMP ALERT!', isTrumpWave: true },
    { total: 32, spawnRate: 40, types: { minion: 0.55, elite: 0.25, speculator: 0.20 }, subtitle: 'No Mercy' },
    { total: 38, spawnRate: 38, types: { minion: 0.50, elite: 0.25, speculator: 0.15, trump: 0.10 }, subtitle: 'Trump Returns' },
    { total: 42, spawnRate: 35, types: { minion: 0.45, elite: 0.30, speculator: 0.15, trump: 0.10 }, subtitle: 'Market Crash Imminent' },
    { total: 50, spawnRate: 32, types: { minion: 0.40, elite: 0.30, speculator: 0.20, trump: 0.10 }, subtitle: 'Final Push' },
    { total: 1,  spawnRate: 999, types: { boss: 1 }, subtitle: 'THE FINAL BOSS', isBossWave: true }
  ],

  LOADING_MESSAGES: [
    'Arming BI Rate Lasers...',
    'Recruiting Export Army...',
    'Analyzing Trump tweets...',
    'Printing Rupiah...',
    'Ready to defend! 🇮🇩'
  ],

  DEFEAT_MEMES: [
    '"The printer goes brrr... and your Rupiah goes 😭"',
    '"You\'re fired! — by the market"',
    '"Inflation is transitory, they said..."',
    '"Stack gold? Wrong chain, bro."',
    '"Jerome Powell sends his regards."'
  ],

  VICTORY_MEMES: [
    '"Rupiah strong! The Fed is defeated!"',
    '"Not today, Jerome Powell!"',
    '"Money printer jammed. Rupiah wins."',
    '"Absolute cinema. 🇮🇩"',
    '"Dollar maxis in shambles."'
  ],

  KILL_STREAKS: {
    3: 'DOUBLE KILL!',
    4: 'TRIPLE KILL!',
    5: 'RAMPAGE!',
    6: 'UNSTOPPABLE!',
    7: 'LEGENDARY!',
    8: 'GODLIKE!'
  }
};

function hasBackend() {
  return CONFIG.GOOGLE_SCRIPT_URL && !CONFIG.GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE');
}

/* ===== UTILITIES ===== */
function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function sendToSheets(payload) {
  if (!hasBackend()) return;
  try {
    await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.log('Sheets sync (non-blocking):', e.message);
  }
}

/* ===== AUDIO ENGINE ===== */
class AudioEngine {
  constructor() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { this.ctx = null; }
    this.enabled = true;
  }
  _play(freq, duration, type = 'square', vol = 0.08) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  shoot() { this._play(780, 0.09, 'square', 0.04); }
  hit() { this._play(180, 0.18, 'sawtooth', 0.1); }
  explode() {
    this._play(110, 0.4, 'sawtooth', 0.2);
    setTimeout(() => this._play(55, 0.4, 'sawtooth', 0.15), 80);
  }
  powerup() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this._play(f, 0.12, 'sine', 0.08), i * 100));
  }
  bossWarning() {
    for (let i = 0; i < 3; i++) setTimeout(() => this._play(200, 0.28, 'sawtooth', 0.25), i * 280);
  }
  crit() {
    this._play(1200, 0.1, 'square', 0.15);
    setTimeout(() => this._play(1800, 0.15, 'sine', 0.12), 50);
  }
  special(type) {
    if (type === 'bailout') {
      [440, 554, 659].forEach((f, i) => setTimeout(() => this._play(f, 0.2, 'sine', 0.12), i * 180));
    } else if (type === 'hawkish') {
      for (let i = 0; i < 5; i++) setTimeout(() => this._play(150 + i * 50, 0.25, 'square', 0.18), i * 90);
    } else if (type === 'devalue') {
      this._play(800, 0.1, 'sawtooth', 0.25); this._play(400, 0.7, 'sawtooth', 0.2);
    }
  }
}

/* ===== PARTICLE ===== */
class Particle {
  constructor(x, y, color, speed, life, size) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * speed;
    this.vy = (Math.random() - 0.5) * speed;
    this.color = color; this.life = life; this.maxLife = life; this.size = size;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life--; this.size *= 0.96; }
  draw(ctx) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6; ctx.shadowColor = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.1, this.size), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

/* ===== BULLET ===== */
class Bullet {
  constructor(x, y, damage = 1, isLaser = false, isCrit = false) {
    this.x = x; this.y = y; this.damage = damage; this.isLaser = isLaser; this.isCrit = isCrit;
    this.width = isLaser ? 3 : 5; this.height = isLaser ? 24 : 13;
    this.speed = isLaser ? 13 : CONFIG.BULLET_SPEED;
    this.color = isCrit ? '#c77dff' : (isLaser ? '#00ff88' : '#ffc107');
    this.active = true;
  }
  update() { this.y -= this.speed; if (this.y < -20) this.active = false; }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.isCrit ? 16 : (this.isLaser ? 12 : 7);
    ctx.shadowColor = this.color;
    if (this.isCrit) {
      ctx.fillRect(this.x - this.width, this.y, this.width * 2, this.height);
    } else {
      ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    }
    ctx.shadowBlur = 0;
  }
}

/* ===== STAR BACKGROUND ===== */
class StarField {
  constructor(count = 80) {
    this.stars = [];
    for (let i = 0; i < count; i++) this.stars.push(this._mk());
  }
  _mk() {
    return {
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.0003 + 0.0001,
      opacity: Math.random() * 0.5 + 0.2
    };
  }
  draw(ctx, w, h) {
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > 1) { s.y = 0; s.x = Math.random(); }
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

/* ===== ENEMY ===== */
class Enemy {
  constructor(type, wave, gx, gy) {
    this.type = type;
    this.x = Math.random() * (gx - 80) + 40;
    this.y = -60; this.active = true; this.flash = 0; this.frozen = false;
    const wm = 1 + (wave * 0.12);
    switch (type) {
      case 'minion':
        this.hp = this.maxHp = 1 * wm; this.speed = CONFIG.ENEMY_SPEED_BASE * (1 + Math.random() * 0.5);
        this.damage = 50; this.score = 100; this.width = 44; this.height = 28; this.color = '#85bb65'; break;
      case 'elite':
        this.hp = this.maxHp = 5 * wm; this.speed = CONFIG.ENEMY_SPEED_BASE * 0.75;
        this.damage = 150; this.score = 300; this.width = 54; this.height = 34; this.color = '#2e7d32'; break;
      case 'boss':
        this.hp = this.maxHp = 120 * wm; this.speed = 0.45;
        this.damage = 500; this.score = 10000; this.width = 120; this.height = 100;
        this.color = '#ff2055'; this.y = -130; this.attackTimer = 0; break;
      case 'speculator':
        this.hp = this.maxHp = 3 * wm; this.speed = CONFIG.ENEMY_SPEED_BASE * 1.6;
        this.damage = 200; this.score = 500; this.width = 36; this.height = 36;
        this.color = '#c77dff'; this.invisible = true; this.visibleTimer = 0; break;
      case 'trump':
        this.hp = this.maxHp = 25 * wm; this.speed = CONFIG.ENEMY_SPEED_BASE * 0.9;
        this.damage = 300; this.score = 1500; this.width = 48; this.height = 56;
        this.color = '#ff6f00'; this.attackTimer = 0; break;
    }
  }
  update(game) {
    if (this.frozen) return;
    this.y += this.speed;
    if (this.flash > 0) this.flash--;
    if (this.type === 'boss') {
      this.attackTimer++;
      if (this.attackTimer > 180) { this.attackTimer = 0; game.bossAttack(); }
      this.x += Math.sin(Date.now() / 900) * 2.2;
    }
    if (this.type === 'trump') {
      this.attackTimer++;
      if (this.attackTimer > 120) {
        this.attackTimer = 0;
        // Trump tweets (spawns a minion)
        if (game.enemies.filter(e => e.active).length < 15) {
          game.enemies.push(new Enemy('minion', game.wave, game.canvas.width, game.canvas.height));
        }
      }
      this.x += Math.sin(Date.now() / 600) * 1.5;
    }
    if (this.type === 'speculator') {
      this.visibleTimer++;
      if (this.visibleTimer > 100) { this.invisible = !this.invisible; this.visibleTimer = 0; }
    }
    if (this.y > game.canvas.height + 60) {
      this.active = false;
      game.enemiesEscaped++;
      game.damageRate(this.damage);
    }
  }
  draw(ctx) {
    const alpha = (this.type === 'speculator' && this.invisible) ? 0.22 : 1;
    const flashAlpha = this.flash > 0 ? Math.min(alpha, 0.45) : alpha;
    ctx.globalAlpha = flashAlpha;
    ctx.save(); ctx.translate(this.x, this.y);

    if (this.type === 'minion') {
      // $1 Bill body
      ctx.fillStyle = '#85bb65';
      this._roundRect(ctx, -22, -14, 44, 28, 2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      this._roundRect(ctx, -22, -14, 44, 28, 2); ctx.stroke();
      // Inner
      ctx.fillStyle = '#a0d67a';
      this._roundRect(ctx, -18, -10, 36, 20, 1); ctx.fill();
      // Portrait oval
      ctx.fillStyle = '#5a8c3a';
      ctx.beginPath(); ctx.ellipse(0, -2, 7, 9, 0, 0, Math.PI*2); ctx.fill();
      // "1"
      ctx.fillStyle = '#2d5a1e'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('1', 0, 2);
      // Eyes
      ctx.fillStyle = '#1a3d0f';
      ctx.beginPath(); ctx.arc(-6, -6, 2, 0, Math.PI*2); ctx.arc(6, -6, 2, 0, Math.PI*2); ctx.fill();
      // Mouth
      ctx.beginPath(); ctx.strokeStyle = '#1a3d0f'; ctx.lineWidth = 1;
      ctx.arc(0, 2, 4, 0, Math.PI); ctx.stroke();

    } else if (this.type === 'elite') {
      // $100 Bill
      ctx.fillStyle = '#2e7d32';
      this._roundRect(ctx, -27, -17, 54, 34, 2); ctx.fill();
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
      this._roundRect(ctx, -27, -17, 54, 34, 2); ctx.stroke();
      // "100"
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('100', 0, 2);
      // Sunglasses
      ctx.fillStyle = '#111';
      ctx.fillRect(-14, -8, 12, 6); ctx.fillRect(2, -8, 12, 6);
      ctx.fillStyle = '#333';
      ctx.fillRect(-12, -7, 3, 2); ctx.fillRect(4, -7, 3, 2);

    } else if (this.type === 'boss') {
      // Body
      ctx.fillStyle = '#1a0505';
      this._roundRect(ctx, -62, -52, 124, 104, 8); ctx.fill();
      // Face glow
      ctx.fillStyle = this.color; ctx.shadowBlur = 24; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(0, -8, 44, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Eyes white
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-15, -20, 12, 0, Math.PI * 2); ctx.arc(15, -20, 12, 0, Math.PI * 2); ctx.fill();
      // Eyes pupil
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-15, -20, 5, 0, Math.PI * 2); ctx.arc(15, -20, 5, 0, Math.PI * 2); ctx.fill();
      // Red pupils
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(-14, -21, 2, 0, Math.PI * 2); ctx.arc(16, -21, 2, 0, Math.PI * 2); ctx.fill();
      // Legs
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(-52, 20, 18, 42); ctx.fillRect(34, 20, 18, 42);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(-62, 10, 42, 16); ctx.fillRect(20, 10, 42, 16);
      // Label
      ctx.fillStyle = '#ffc107'; ctx.shadowBlur = 8; ctx.shadowColor = '#ffc107';
      ctx.font = 'bold 12px "Orbitron", monospace'; ctx.textAlign = 'center'; ctx.fillText('THE FED', 0, 32); ctx.shadowBlur = 0;
      // HP bar
      const hp = this.hp / this.maxHp;
      ctx.fillStyle = '#222'; this._roundRect(ctx, -54, -76, 108, 10, 4); ctx.fill();
      ctx.fillStyle = hp > 0.5 ? '#00ff88' : hp > 0.25 ? '#ffc107' : '#ff2055';
      this._roundRect(ctx, -54, -76, 108 * hp, 10, 4); ctx.fill();

    } else if (this.type === 'speculator') {
      ctx.fillStyle = this.color; ctx.shadowBlur = 14; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👻', 0, 5);

    } else if (this.type === 'trump') {
      // 8-bit Trump
      // Suit body
      ctx.fillStyle = '#1a3a5c';
      ctx.fillRect(-20, -10, 40, 35);
      // Red tie
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(0, 18); ctx.fill();
      // White shirt
      ctx.fillStyle = '#fff';
      ctx.fillRect(-8, -5, 16, 12);
      // Head
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(-14, -28, 28, 20);
      // Orange hair (8-bit blocks)
      ctx.fillStyle = '#ff6f00';
      ctx.fillRect(-16, -32, 32, 6);
      ctx.fillRect(-16, -28, 6, 8);
      ctx.fillRect(10, -28, 6, 8);
      ctx.fillRect(-12, -34, 8, 4);
      ctx.fillRect(4, -34, 8, 4);
      // Eyes
      ctx.fillStyle = '#fff'; ctx.fillRect(-8, -22, 6, 5); ctx.fillRect(2, -22, 6, 5);
      ctx.fillStyle = '#000'; ctx.fillRect(-6, -21, 2, 3); ctx.fillRect(4, -21, 2, 3);
      // Mouth
      ctx.strokeStyle = '#c47e5e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(4, -14); ctx.stroke();
      // Label
      ctx.fillStyle = '#ff6f00'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TRUMP', 0, 32);
    }

    ctx.restore(); ctx.globalAlpha = 1;
  }
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  takeDamage(dmg, game, isCrit = false) {
    this.hp -= dmg; this.flash = 6;
    if (this.hp <= 0) {
      this.active = false;
      game.addScore(this.score);
      game.addParticles(this.x, this.y, this.color, 14);
      game.audio.explode();
      game.killStreak++;
      game.killStreakTimer = 180;
      game._checkKillStreak();
      return true;
    }
    return false;
  }
}

/* ===== ALLY ===== */
class Ally {
  constructor(x, y) { this.x = x; this.y = y; this.active = true; this.shootTimer = 0; }
  update(game) {
    this.shootTimer++;
    if (this.shootTimer > 52) {
      this.shootTimer = 0;
      game.bullets.push(new Bullet(this.x, this.y - 18, 1, false));
    }
    this.x += (game.player.x - this.x) * 0.016;
  }
  draw(ctx) {
    ctx.fillStyle = '#ffc107'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffc107';
    ctx.beginPath(); ctx.arc(this.x, this.y, 14, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☕', this.x, this.y + 5);
  }
}

/* ===== MAIN GAME ===== */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new AudioEngine();
    this.stars = new StarField(100);

    this.state = 'loading';
    this.player = { x: 0, y: 0, width: 54, height: 54, hp: 100, maxHp: 100 };
    this._reset();

    this.user = null;
    this.leaderboard = [];
    this.keys = {};
    this.screenShake = 0;
    this.bossWarningShown = false;

    this.resize();
    this.setupInput();
    this._boundLoop = this._loop.bind(this);
    requestAnimationFrame(this._boundLoop);

    // Fake live counter
    this._liveCounterTimer = 0;
  }

  _reset() {
    this.bullets = []; this.enemies = []; this.allies = []; this.particles = [];
    this.rate = CONFIG.START_RATE; this.score = 0; this.wave = 1;
    this.enemiesKilled = 0; this.enemiesSpawned = 0; this.enemiesEscaped = 0;
    this.spawnTimer = 0;
    this.energy = CONFIG.MAX_ENERGY; this.player.hp = CONFIG.MAX_HP;
    this.upgrades = { laser: 0, shield: 0, export: 0, subsidy: 0 };
    this.points = 0;
    this.specialCooldowns = { bailout: 0, hawkish: 0, devalue: 0 };
    this.specialActive = { bailout: false, hawkish: false };
    this.specialTimers = { bailout: 0, hawkish: 0 };
    this.shootTimer = 0;
    this.invincible = false;
    this.bossWarningShown = false;
    this.combo = 0; this.comboTimer = 0;
    this.killStreak = 0; this.killStreakTimer = 0;
    this.waveState = 'idle'; // idle, spawning, active, cleared, intermission
    this.currentWaveConfig = null;
    this.currentSpawnRate = CONFIG.SPAWN_RATE_BASE;
  }

  resize() {
    const c = document.getElementById('gameContainer');
    this.canvas.width = c.clientWidth;
    this.canvas.height = c.clientHeight;
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height - 90;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if ((e.key === ' ' || e.key === 'ArrowUp') && this.state === 'playing') {
        e.preventDefault(); this._shoot();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.key] = false; });

    const hold = (el, key) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; }, { passive: false });
      el.addEventListener('mousedown', () => this.keys[key] = true);
      el.addEventListener('mouseup', () => this.keys[key] = false);
    };
    hold(document.getElementById('btnLeft'), 'ArrowLeft');
    hold(document.getElementById('btnRight'), 'ArrowRight');

    const shootEl = document.getElementById('btnShoot');
    shootEl.addEventListener('touchstart', (e) => { e.preventDefault(); this.audio.resume(); this._shoot(); }, { passive: false });
    shootEl.addEventListener('mousedown', () => this._shoot());

    this.canvas.addEventListener('click', () => {
      this.audio.resume();
      if (this.state === 'playing') this._shoot();
    });
    window.addEventListener('resize', () => this.resize());

    document.addEventListener('touchstart', () => this.audio.resume(), { once: true });
  }

  _shoot() {
    if (this.state !== 'playing') return;
    const dmg = 1 + this.upgrades.laser;
    const isLaser = this.upgrades.laser >= 3;
    const isCrit = Math.random() < CONFIG.CRIT_CHANCE;
    const finalDmg = isCrit ? dmg * 2 : dmg;
    
    this.bullets.push(new Bullet(this.player.x, this.player.y - 22, finalDmg, isLaser, isCrit));
    if (this.upgrades.laser >= 2) {
      this.bullets.push(new Bullet(this.player.x - 16, this.player.y - 12, finalDmg, isLaser, isCrit));
      this.bullets.push(new Bullet(this.player.x + 16, this.player.y - 12, finalDmg, isLaser, isCrit));
    }
    this.audio.shoot();
    if (isCrit) this.audio.crit();
  }

  start() {
    this._reset();
    this.state = 'playing';
    this._show('hud'); this._show('specialMoves'); this._show('liveCounter');
    this._hide('mainMenu');
    if (window.innerWidth < 600 || window.innerHeight < 500)
      document.getElementById('touchControls').style.display = 'flex';
    this.audio.resume();
    this._startWave(1);
  }

  _startWave(waveNum) {
    this.wave = waveNum;
    this.enemiesKilled = 0; this.enemiesSpawned = 0; this.enemiesEscaped = 0;
    this.waveState = 'spawning';
    this.currentWaveConfig = CONFIG.WAVES[Math.min(waveNum - 1, CONFIG.WAVES.length - 1)];
    this.currentSpawnRate = this.currentWaveConfig.spawnRate;
    this.bossWarningShown = false;

    // Show wave banner
    const banner = document.getElementById('waveBanner');
    const title = document.getElementById('waveBannerTitle');
    const sub = document.getElementById('waveBannerSubtitle');
    title.textContent = `WAVE ${waveNum}`;
    sub.textContent = this.currentWaveConfig.subtitle || '';
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 2500);

    if (this.currentWaveConfig.isBossWave) {
      this._showBossWarning('THE FED', 'The Federal Reserve is attacking!<br>Prepare your defenses!');
    } else if (this.currentWaveConfig.isTrumpWave) {
      this._showBossWarning('TRUMP', '8-bit Mini-Boss incoming!<br>He tweets minions into existence!');
    }
  }

  restart() { this._hide('endScreen'); this.showMenu(); }

  showMenu() {
    this.state = 'menu';
    this._show('mainMenu');
    this._hide('hud'); this._hide('specialMoves'); this._hide('liveCounter');
    document.getElementById('touchControls').style.display = 'none';
    this.loadLeaderboard();
  }

  _show(id) { document.getElementById(id).classList.remove('hidden'); }
  _hide(id) { document.getElementById(id).classList.add('hidden'); }

  /* ===== SPAWN SYSTEM (BUG FIX) ===== */
  _spawnEnemy() {
    const cfg = this.currentWaveConfig;
    if (!cfg) return;

    if (cfg.isBossWave && !this.bossWarningShown) {
      // Wait for boss warning to finish
      return;
    }

    let type = 'minion';
    const r = Math.random();
    let cumulative = 0;
    
    if (cfg.isBossWave) {
      type = 'boss';
    } else {
      const types = Object.keys(cfg.types);
      for (const t of types) {
        cumulative += cfg.types[t];
        if (r <= cumulative) { type = t; break; }
      }
    }

    this.enemies.push(new Enemy(type, this.wave, this.canvas.width, this.canvas.height));
    this.enemiesSpawned++;
  }

  _showBossWarning(name, desc) {
    this.bossWarningShown = true;
    document.getElementById('bossName').textContent = name;
    document.getElementById('bossDesc').innerHTML = desc;
    this._show('bossWarning');
    this.audio.bossWarning();
    setTimeout(() => {
      this._hide('bossWarning');
      if (this.currentWaveConfig.isBossWave) {
        this.enemies.push(new Enemy('boss', this.wave, this.canvas.width, this.canvas.height));
        this.enemiesSpawned++;
      }
    }, 3000);
  }

  bossAttack() {
    this.screenShake = 24;
    this.addParticles(this.canvas.width / 2, this.canvas.height / 2, '#ff2055', 40);
    this.damageRate(300);
    this._floatText(this.canvas.width / 2, this.canvas.height / 2, 'RATE HIKE!', '#ff2055');
    const f = document.getElementById('screenFlash');
    f.style.background = '#ff2055'; f.classList.add('active');
    setTimeout(() => f.classList.remove('active'), 200);
  }

  damageRate(amount) {
    if (this.invincible || this.specialActive.bailout) return;
    const reduction = this.upgrades.shield * 0.15;
    const actual = Math.max(0, Math.floor(amount * (1 - reduction)));
    this.rate += actual;
    if (actual > 0) this._floatText(this.player.x, this.player.y - 55, '+' + actual.toLocaleString(), '#ff2055');
    if (this.rate >= CONFIG.DEATH_RATE) this.gameOver(false);
  }

  addScore(pts) {
    this.combo++;
    this.comboTimer = 90;
    const multiplier = Math.min(this.combo, 5);
    const total = pts * multiplier;
    this.score += total; this.points += Math.floor(total / 10);
    if (this.combo >= 3) {
      const cd = document.getElementById('comboDisplay');
      cd.textContent = `x${multiplier} COMBO!`;
      cd.classList.remove('hidden');
    }
  }

  addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++)
      this.particles.push(new Particle(x, y, color, 5, 30 + Math.random() * 22, 3 + Math.random() * 3));
  }

  _floatText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.cssText = `left:${x}px;top:${y}px;color:${color};`;
    el.textContent = text;
    document.getElementById('gameContainer').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  _checkKillStreak() {
    const msgs = CONFIG.KILL_STREAKS;
    const streak = this.killStreak;
    if (msgs[streak]) {
      const el = document.getElementById('killStreakDisplay');
      el.textContent = msgs[streak];
      el.classList.remove('hidden');
      // Force reflow
      void el.offsetWidth;
      el.classList.add('hidden');
      // Actually show it by removing hidden again after a tick? No, CSS animation handles it
      // The animation runs when not hidden, so we need to manage class properly
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 1500);
    }
  }

  activateSpecial(type) {
    if (this.state !== 'playing') return;
    const now = Date.now();
    if (type === 'bailout') {
      if (now - this.specialCooldowns.bailout < CONFIG.SPECIAL_COOLDOWNS.bailout) return;
      this.specialCooldowns.bailout = now; this.specialActive.bailout = true; this.specialTimers.bailout = 10000;
      this._showSpecialOverlay('🛡️ BAILOUT!', '#00ff88'); this.audio.special('bailout');
      this._floatText(this.canvas.width / 2, this.canvas.height / 3, 'TOO BIG TO FAIL!', '#00ff88');

    } else if (type === 'hawkish') {
      if (now - this.specialCooldowns.hawkish < CONFIG.SPECIAL_COOLDOWNS.hawkish) return;
      this.specialCooldowns.hawkish = now; this.specialActive.hawkish = true; this.specialTimers.hawkish = 5000;
      this._showSpecialOverlay('❄️ HAWKISH!', '#00cfff'); this.audio.special('hawkish');
      this.enemies.forEach(e => e.frozen = true);

    } else if (type === 'devalue') {
      if (now - this.specialCooldowns.devalue < CONFIG.SPECIAL_COOLDOWNS.devalue) return;
      this.specialCooldowns.devalue = now;
      this._showSpecialOverlay('💥 DEVALUE!', '#ff2055'); this.audio.special('devalue');
      this.enemies.forEach(e => { this.addParticles(e.x, e.y, e.color, 16); this.addScore(e.score); });
      this.enemies = [];
      this.player.hp = Math.max(1, Math.floor(this.player.hp * 0.5));
      this._floatText(this.player.x, this.player.y - 40, '-50% HP!', '#ff2055');
    }
    this._updateSpecialUI();
  }

  _showSpecialOverlay(text, color) {
    const ov = document.getElementById('specialOverlay');
    const tx = document.getElementById('specialText');
    tx.textContent = text; tx.style.color = color;
    ov.style.display = 'flex';
    ov.classList.remove('active');
    void ov.offsetHeight;
    setTimeout(() => { ov.style.display = 'none'; }, 2000);
  }

  _updateSpecialUI() {
    const now = Date.now();
    ['bailout', 'hawkish', 'devalue'].forEach(t => {
      const elapsed = now - this.specialCooldowns[t];
      const pct = Math.max(0, Math.min(100, (elapsed / CONFIG.SPECIAL_COOLDOWNS[t]) * 100));
      const id = 'cd' + t[0].toUpperCase() + t.slice(1);
      const cd = document.getElementById(id);
      const btn = document.getElementById('btn' + t[0].toUpperCase() + t.slice(1));
      if (cd) { cd.style.height = (100 - pct) + '%'; btn.classList.toggle('cooldown', pct < 100); }
    });
  }

  buyUpgrade(type) {
    const lvl = this.upgrades[type];
    const costs = { laser: 500 * (lvl + 1), shield: 500 * (lvl + 1), export: 800 * (lvl + 1), subsidy: 300 * (lvl + 1) };
    if (this.points >= costs[type]) {
      this.points -= costs[type]; this.upgrades[type]++;
      this.audio.powerup();
      if (type === 'export') {
        this.allies.push(new Ally(this.player.x + (Math.random() - 0.5) * 100, this.player.y - 40));
      } else if (type === 'subsidy') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
        this.energy = Math.max(0, this.energy - 20);
      }
      this._updateShopUI();
      const card = document.getElementById('card-' + type);
      if (card) { card.style.borderColor = '#00ff88'; setTimeout(() => card.style.borderColor = '', 600); }
    }
  }

  _updateShopUI() {
    document.getElementById('shopPoints').textContent = this.points.toLocaleString();
    ['laser', 'shield', 'export', 'subsidy'].forEach(t => {
      const lvl = this.upgrades[t];
      const costs = { laser: 500, shield: 500, export: 800, subsidy: 300 };
      document.getElementById('cost' + t[0].toUpperCase() + t.slice(1)).textContent =
        (costs[t] * (lvl + 1)).toLocaleString() + ' PTS';
      document.getElementById('lvl' + t[0].toUpperCase() + t.slice(1)).textContent = 'LV ' + lvl;
    });
  }

  nextWave() {
    if (this.wave >= CONFIG.TOTAL_WAVES) {
      this._victory();
      return;
    }
    this._hide('upgradeShop');
    this._startWave(this.wave + 1);
  }

  _showUpgradeShop() {
    this.waveState = 'intermission';
    this.state = 'shop';
    this._updateShopUI();
    this._show('upgradeShop');
  }

  gameOver(victory) {
    this.state = victory ? 'victory' : 'gameover';
    this._hide('hud'); this._hide('specialMoves'); this._hide('liveCounter');
    document.getElementById('touchControls').style.display = 'none';
    this._show('endScreen');

    const endTitle = document.getElementById('endTitle');
    const endRate = document.getElementById('endRate');
    const endResult = document.getElementById('endResult');
    const endMeme = document.getElementById('endMeme');
    const shareScreen = document.getElementById('shareScreen');

    if (victory) {
      endTitle.textContent = '🏆 VICTORY!'; endTitle.style.color = '#00ff88';
      endRate.textContent = 'Rp ' + this.rate.toLocaleString(); endRate.style.color = '#00ff88';
      endResult.textContent = 'RUPIAH SURVIVED! 🇮🇩'; endResult.style.color = '#00ff88';
      const memes = CONFIG.VICTORY_MEMES;
      endMeme.textContent = memes[Math.floor(Math.random() * memes.length)];
      shareScreen.style.borderColor = '#00ff88';
      shareScreen.style.boxShadow = '0 0 50px rgba(0,255,136,0.3)';
    } else {
      endTitle.textContent = '💀 DEFEAT'; endTitle.style.color = '#ff2055';
      endRate.textContent = 'Rp ' + this.rate.toLocaleString(); endRate.style.color = '#ff2055';
      endResult.textContent = 'RUPIAH KO!'; endResult.style.color = '#ff2055';
      const memes = CONFIG.DEFEAT_MEMES;
      endMeme.textContent = memes[Math.floor(Math.random() * memes.length)];
      shareScreen.style.borderColor = '#ff2055';
      shareScreen.style.boxShadow = '0 0 50px rgba(255,32,85,0.3)';
    }
    document.getElementById('endScore').textContent = this.score.toLocaleString();
    document.getElementById('endWaves').textContent = this.wave;
    this._saveScore();
  }

  _victory() { this.gameOver(true); }

  /* ===== MAIN UPDATE ===== */
  _update() {
    if (this.state === 'playing') {
      const spd = CONFIG.PLAYER_SPEED;

      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.x -= spd;
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.x += spd;
      if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.player.y -= spd;
      if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.player.y += spd;

      this.player.x = Math.max(28, Math.min(this.canvas.width - 28, this.player.x));
      this.player.y = Math.max(55, Math.min(this.canvas.height - 55, this.player.y));

      // Auto-shoot
      this.shootTimer++;
      const fireRate = Math.max(8, 28 - this.upgrades.laser * 5);
      if (this.shootTimer >= fireRate) { this.shootTimer = 0; this._shoot(); }

      // Combo decay
      if (this.comboTimer > 0) {
        this.comboTimer--;
        if (this.comboTimer === 0) {
          this.combo = 0;
          document.getElementById('comboDisplay').classList.add('hidden');
        }
      }

      // Kill streak decay
      if (this.killStreakTimer > 0) {
        this.killStreakTimer--;
        if (this.killStreakTimer <= 0) this.killStreak = 0;
      }

      // Spawn system
      if (this.waveState === 'spawning') {
        this.spawnTimer++;
        if (this.spawnTimer >= this.currentSpawnRate) {
          this.spawnTimer = 0;
          if (this.enemiesSpawned < this.currentWaveConfig.total) {
            this._spawnEnemy();
          } else {
            this.waveState = 'active';
          }
        }
      }

      // Check wave complete
      if (this.waveState === 'active' && this.enemies.length === 0) {
        this.waveState = 'cleared';
        setTimeout(() => this._showUpgradeShop(), 500);
      }

      // Update bullets
      this.bullets = this.bullets.filter(b => b.active);
      this.bullets.forEach(b => b.update());

      // Update enemies + collisions
      this.enemies = this.enemies.filter(e => e.active);
      this.enemies.forEach(e => {
        e.update(this);
        // Enemy vs player
        if (!this.specialActive.bailout) {
          const dx = e.x - this.player.x, dy = e.y - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 32) {
            this.player.hp -= 8; e.active = false;
            this.addParticles(e.x, e.y, '#ff2055', 10); this.audio.hit();
            this._floatText(this.player.x, this.player.y - 40, '-8 HP', '#ff2055');
            if (this.player.hp <= 0) this.gameOver(false);
          }
        }
        // Bullet vs enemy
        this.bullets.forEach(b => {
          if (!b.active || !e.active) return;
          const bdx = b.x - e.x, bdy = b.y - e.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          const hitRadius = e.type === 'boss' ? 40 : 26;
          if (bdist < hitRadius) {
            b.active = false;
            if (b.isCrit) {
              this._floatText(e.x, e.y - 30, 'CRIT!', '#c77dff');
            }
            if (e.takeDamage(b.damage, this, b.isCrit)) this.enemiesKilled++;
          }
        });
      });

      // Update allies
      this.allies = this.allies.filter(a => a.active);
      this.allies.forEach(a => a.update(this));

      // Particles
      this.particles = this.particles.filter(p => p.life > 0);
      this.particles.forEach(p => p.update());

      // Specials
      if (this.specialActive.bailout) {
        this.specialTimers.bailout -= 16;
        if (this.specialTimers.bailout <= 0) this.specialActive.bailout = false;
      }
      if (this.specialActive.hawkish) {
        this.specialTimers.hawkish -= 16;
        if (this.specialTimers.hawkish <= 0) {
          this.specialActive.hawkish = false;
          this.enemies.forEach(e => e.frozen = false);
        }
      }

      this._updateSpecialUI();
      if (this.screenShake > 0) this.screenShake--;
      if (this.energy < 100) this.energy += 0.04;
      this._updateHUD();
      this._updateLiveCounter();
    }
  }

  _updateHUD() {
    document.getElementById('rateValue').textContent = this.rate.toLocaleString();
    document.getElementById('rateDisplay').classList.toggle('danger', this.rate > 18000);
    const hpPct = this.player.hp / this.player.maxHp * 100;
    document.getElementById('hpFill').style.width = hpPct + '%';
    document.getElementById('hpFill').style.backgroundPosition = (100 - hpPct) + '% 0';
    document.getElementById('hpText').textContent = Math.ceil(this.player.hp);
    document.getElementById('energyFill').style.width = this.energy + '%';
    document.getElementById('waveNum').textContent = this.wave;
    document.getElementById('scoreVal').textContent = this.score.toLocaleString();
  }

  _updateLiveCounter() {
    this._liveCounterTimer++;
    if (this._liveCounterTimer % 300 === 0) { // every ~5 seconds
      const base = 800 + Math.floor(Math.random() * 700);
      document.getElementById('liveCounter').textContent = `🔴 ${base.toLocaleString()} warriors online`;
    }
  }

  /* ===== MAIN DRAW ===== */
  _draw() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    let sx = 0, sy = 0;
    if (this.screenShake > 0) {
      sx = (Math.random() - 0.5) * this.screenShake * 0.8;
      sy = (Math.random() - 0.5) * this.screenShake * 0.5;
    }
    ctx.save(); ctx.translate(sx, sy);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#04040f'); bg.addColorStop(1, '#0b0b1e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.draw(ctx, w, h);

    // Perspective grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 44) {
      const a = 0.025 + (i / w) * 0.035;
      ctx.strokeStyle = `rgba(0,255,136,${a})`;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i <= h; i += 44) {
      const a = 0.02 + (i / h) * 0.05;
      ctx.strokeStyle = `rgba(0,255,136,${a})`;
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Ground line
    const gl = ctx.createLinearGradient(0, 0, w, 0);
    gl.addColorStop(0, 'transparent'); gl.addColorStop(0.5, 'rgba(0,255,136,0.35)'); gl.addColorStop(1, 'transparent');
    ctx.strokeStyle = gl; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h - 95); ctx.lineTo(w, h - 95); ctx.stroke();

    // Draw game objects
    this.allies.forEach(a => a.draw(ctx));
    this.bullets.forEach(b => b.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    this._drawPlayer(ctx);
    this.particles.forEach(p => p.draw(ctx));

    ctx.restore();
  }

  _drawPlayer(ctx) {
    const { x, y } = this.player;
    ctx.save(); ctx.translate(x, y);

    // Bailout shield ring
    if (this.specialActive.bailout) {
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.5;
      ctx.shadowBlur = 22; ctx.shadowColor = '#00ff88';
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,255,136,0.08)';
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Coin outer glow
    ctx.shadowBlur = 18; ctx.shadowColor = '#ffc107';
    ctx.fillStyle = '#ffc107';
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Coin inner
    ctx.fillStyle = '#ffd740';
    ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill();

    // Coin border
    ctx.strokeStyle = '#e6a800'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();

    // Rp text
    ctx.fillStyle = '#5c3300';
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Rp', 0, 5);

    // Face
    ctx.fillStyle = '#3a1f00';
    ctx.beginPath(); ctx.arc(-7, -9, 2.5, 0, Math.PI * 2); ctx.arc(7, -9, 2.5, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.beginPath(); ctx.strokeStyle = '#3a1f00'; ctx.lineWidth = 1.5;
    if (this.rate > 17000) {
      ctx.arc(0, 7, 5.5, Math.PI, 0); // frown
    } else {
      ctx.arc(0, 2, 5.5, 0, Math.PI); // smile
    }
    ctx.stroke();
    ctx.restore();
  }

  _loop() {
    this._update();
    this._draw();
    requestAnimationFrame(this._boundLoop);
  }

  /* ===== BACKEND ===== */
  async _saveScore() {
    if (!this.user) return;
    const entry = { name: this.user.name, score: this.score, wave: this.wave, rate: this.rate, date: new Date().toISOString() };
    const scores = JSON.parse(localStorage.getItem('rupiahScores') || '[]');
    scores.push(entry);
    localStorage.setItem('rupiahScores', JSON.stringify(scores.slice(-50)));
    sendToSheets({
      action: 'saveScore', name: this.user.name, email: this.user.email,
      whatsapp: this.user.whatsapp, score: this.score, rate: this.rate,
      wave: this.wave, victory: this.state === 'victory'
    });
  }

  async loadLeaderboard() {
    const local = JSON.parse(localStorage.getItem('rupiahScores') || '[]');
    let all = local.map(s => ({ name: s.name, score: s.score, wave: s.wave }));

    if (hasBackend()) {
      try {
        const resp = await fetchWithTimeout(CONFIG.GOOGLE_SCRIPT_URL + '?action=getLeaderboard', 5000);
        const data = await resp.json();
        if (Array.isArray(data) && data.length) all = [...all, ...data];
      } catch (e) { console.log('Leaderboard: using local scores'); }
    }

    if (all.length === 0) all = [
      { name: 'RupiahWarrior', score: 15000, wave: 5 },
      { name: 'DollarSlayer', score: 12000, wave: 4 },
      { name: 'BIAgent', score: 9000, wave: 3 }
    ];
    all.sort((a, b) => b.score - a.score);
    this.leaderboard = all.slice(0, 10);
    this._renderLeaderboard();
  }

  _renderLeaderboard() {
    const medals = ['🥇', '🥈', '🥉'];
    document.getElementById('leaderboardList').innerHTML = this.leaderboard.map((p, i) => `
      <div class="leaderboard-item">
        <span class="lb-rank">${medals[i] || (i + 1) + '.'}</span>
        <span class="lb-name">${p.name}</span>
        <span class="lb-score">${Number(p.score).toLocaleString()}</span>
        <span class="lb-wave">W${p.wave}</span>
      </div>
    `).join('');
  }
}

/* ===== GLOBAL UI FUNCTIONS ===== */
let game;

function switchTab(tab) {
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginOnlyForm').style.display = tab === 'login' ? 'block' : 'none';
}

function openWaRoom() { window.open(CONFIG.WA_ROOM, '_blank'); }

function handleLogout() {
  localStorage.removeItem('rupiahPlayer');
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const wa = document.getElementById('regWa').value.trim();
  const errEl = document.getElementById('registerError');

  errEl.style.color = 'var(--red)';
  if (!name) { errEl.textContent = '⚠️ Enter your warrior name!'; return; }
  if (!email.includes('@')) { errEl.textContent = '⚠️ Enter a valid email!'; return; }
  if (!wa.startsWith('+62')) { errEl.textContent = '⚠️ WhatsApp must start with +62!'; return; }

  game.user = { name, email, whatsapp: wa };
  localStorage.setItem('rupiahPlayer', JSON.stringify(game.user));
  errEl.style.color = 'var(--green)';
  errEl.textContent = '✅ Welcome, ' + name + '!';

  if (hasBackend()) sendToSheets({ action: 'register', name, email, whatsapp: wa });

  setTimeout(() => {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('playerName').textContent = name;
    game.showMenu();
  }, 700);
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const errEl = document.getElementById('loginError');

  errEl.style.color = 'var(--red)';
  if (!email.includes('@')) { errEl.textContent = '⚠️ Enter a valid email!'; return; }

  const saved = localStorage.getItem('rupiahPlayer');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.email && p.email.toLowerCase() === email.toLowerCase()) {
        game.user = p;
        errEl.style.color = 'var(--green)'; errEl.textContent = '✅ Welcome back, ' + p.name + '!';
        setTimeout(() => {
          document.getElementById('loginModal').classList.add('hidden');
          document.getElementById('playerName').textContent = p.name;
          game.showMenu();
        }, 500);
        return;
      }
    } catch (e) {}
  }

  if (hasBackend()) {
    errEl.style.color = '#888'; errEl.textContent = 'Looking up profile...';
    try {
      const resp = await fetchWithTimeout(CONFIG.GOOGLE_SCRIPT_URL + '?action=login&email=' + encodeURIComponent(email), 5000);
      const data = await resp.json();
      if (data && data.name) {
        game.user = data; localStorage.setItem('rupiahPlayer', JSON.stringify(data));
        errEl.style.color = 'var(--green)'; errEl.textContent = '✅ Welcome back, ' + data.name + '!';
        setTimeout(() => {
          document.getElementById('loginModal').classList.add('hidden');
          document.getElementById('playerName').textContent = data.name;
          game.showMenu();
        }, 500);
        return;
      } else {
        errEl.style.color = 'var(--red)'; errEl.textContent = 'Email not found. Please register!';
      }
    } catch (e) { _guestLogin(email, errEl); }
  } else {
    _guestLogin(email, errEl);
  }
}

function _guestLogin(email, errEl) {
  errEl.style.color = 'var(--gold)'; errEl.textContent = '⚠️ Playing as guest (offline mode)';
  game.user = { name: 'Guest', email, whatsapp: '+62' };
  localStorage.setItem('rupiahPlayer', JSON.stringify(game.user));
  setTimeout(() => {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('playerName').textContent = 'Guest';
    game.showMenu();
  }, 900);
}

function showHowToPlay() { document.getElementById('howToPlay').classList.remove('hidden'); }
function hideHowToPlay() { document.getElementById('howToPlay').classList.add('hidden'); }
function showDonateModal() { document.getElementById('donateModal').classList.remove('hidden'); }
function hideDonateModal() { document.getElementById('donateModal').classList.add('hidden'); }

function shareWhatsApp() {
  const text = `🎮 RUPIAH VS DOLLAR — THE FINAL BOSS\n\nI scored ${game.score.toLocaleString()} defending the Rupiah!\nRate: Rp ${game.rate.toLocaleString()}\nWave: ${game.wave}/10\n\nCan you beat The Fed and Trump? 🇮🇩\nPlay: https://gochandra11.github.io/rupiah-vs-dollar\n\n@gochandra11 #RupiahVsDollar #IndonesiaGame`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
function shareInstagram() {
  const text = `I scored ${game.score.toLocaleString()} defending the Rupiah against The Fed & Trump! 🟠\nRate hit Rp ${game.rate.toLocaleString()}. Can you do better?\n\nPlay free at gochandra11.github.io/rupiah-vs-dollar 🇮🇩\n@gochandra11 #RupiahVsDollar #IndonesiaGame #GameIndonesia`;
  navigator.clipboard.writeText(text).then(() => alert('Caption copied! Paste in Instagram. Tag @gochandra11!'));
}
function shareTikTok() {
  const text = `Rupiah Challenge! Score ${game.score.toLocaleString()} defending against The Fed & Trump! 🟠\nRate: Rp ${game.rate.toLocaleString()}\n\nPlay at gochandra11.github.io/rupiah-vs-dollar\n@gochandra11 #RupiahChallenge #GameIndonesia #IndonesiaBanget`;
  navigator.clipboard.writeText(text).then(() => alert('Caption copied! Paste in TikTok. Tag @gochandra11!'));
}

/* ===== INIT ===== */
window.addEventListener('load', () => {
  game = new Game();

  const loadEl = document.getElementById('loadingModal');
  const bar = document.getElementById('loadingBar');
  const txt = document.getElementById('loadingText');
  loadEl.classList.remove('hidden');

  let progress = 0, step = 0;
  const msgs = CONFIG.LOADING_MESSAGES;
  const interval = setInterval(() => {
    progress += 20;
    bar.style.width = progress + '%';
    txt.textContent = msgs[step++] || '';
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        loadEl.classList.add('hidden');
        const saved = localStorage.getItem('rupiahPlayer');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            game.user = p;
            document.getElementById('playerName').textContent = p.name;
            game.showMenu();
          } catch (e) { document.getElementById('loginModal').classList.remove('hidden'); }
        } else {
          document.getElementById('loginModal').classList.remove('hidden');
        }
      }, 500);
    }
  }, 200);
});
