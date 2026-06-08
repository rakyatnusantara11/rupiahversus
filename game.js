// =============================================
//  RUPIAH VS DOLLAR — game.js (Enhanced Edition)
//  Author: @gochandra11 | Redesign by AI Game Designer
//  Psychology: near-miss loops, combo dopamine, viral share hooks
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
  PLAYER_SPEED: 5.5,
  BULLET_SPEED: 11,
  ENEMY_SPEED_BASE: 1.1,
  SPAWN_RATE_BASE: 70,

  MAX_WAVES: 10,
  // [minion, elite, speculator, trump, boss] — boss wave hanya 1 boss + support
  WAVES: [
    { m: 10, e: 0,  s: 0, t: 0 }, // Wave 1 — intro
    { m: 14, e: 3,  s: 0, t: 0 }, // Wave 2 — elite intro
    { m: 18, e: 5,  s: 2, t: 0 }, // Wave 3 — speculator intro
    { m: 16, e: 6,  s: 2, t: 1 }, // Wave 4 — trump intro
    { m: 22, e: 8,  s: 3, t: 0 }, // Wave 5 — swarm
    { m: 20, e: 10, s: 3, t: 2 }, // Wave 6 — double trump
    { m: 26, e: 10, s: 5, t: 0 }, // Wave 7 — speculator chaos
    { m: 22, e: 14, s: 4, t: 2 }, // Wave 8 — elite + trump
    { m: 30, e: 16, s: 6, t: 3 }, // Wave 9 — survival
    { m: 0,  e: 5,  s: 3, t: 2, b: 1 }  // Wave 10 — THE FED + support
  ],

  SPECIAL_COOLDOWNS: { mbg: 16000, prabowo: 14000, panic: 22000 },

  LOADING_MESSAGES: [
    'The Fed is printing money...',
    'Trump is tweeting...',
    'BI Rate loading...',
    'Speculators detected...',
    'Rupiah assembling...',
    'Ready to defend! 🇮🇩'
  ]
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
  shoot() { this._play(880, 0.09, 'square', 0.04); }
  hit() { this._play(160, 0.18, 'sawtooth', 0.1); }
  explode() {
    this._play(100, 0.5, 'sawtooth', 0.2);
    setTimeout(() => this._play(55, 0.5, 'sawtooth', 0.15), 80);
  }
  powerup() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._play(f, 0.12, 'sine', 0.08), i * 100));
  }
  bossWarning() {
    for (let i = 0; i < 4; i++) setTimeout(() => this._play(180 + i * 40, 0.35, 'sawtooth', 0.25), i * 250);
  }
  trumpWarning() {
    for (let i = 0; i < 3; i++) setTimeout(() => this._play(300 - i * 50, 0.3, 'square', 0.2), i * 200);
  }
  special(type) {
    if (type === 'mbg') {
      [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this._play(f, 0.2, 'sine', 0.12), i * 150));
    } else if (type === 'prabowo') {
      for (let i = 0; i < 5; i++) setTimeout(() => this._play(130 + i * 60, 0.25, 'square', 0.18), i * 90);
    } else if (type === 'panic') {
      this._play(900, 0.1, 'sawtooth', 0.25); this._play(350, 0.8, 'sawtooth', 0.2);
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
  constructor(x, y, damage = 1, isLaser = false) {
    this.x = x; this.y = y; this.damage = damage; this.isLaser = isLaser;
    this.width = isLaser ? 3 : 5; this.height = isLaser ? 26 : 13;
    this.speed = isLaser ? 14 : CONFIG.BULLET_SPEED;
    this.color = isLaser ? '#00ff88' : '#ffc107'; this.active = true;
  }
  update() { this.y -= this.speed; if (this.y < -20) this.active = false; }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.isLaser ? 14 : 8;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    ctx.shadowBlur = 0;
  }
}

/* ===== STAR BACKGROUND ===== */
class StarField {
  constructor(count = 100) {
    this.stars = [];
    for (let i = 0; i < count; i++) this.stars.push(this._mk());
  }
  _mk() {
    return {
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.0004 + 0.0001,
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
    const wm = 1 + (wave * 0.14); // wave multiplier, slightly gentler
    switch (type) {
      case 'minion':
        this.hp = this.maxHp = Math.ceil(1.2 * wm);
        this.speed = CONFIG.ENEMY_SPEED_BASE * (1 + Math.random() * 0.6);
        this.damage = 45; this.score = 100; this.width = 40; this.height = 40;
        this.color = '#85bb65'; break;
      case 'elite':
        this.hp = this.maxHp = Math.ceil(5 * wm);
        this.speed = CONFIG.ENEMY_SPEED_BASE * 0.7;
        this.damage = 140; this.score = 350; this.width = 50; this.height = 60;
        this.color = '#2e7d32'; break;
      case 'speculator':
        this.hp = this.maxHp = Math.ceil(3.5 * wm);
        this.speed = CONFIG.ENEMY_SPEED_BASE * 1.7;
        this.damage = 180; this.score = 600; this.width = 38; this.height = 38;
        this.color = '#c77dff'; this.invisible = true; this.visibleTimer = 0; break;
      case 'trump':
        this.hp = this.maxHp = Math.ceil(22 * wm);
        this.speed = CONFIG.ENEMY_SPEED_BASE * 0.9;
        this.damage = 250; this.score = 1200; this.width = 56; this.height = 72;
        this.color = '#ff8c00'; this.attackTimer = 0; break;
      case 'boss':
        this.hp = this.maxHp = Math.ceil(140 * wm);
        this.speed = 0.42;
        this.damage = 600; this.score = 8000; this.width = 130; this.height = 110;
        this.color = '#ff2055'; this.y = -140; this.attackTimer = 0; break;
    }
  }
  update(game) {
    if (this.frozen) return;
    this.y += this.speed;
    if (this.flash > 0) this.flash--;
    if (this.type === 'boss') {
      this.attackTimer++;
      if (this.attackTimer > 160) { this.attackTimer = 0; game.bossAttack(); }
      this.x += Math.sin(Date.now() / 800) * 2.6;
      this.x = Math.max(70, Math.min(game.canvas.width - 70, this.x));
    }
    if (this.type === 'trump') {
      this.attackTimer++;
      if (this.attackTimer > 140) { this.attackTimer = 0; game.trumpAttack(); }
      this.x += Math.sin(Date.now() / 600) * 1.8;
    }
    if (this.type === 'speculator') {
      this.visibleTimer++;
      if (this.visibleTimer > 90) { this.invisible = !this.invisible; this.visibleTimer = 0; }
    }
    if (this.y > game.canvas.height + 70) {
      this.active = false;
      game.damageRate(this.damage);
    }
  }
  draw(ctx) {
    const alpha = (this.type === 'speculator' && this.invisible) ? 0.2 : 1;
    const flashAlpha = this.flash > 0 ? Math.min(alpha, 0.4) : alpha;
    ctx.globalAlpha = flashAlpha;
    ctx.save(); ctx.translate(this.x, this.y);

    if (this.type === 'minion') {
      // Dollar coin shape
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffc107'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e8f5e9';
      ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 5);
      // Eyes
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath(); ctx.arc(-7, -6, 2.5, 0, Math.PI * 2); ctx.arc(7, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      // Mouth
      ctx.beginPath(); ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 1.5;
      ctx.arc(0, 2, 5, 0, Math.PI); ctx.stroke();

    } else if (this.type === 'elite') {
      // Dollar bill shape
      ctx.fillStyle = '#1b5e20';
      this._roundRect(ctx, -25, -30, 50, 60, 3); ctx.fill();
      ctx.strokeStyle = '#ffc107'; ctx.lineWidth = 2;
      this._roundRect(ctx, -25, -30, 50, 60, 3); ctx.stroke();
      // Inner border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      this._roundRect(ctx, -21, -26, 42, 52, 2); ctx.stroke();
      // $100 text
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$100', 0, 4);
      // Eyes
      ctx.fillStyle = '#a5d6a7';
      ctx.beginPath(); ctx.arc(-10, -12, 3, 0, Math.PI * 2); ctx.arc(10, -12, 3, 0, Math.PI * 2); ctx.fill();
      // Mouth serious
      ctx.beginPath(); ctx.strokeStyle = '#a5d6a7'; ctx.lineWidth = 1.5;
      ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.stroke();

    } else if (this.type === 'speculator') {
      ctx.fillStyle = this.color; ctx.shadowBlur = 16; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👻', 0, 5);

    } else if (this.type === 'trump') {
      // 8-bit Trump style
      // Hair (orange blocky)
      ctx.fillStyle = '#ff8c00'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff8c00';
      ctx.fillRect(-22, -34, 44, 14);
      ctx.fillRect(-26, -28, 52, 10);
      ctx.fillRect(-18, -38, 36, 8);
      ctx.shadowBlur = 0;
      // Face
      ctx.fillStyle = '#ffccaa';
      ctx.fillRect(-18, -20, 36, 32);
      // Suit
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(-20, 12, 40, 24);
      // Red tie
      ctx.fillStyle = '#d50000';
      ctx.fillRect(-4, 12, 8, 20);
      // Eyes (8-bit squares)
      ctx.fillStyle = '#fff'; ctx.fillRect(-12, -14, 8, 6); ctx.fillRect(4, -14, 8, 6);
      ctx.fillStyle = '#000'; ctx.fillRect(-10, -12, 4, 4); ctx.fillRect(6, -12, 4, 4);
      // Mouth
      ctx.fillStyle = '#d50000'; ctx.fillRect(-6, -2, 12, 3);
      // Label
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px "Orbitron", monospace'; ctx.textAlign = 'center'; ctx.fillText('TRUMP', 0, 42);
      // HP bar
      const hp = this.hp / this.maxHp;
      ctx.fillStyle = '#222'; this._roundRect(ctx, -24, -48, 48, 6, 2); ctx.fill();
      ctx.fillStyle = hp > 0.5 ? '#00ff88' : hp > 0.25 ? '#ffc107' : '#ff2055';
      this._roundRect(ctx, -24, -48, 48 * hp, 6, 2); ctx.fill();

    } else if (this.type === 'boss') {
      // Body
      ctx.fillStyle = '#1a0505';
      ctx.beginPath(); this._roundRect(ctx, -65, -55, 130, 110, 10); ctx.fill();
      // Face glow
      ctx.fillStyle = this.color; ctx.shadowBlur = 28; ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(0, -10, 48, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      // Eyes white
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-18, -24, 14, 0, Math.PI * 2); ctx.arc(18, -24, 14, 0, Math.PI * 2); ctx.fill();
      // Eyes pupil
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-16, -24, 6, 0, Math.PI * 2); ctx.arc(20, -24, 6, 0, Math.PI * 2); ctx.fill();
      // Red pupils
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(-15, -25, 3, 0, Math.PI * 2); ctx.arc(21, -25, 3, 0, Math.PI * 2); ctx.fill();
      // Legs
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(-56, 24, 20, 46); ctx.fillRect(36, 24, 20, 46);
      ctx.fillStyle = '#5d4037'; ctx.fillRect(-66, 14, 46, 18); ctx.fillRect(20, 14, 46, 18);
      // Label
      ctx.fillStyle = '#ffc107'; ctx.shadowBlur = 10; ctx.shadowColor = '#ffc107';
      ctx.font = 'bold 13px "Orbitron", monospace'; ctx.textAlign = 'center'; ctx.fillText('THE FED', 0, 36); ctx.shadowBlur = 0;
      // HP bar
      const hp = this.hp / this.maxHp;
      ctx.fillStyle = '#222'; this._roundRect(ctx, -58, -82, 116, 10, 4); ctx.fill();
      ctx.fillStyle = hp > 0.5 ? '#00ff88' : hp > 0.25 ? '#ffc107' : '#ff2055';
      this._roundRect(ctx, -58, -82, 116 * hp, 10, 4); ctx.fill();
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
  takeDamage(dmg, game) {
    this.hp -= dmg; this.flash = 6;
    if (this.hp <= 0) {
      this.active = false;
      game.addScore(this.score);
      game.addParticles(this.x, this.y, this.color, 16);
      game.audio.explode();
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
    if (this.shootTimer > 48) {
      this.shootTimer = 0;
      game.bullets.push(new Bullet(this.x, this.y - 18, 1, false));
    }
    this.x += (game.player.x - this.x) * 0.018;
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
    this.stars = new StarField(120);

    this.state = 'loading';
    this.player = { x: 0, y: 0, width: 54, height: 54, hp: 100, maxHp: 100 };
    this._reset();

    this.user = null;
    this.leaderboard = [];
    this.keys = {};
    this.screenShake = 0;
    this.bossWarningShown = false;
    this.trumpWarningShown = false;

    this.resize();
    this.setupInput();
    this._boundLoop = this._loop.bind(this);
    requestAnimationFrame(this._boundLoop);
  }

  _reset() {
    this.bullets = []; this.enemies = []; this.allies = []; this.particles = [];
    this.rate = CONFIG.START_RATE; this.score = 0; this.wave = 1;
    this.enemiesKilled = 0; this.enemiesSpawned = 0; this.spawnTimer = 0;
    this.energy = CONFIG.MAX_ENERGY; this.player.hp = CONFIG.MAX_HP;
    this.upgrades = { laser: 0, shield: 0, export: 0, subsidy: 0 };
    this.points = 0;
    this.specialCooldowns = { mbg: 0, prabowo: 0, panic: 0 };
    this.specialActive = { mbg: false, prabowo: false };
    this.specialTimers = { mbg: 0, prabowo: 0 };
    this.shootTimer = 0;
    this.invincible = false;
    this.bossWarningShown = false;
    this.trumpWarningShown = false;
    this.combo = 0; this.comboTimer = 0;
    this.waveEnemyQueue = [];
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
    this.bullets.push(new Bullet(this.player.x, this.player.y - 22, dmg, isLaser));
    if (this.upgrades.laser >= 2) {
      this.bullets.push(new Bullet(this.player.x - 16, this.player.y - 12, dmg, isLaser));
      this.bullets.push(new Bullet(this.player.x + 16, this.player.y - 12, dmg, isLaser));
    }
    this.audio.shoot();
  }

  start() {
    this._reset();
    this.state = 'playing';
    this._show('hud'); this._show('specialMoves'); this._show('waveProgress');
    this._hide('mainMenu');
    if (window.innerWidth < 600 || window.innerHeight < 500)
      document.getElementById('touchControls').style.display = 'flex';
    this.audio.resume();
    this._buildWaveQueue();
  }

  restart() { this._hide('endScreen'); this.showMenu(); }

  showMenu() {
    this.state = 'menu';
    this._show('mainMenu');
    this._hide('hud'); this._hide('specialMoves'); this._hide('waveProgress');
    document.getElementById('touchControls').style.display = 'none';
    this.loadLeaderboard();
  }

  _show(id) { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); }
  _hide(id) { const el = document.getElementById(id); if(el) el.classList.add('hidden'); }

  _buildWaveQueue() {
    const w = CONFIG.WAVES[Math.min(this.wave - 1, CONFIG.WAVES.length - 1)];
    this.waveEnemyQueue = [];
    for (let i = 0; i < (w.m || 0); i++) this.waveEnemyQueue.push('minion');
    for (let i = 0; i < (w.e || 0); i++) this.waveEnemyQueue.push('elite');
    for (let i = 0; i < (w.s || 0); i++) this.waveEnemyQueue.push('speculator');
    for (let i = 0; i < (w.t || 0); i++) this.waveEnemyQueue.push('trump');
    if (w.b) this.waveEnemyQueue.push('boss');
    // Shuffle queue for variety
    for (let i = this.waveEnemyQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.waveEnemyQueue[i], this.waveEnemyQueue[j]] = [this.waveEnemyQueue[j], this.waveEnemyQueue[i]];
    }
  }

  _spawnEnemy() {
    const w = CONFIG.WAVES[Math.min(this.wave - 1, CONFIG.WAVES.length - 1)];
    // Trump warning on first trump of wave
    if ((w.t || 0) > 0 && !this.trumpWarningShown && this.waveEnemyQueue.length > 0 && this.waveEnemyQueue.includes('trump')) {
      // Check if next spawned is trump and we haven't warned
      const next = this.waveEnemyQueue[this.waveEnemyQueue.length - 1];
      if (next === 'trump') { this.trumpWarningShown = true; this._showTrumpWarning(); return; }
    }
    if (this.waveEnemyQueue.length === 0) return;
    const type = this.waveEnemyQueue.pop();
    this.enemies.push(new Enemy(type, this.wave, this.canvas.width, this.canvas.height));
    this.enemiesSpawned++;
  }

  _showBossWarning() {
    this._show('bossWarning');
    this.audio.bossWarning();
    setTimeout(() => {
      this._hide('bossWarning');
      // Boss spawned via queue already, but if not, force it
      if (!this.enemies.some(e => e.type === 'boss')) {
        this.enemies.push(new Enemy('boss', this.wave, this.canvas.width, this.canvas.height));
        this.enemiesSpawned++;
      }
    }, 3000);
  }

  _showTrumpWarning() {
    this._show('trumpWarning');
    this.audio.trumpWarning();
    setTimeout(() => this._hide('trumpWarning'), 2500);
  }

  bossAttack() {
    this.screenShake = 26;
    this.addParticles(this.canvas.width / 2, this.canvas.height / 2, '#ff2055', 45);
    this.damageRate(350);
    this._floatText(this.canvas.width / 2, this.canvas.height / 2, 'RATE HIKE!', '#ff2055');
    const f = document.getElementById('screenFlash');
    f.style.background = '#ff2055'; f.classList.add('active');
    setTimeout(() => f.classList.remove('active'), 220);
  }

  trumpAttack() {
    this.screenShake = 18;
    this.damageRate(200);
    this._floatText(this.canvas.width / 2, this.canvas.height / 2, 'TARIFF!', '#ff8c00');
    const f = document.getElementById('screenFlash');
    f.style.background = '#ff8c00'; f.classList.add('active');
    setTimeout(() => f.classList.remove('active'), 180);
  }

  damageRate(amount) {
    if (this.invincible || this.specialActive.mbg) return;
    const reduction = this.upgrades.shield * 0.15;
    const actual = Math.max(0, Math.floor(amount * (1 - reduction)));
    this.rate += actual;
    if (actual > 0) this._floatText(this.player.x, this.player.y - 55, '+' + actual.toLocaleString(), '#ff2055');
    if (this.rate >= CONFIG.DEATH_RATE) this.gameOver(false);
  }

  addScore(pts) {
    this.combo++;
    this.comboTimer = 100;
    const multiplier = Math.min(this.combo, 6);
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
      this.particles.push(new Particle(x, y, color, 6, 35 + Math.random() * 25, 3 + Math.random() * 3));
  }

  _floatText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.cssText = `left:${x}px;top:${y}px;color:${color};`;
    el.textContent = text;
    document.getElementById('gameContainer').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  activateSpecial(type) {
    if (this.state !== 'playing') return;
    const now = Date.now();
    if (type === 'mbg') {
      if (now - this.specialCooldowns.mbg < CONFIG.SPECIAL_COOLDOWNS.mbg) return;
      this.specialCooldowns.mbg = now; this.specialActive.mbg = true; this.specialTimers.mbg = 10000;
      this._showSpecialOverlay('🍚 MBG SHIELD!', '#00ff88'); this.audio.special('mbg');
      this._floatText(this.canvas.width / 2, this.canvas.height / 3, 'RAKYAT HAPPY!', '#00ff88');
    } else if (type === 'prabowo') {
      if (now - this.specialCooldowns.prabowo < CONFIG.SPECIAL_COOLDOWNS.prabowo) return;
      this.specialCooldowns.prabowo = now; this.specialActive.prabowo = true; this.specialTimers.prabowo = 5000;
      this._showSpecialOverlay('🦁 SWASEMBADA!', '#ff8c00'); this.audio.special('prabowo');
      this.enemies.forEach(e => e.frozen = true);
    } else if (type === 'panic') {
      if (now - this.specialCooldowns.panic < CONFIG.SPECIAL_COOLDOWNS.panic) return;
      this.specialCooldowns.panic = now;
      this._showSpecialOverlay('💥 PANIC SELL!', '#ff2055'); this.audio.special('panic');
      this.enemies.forEach(e => { this.addParticles(e.x, e.y, e.color, 18); this.addScore(e.score); });
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
    ['mbg', 'prabowo', 'panic'].forEach(t => {
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
    const costs = { laser: 450 * (lvl + 1), shield: 450 * (lvl + 1), export: 700 * (lvl + 1), subsidy: 250 * (lvl + 1) };
    if (this.points >= costs[type]) {
      this.points -= costs[type]; this.upgrades[type]++;
      this.audio.powerup();
      if (type === 'export') {
        this.allies.push(new Ally(this.player.x + (Math.random() - 0.5) * 120, this.player.y - 40));
      } else if (type === 'subsidy') {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
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
      const base = { laser: 450, shield: 450, export: 700, subsidy: 250 };
      document.getElementById('cost' + t[0].toUpperCase() + t.slice(1)).textContent =
        (base[t] * (lvl + 1)).toLocaleString() + ' PTS';
      document.getElementById('lvl' + t[0].toUpperCase() + t.slice(1)).textContent = 'LV ' + lvl;
    });
  }

  nextWave() {
    if (this.wave >= CONFIG.MAX_WAVES) { this._victory(); return; }
    this.wave++; this.enemiesKilled = 0; this.enemiesSpawned = 0;
    this.trumpWarningShown = false; this.bossWarningShown = false;
    this.state = 'playing';
    this._hide('upgradeShop');
    this._buildWaveQueue();
  }

  _showUpgradeShop() {
    this.state = 'shop';
    this._updateShopUI();
    this._show('upgradeShop');
  }

  gameOver(victory) {
    this.state = victory ? 'victory' : 'gameover';
    this._hide('hud'); this._hide('specialMoves'); this._hide('waveProgress');
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
      endMeme.textContent = '"Rupiah Strong! The Fed & Trump are defeated! Bank Indonesia menang!"';
      shareScreen.style.borderColor = '#00ff88';
      shareScreen.style.boxShadow = '0 0 50px rgba(0,255,136,0.3)';
    } else {
      endTitle.textContent = '💀 DEFEAT'; endTitle.style.color = '#ff2055';
      endRate.textContent = 'Rp ' + this.rate.toLocaleString(); endRate.style.color = '#ff2055';
      endResult.textContent = 'RUPIAH KO!'; endResult.style.color = '#ff2055';
      if (this.rate >= 20000) {
        endMeme.textContent = '"Rp 20,000... Indonesia Pusaka plays softly... 😭"';
      } else if (this.wave >= 4 && this.enemies.some(e => e.type === 'trump')) {
        endMeme.textContent = '"Trump tweeted. Rupiah cried. Time to buy gold? 😭"';
      } else {
        endMeme.textContent = '"The Fed was too strong... Stack gold? 😭"';
      }
      shareScreen.style.borderColor = '#ff2055';
      shareScreen.style.boxShadow = '0 0 50px rgba(255,32,85,0.3)';
    }
    document.getElementById('endScore').textContent = this.score.toLocaleString();
    document.getElementById('endWaves').textContent = this.wave + '/' + CONFIG.MAX_WAVES;
    this._saveScore();
  }

  _victory() { this.gameOver(true); }

  // ===== MAIN UPDATE =====
  _update() {
    if (this.state !== 'playing') return;
    const spd = CONFIG.PLAYER_SPEED;

    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.x -= spd;
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.x += spd;
    if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.player.y -= spd;
    if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.player.y += spd;

    this.player.x = Math.max(28, Math.min(this.canvas.width - 28, this.player.x));
    this.player.y = Math.max(55, Math.min(this.canvas.height - 55, this.player.y));

    // Auto-shoot
    this.shootTimer++;
    const fireRate = Math.max(7, 26 - this.upgrades.laser * 5);
    if (this.shootTimer >= fireRate) { this.shootTimer = 0; this._shoot(); }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) {
        this.combo = 0;
        document.getElementById('comboDisplay').classList.add('hidden');
      }
    }

    // Spawn logic
    const w = CONFIG.WAVES[Math.min(this.wave - 1, CONFIG.WAVES.length - 1)];
    const totalInWave = (w.m || 0) + (w.e || 0) + (w.s || 0) + (w.t || 0) + (w.b || 0);
    this.spawnTimer++;
    const spawnRate = Math.max(16, CONFIG.SPAWN_RATE_BASE - this.wave * 5);
    if (this.spawnTimer >= spawnRate && this.enemiesSpawned < totalInWave) {
      this.spawnTimer = 0; this._spawnEnemy();
    }

    // Wave complete — BUG FIX: removed enemiesKilled requirement that caused softlock
    if (this.enemiesSpawned >= totalInWave && this.enemies.length === 0) {
      if (this.wave >= CONFIG.MAX_WAVES) this._victory();
      else this._showUpgradeShop();
    }

    // Update bullets
    this.bullets = this.bullets.filter(b => b.active);
    this.bullets.forEach(b => b.update());

    // Update enemies + collisions
    this.enemies = this.enemies.filter(e => e.active);
    this.enemies.forEach(e => {
      e.update(this);
      // Enemy vs player
      if (!this.specialActive.mbg) {
        const dx = e.x - this.player.x, dy = e.y - this.player.y;
        if (Math.sqrt(dx * dx + dy * dy) < 34) {
          this.player.hp -= 10; e.active = false;
          this.addParticles(e.x, e.y, '#ff2055', 12); this.audio.hit();
          this._floatText(this.player.x, this.player.y - 40, '-10 HP', '#ff2055');
          if (this.player.hp <= 0) this.gameOver(false);
        }
      }
      // Bullet vs enemy
      this.bullets.forEach(b => {
        if (!b.active || !e.active) return;
        const bdx = b.x - e.x, bdy = b.y - e.y;
        const hitDist = e.type === 'boss' ? 36 : 24;
        if (Math.sqrt(bdx * bdx + bdy * bdy) < hitDist) {
          b.active = false;
          if (e.takeDamage(b.damage, this)) this.enemiesKilled++;
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
    if (this.specialActive.mbg) { this.specialTimers.mbg -= 16; if (this.specialTimers.mbg <= 0) this.specialActive.mbg = false; }
    if (this.specialActive.prabowo) {
      this.specialTimers.prabowo -= 16;
      if (this.specialTimers.prabowo <= 0) { this.specialActive.prabowo = false; this.enemies.forEach(e => e.frozen = false); }
    }

    this._updateSpecialUI();
    if (this.screenShake > 0) this.screenShake--;
    if (this.energy < 100) this.energy += 0.04;
    this._updateHUD(totalInWave);
  }

  _updateHUD(totalInWave) {
    document.getElementById('rateValue').textContent = this.rate.toLocaleString();
    document.getElementById('rateDisplay').classList.toggle('danger', this.rate > 18500);
    const hpPct = this.player.hp / this.player.maxHp * 100;
    document.getElementById('hpFill').style.width = hpPct + '%';
    document.getElementById('hpFill').style.backgroundPosition = (100 - hpPct) + '% 0';
    document.getElementById('hpText').textContent = Math.ceil(this.player.hp);
    document.getElementById('energyFill').style.width = this.energy + '%';
    document.getElementById('waveNum').textContent = this.wave + '/' + CONFIG.MAX_WAVES;
    document.getElementById('scoreVal').textContent = this.score.toLocaleString();
    // Wave progress bar
    const killedOrEscaped = this.enemiesSpawned - this.enemies.length;
    const pct = totalInWave > 0 ? (killedOrEscaped / totalInWave) * 100 : 0;
    document.getElementById('waveProgressFill').style.width = pct + '%';
  }

  // ===== MAIN DRAW =====
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
    bg.addColorStop(0, '#03030c'); bg.addColorStop(1, '#0a0a1e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.draw(ctx, w, h);

    // Perspective grid
    ctx.lineWidth = 1;
    for (let i = 0; i <= w; i += 48) {
      const a = 0.02 + (i / w) * 0.04;
      ctx.strokeStyle = `rgba(0,255,136,${a})`;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i <= h; i += 48) {
      const a = 0.015 + (i / h) * 0.045;
      ctx.strokeStyle = `rgba(0,255,136,${a})`;
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Ground line
    const gl = ctx.createLinearGradient(0, 0, w, 0);
    gl.addColorStop(0, 'transparent'); gl.addColorStop(0.5, 'rgba(0,255,136,0.3)'); gl.addColorStop(1, 'transparent');
    ctx.strokeStyle = gl; ctx.lineWidth = 1.5;
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

    // MBG shield ring
    if (this.specialActive.mbg) {
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2.5;
      ctx.shadowBlur = 24; ctx.shadowColor = '#00ff88';
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,255,136,0.08)';
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Coin outer glow
    ctx.shadowBlur = 20; ctx.shadowColor = '#ffc107';
    ctx.fillStyle = '#ffc107';
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Coin inner
    ctx.fillStyle = '#ffd740';
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();

    // Coin border
    ctx.strokeStyle = '#e6a800'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();

    // Rp text
    ctx.fillStyle = '#5c3300';
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Rp', 0, 5);

    // Face
    ctx.fillStyle = '#3a1f00';
    ctx.beginPath(); ctx.arc(-8, -10, 3, 0, Math.PI * 2); ctx.arc(8, -10, 3, 0, Math.PI * 2); ctx.fill();

    // Mouth
    ctx.beginPath(); ctx.strokeStyle = '#3a1f00'; ctx.lineWidth = 2;
    if (this.rate > 18000) {
      ctx.arc(0, 8, 6, Math.PI, 0); // frown
    } else {
      ctx.arc(0, 3, 6, 0, Math.PI); // smile
    }
    ctx.stroke();
    ctx.restore();
  }

  _loop() {
    this._update();
    this._draw();
    requestAnimationFrame(this._boundLoop);
  }

  // ===== BACKEND =====
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
      { name: 'RupiahWarrior', score: 25000, wave: 8 },
      { name: 'DollarSlayer', score: 18000, wave: 6 },
      { name: 'BIAgent', score: 12000, wave: 5 }
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
  const text = `🎮 RUPIAH VS DOLLAR!

Score: ${game.score.toLocaleString()} pts
Exchange Rate: Rp ${game.rate.toLocaleString()}
Wave: ${game.wave}/${CONFIG.MAX_WAVES}

Bisa kamu kalahkan The Fed & Trump? 🇮🇩
Play: https://gochandra11.github.io/rupiah-vs-dollar

@gochandra11 #RupiahVsDollar`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}
function shareInstagram() {
  const text = `I scored ${game.score.toLocaleString()} defending the Rupiah! Rate hit Rp ${game.rate.toLocaleString()}. Wave ${game.wave}/${CONFIG.MAX_WAVES}. Can you do better?

Play free at gochandra11.github.io/rupiah-vs-dollar 🇮🇩
@gochandra11 #RupiahVsDollar #IndonesiaGame #GameIndonesia`;
  navigator.clipboard.writeText(text).then(() => alert('Caption copied! Paste in Instagram. Tag @gochandra11!'));
}
function shareTikTok() {
  const text = `Rupiah Challenge! Score ${game.score.toLocaleString()} defending against The Fed & Trump! Rp ${game.rate.toLocaleString()}

Play at gochandra11.github.io/rupiah-vs-dollar
@gochandra11 #RupiahChallenge #GameIndonesia #IndonesiaBanget`;
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
    progress += 18;
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
  }, 220);
});
