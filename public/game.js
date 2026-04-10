// ============================================================
// SCOOP STACK — Ice Cream Scoop Catching Game
// ============================================================

// ── Sound Effects (Web Audio API) ───────────────────────────

class GameSounds {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  _tone(freq, endFreq, duration, type = 'sine', vol = 0.15) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.01);
  }

  catch() {
    this._tone(500, 900, 0.12, 'sine', 0.13);
  }

  miss() {
    this._tone(300, 100, 0.3, 'sawtooth', 0.1);
  }

  gameOver() {
    [400, 300, 200].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, freq * 0.6, 0.3, 'sine', 0.13), i * 200);
    });
  }

  deliver() {
    // Ascending arpeggio — celebratory
    [500, 650, 800, 1000].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, freq * 1.3, 0.15, 'sine', 0.12), i * 80);
    });
  }

  perfectDeliver() {
    // Extra sparkly ascending arpeggio
    [600, 800, 1000, 1200, 1500].forEach((freq, i) => {
      setTimeout(() => this._tone(freq, freq * 1.4, 0.18, 'sine', 0.13), i * 70);
    });
  }
}

// ── Scoop Flavors ───────────────────────────────────────────

const FLAVORS = [
  { name: 'Vanilla',      base: '#FFF5CC', highlight: '#FFFDE8', shadow: '#E8D9A0' },
  { name: 'Strawberry',   base: '#FF8FAF', highlight: '#FFC0D4', shadow: '#D46A8A' },
  { name: 'Chocolate',    base: '#8B5E3C', highlight: '#A0724F', shadow: '#6B4428' },
  { name: 'Mint Chip',    base: '#7FDFB0', highlight: '#B0F0D0', shadow: '#5AB888' },
  { name: 'Cotton Candy', base: '#E0A0FF', highlight: '#F0D0FF', shadow: '#B878D8' },
  { name: 'Blueberry',    base: '#7090E0', highlight: '#A0B8FF', shadow: '#5068B0' },
  { name: 'Birthday Cake',base: '#FFD0E0', highlight: '#FFE8F0', shadow: '#D4A8B8' },
  { name: 'Caramel',      base: '#D4A040', highlight: '#E8C070', shadow: '#A87828' }
];

// ── Main Game Class ─────────────────────────────────────────

class ScoopGame {
  constructor(canvas, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks; // { onScoreUpdate, onLifeLost, onGameOver }
    this.sounds = new GameSounds();

    this.W = canvas.width;
    this.H = canvas.height;

    // Scale factor for different canvas sizes
    this.scale = this.W / 390;

    // Game constants (scaled)
    this.CONE_W = 70 * this.scale;
    this.CONE_H = 55 * this.scale;
    this.SCOOP_R = 26 * this.scale;
    this.INITIAL_SPEED = 4.0;
    this.MAX_SPEED = 8.0;
    this.SPEED_INC = 0.4;
    this.MAX_LIVES = 3;
    this.DELIVER_AT = 5;

    // State
    this.score = 0;
    this.lives = this.MAX_LIVES;
    this.fallSpeed = this.INITIAL_SPEED;
    this.cone = { x: this.W / 2, y: this.H - 60 * this.scale };
    this.scoops = [];       // falling scoops
    this.stack = [];        // caught scoops sitting on cone
    this.particles = [];
    this.bgSparkles = [];
    this.floatingTexts = []; // floating "+5" bonus texts
    this.shakeTimer = 0;
    this.running = false;
    this.started = false;
    this.gameOver = false;
    this.frameId = null;
    this.lastTime = 0;
    this.spawnTimer = 0;

    // Delivery animation state
    this.delivering = false;
    this.deliverTimer = 0;
    this.deliverStack = [];  // flavors flying off
    this.deliverY = 0;       // y-offset for flying scoops
    this.deliveries = 0;     // total deliveries completed
    this.stackMisses = 0;    // misses during current stack cycle

    // Touch/mouse state
    this.dragging = false;
    this.dragOffset = 0;

    // Create background sparkles
    for (let i = 0; i < 20; i++) {
      this.bgSparkles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        size: (1 + Math.random() * 2) * this.scale,
        speed: (0.2 + Math.random() * 0.4) * this.scale,
        opacity: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }

    this._bindInput();
  }

  // ── Input Handling ──────────────────────────────────────

  _bindInput() {
    this._onTouchStart = (e) => {
      e.preventDefault();
      if (!this.started) { this._startGame(); return; }
      if (this.gameOver) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = (t.clientX - rect.left) * (this.W / rect.width);
      this.dragging = true;
      this.dragOffset = x - this.cone.x;
    };

    this._onTouchMove = (e) => {
      e.preventDefault();
      if (!this.dragging || this.gameOver) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = (t.clientX - rect.left) * (this.W / rect.width);
      this.cone.x = Math.max(this.CONE_W / 2, Math.min(this.W - this.CONE_W / 2, x - this.dragOffset));
    };

    this._onTouchEnd = () => { this.dragging = false; };

    this._onMouseDown = (e) => {
      if (!this.started) { this._startGame(); return; }
      if (this.gameOver) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.W / rect.width);
      this.dragging = true;
      this.dragOffset = x - this.cone.x;
    };

    this._onMouseMove = (e) => {
      if (!this.dragging || this.gameOver) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.W / rect.width);
      this.cone.x = Math.max(this.CONE_W / 2, Math.min(this.W - this.CONE_W / 2, x - this.dragOffset));
    };

    this._onMouseUp = () => { this.dragging = false; };

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
  }

  _unbindInput() {
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
  }

  // ── Game Lifecycle ──────────────────────────────────────

  start() {
    this.running = true;
    this.started = false;
    this.gameOver = false;
    this.lastTime = performance.now();
    this._renderStartScreen();
    this._loop = this._loop.bind(this);
    this.frameId = requestAnimationFrame(this._loop);
  }

  _startGame() {
    this.sounds.init();
    this.started = true;
    this.score = 0;
    this.lives = this.MAX_LIVES;
    this.fallSpeed = this.INITIAL_SPEED;
    this.cone.x = this.W / 2;
    this.scoops = [];
    this.stack = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shakeTimer = 0;
    this.spawnTimer = 0;
    this.delivering = false;
    this.deliverTimer = 0;
    this.deliverStack = [];
    this.deliverY = 0;
    this.deliveries = 0;
    this.stackMisses = 0;
    if (this.cb.onScoreUpdate) this.cb.onScoreUpdate(0);
    if (this.cb.onLifeLost) this.cb.onLifeLost(this.MAX_LIVES);
  }

  destroy() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this._unbindInput();
  }

  // ── Game Loop ───────────────────────────────────────────

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 16.67, 3);
    this.lastTime = timestamp;

    if (this.started && !this.gameOver) {
      this._update(dt);
    }
    this._render();

    this.frameId = requestAnimationFrame(this._loop);
  }

  // ── Update ──────────────────────────────────────────────

  _update(dt) {
    // Update delivery animation (non-blocking — game keeps going)
    if (this.delivering) {
      this._updateDelivery(dt);
    }

    // Spawn scoops — multiple can be on screen at once
    this.spawnTimer -= dt;
    const baseDelay = Math.max(6, 22 - this.deliveries * 2);
    const randDelay = Math.max(3, 10 - this.deliveries);
    const spawnDelay = baseDelay + Math.random() * randDelay;
    // Allow multiple scoops: max on screen increases with deliveries
    const maxOnScreen = Math.min(4, 1 + Math.floor(this.deliveries / 2));
    if (this.spawnTimer <= 0 && this.scoops.length < maxOnScreen) {
      this._spawnScoop();
      this.spawnTimer = spawnDelay;
    }

    // Move falling scoops
    for (let i = this.scoops.length - 1; i >= 0; i--) {
      const s = this.scoops[i];
      s.y += this.fallSpeed * this.scale * dt;

      // Check catch — generous hitbox
      const catchY = this.cone.y - this.stack.length * this.SCOOP_R * 1.5;
      if (s.y + this.SCOOP_R >= catchY - 10 * this.scale &&
          s.y < catchY + 20 * this.scale &&
          Math.abs(s.x - this.cone.x) < this.CONE_W * 0.65) {
        // Caught!
        this.score++;
        this.stack.push(s.flavor);
        this.scoops.splice(i, 1);
        this.sounds.catch();
        this._spawnCatchParticles(s.x, catchY);

        if (this.cb.onScoreUpdate) this.cb.onScoreUpdate(this.score);

        // Check if stack is full — trigger delivery!
        if (this.stack.length >= this.DELIVER_AT) {
          this._triggerDelivery();
        }
        continue;
      }

      // Check miss — fell below screen
      if (s.y > this.H + this.SCOOP_R) {
        this.scoops.splice(i, 1);
        this.lives--;
        this.stackMisses++;
        this.shakeTimer = 8;
        this.sounds.miss();
        this._spawnMissParticles(s.x, this.H);

        if (this.cb.onLifeLost) this.cb.onLifeLost(this.lives);

        if (this.lives <= 0) {
          this.gameOver = true;
          this.sounds.gameOver();
          if (this.cb.onGameOver) this.cb.onGameOver(this.score);
          return;
        }
      }
    }

    this._updateParticlesAndSparkles(dt);
    this._updateFloatingTexts(dt);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
  }

  // ── Delivery Mechanic ───────────────────────────────────

  _triggerDelivery() {
    this.delivering = true;
    this.deliverTimer = 35;
    this.deliverStack = [...this.stack];
    this.stack = []; // clear immediately so new scoops land on fresh cone
    this.deliverY = 0;
    this.deliveries++;

    const isPerfect = this.stackMisses === 0;

    if (isPerfect) {
      // Perfect delivery bonus: +1 extra point
      this.score += 1;
      this.sounds.perfectDeliver();
      this.floatingTexts.push({
        text: 'Perfect! +1',
        x: this.cone.x,
        y: this.cone.y - this.DELIVER_AT * this.SCOOP_R * 1.5 - 20 * this.scale,
        vy: -1.5 * this.scale,
        life: 50,
        maxLife: 50,
        color: '#FFD700',
        size: 22
      });
    } else {
      this.sounds.deliver();
      this.floatingTexts.push({
        text: 'Delivered!',
        x: this.cone.x,
        y: this.cone.y - this.DELIVER_AT * this.SCOOP_R * 1.5 - 20 * this.scale,
        vy: -1.5 * this.scale,
        life: 40,
        maxLife: 40,
        color: '#C084FC',
        size: 18
      });
    }

    if (this.cb.onScoreUpdate) this.cb.onScoreUpdate(this.score);

    // Big celebration particles from the top of the stack
    const burstY = this.cone.y - this.DELIVER_AT * this.SCOOP_R * 1.5;
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 / 18) * i + Math.random() * 0.3;
      const speed = (3 + Math.random() * 4) * this.scale;
      this.particles.push({
        x: this.cone.x + (Math.random() - 0.5) * 30 * this.scale,
        y: burstY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3 * this.scale,
        color: ['#FF4FAF', '#FFD700', '#C084FC', '#34D399', '#FF8FAF', '#7090E0'][Math.floor(Math.random() * 6)],
        size: (3 + Math.random() * 4) * this.scale,
        life: 25 + Math.random() * 15
      });
    }

    // Speed up after each delivery
    if (this.fallSpeed < this.MAX_SPEED) {
      this.fallSpeed = Math.min(this.MAX_SPEED, this.fallSpeed + this.SPEED_INC);
    }
  }

  _updateDelivery(dt) {
    this.deliverTimer -= dt;
    // Scoops fly upward
    this.deliverY -= 6 * this.scale * dt;

    if (this.deliverTimer <= 0) {
      // Delivery complete — reset
      this.delivering = false;
      this.deliverStack = [];
      this.stackMisses = 0;
    }
  }

  _updateParticlesAndSparkles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.15 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (const s of this.bgSparkles) {
      s.y -= s.speed * dt;
      s.phase += 0.03 * dt;
      if (s.y < -10) { s.y = this.H + 10; s.x = Math.random() * this.W; }
    }
  }

  _updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _spawnScoop() {
    const flavor = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
    const margin = this.SCOOP_R + 10 * this.scale;
    this.scoops.push({
      x: margin + Math.random() * (this.W - margin * 2),
      y: -this.SCOOP_R,
      flavor,
      r: this.SCOOP_R
    });
  }

  _spawnCatchParticles(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 / 10) * i + Math.random() * 0.5;
      const speed = (2 + Math.random() * 3) * this.scale;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 * this.scale,
        color: ['#FF4FAF', '#FFD700', '#C084FC', '#34D399', '#FF8FAF'][Math.floor(Math.random() * 5)],
        size: (3 + Math.random() * 3) * this.scale,
        life: 18 + Math.random() * 10
      });
    }
  }

  _spawnMissParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI * 0.2 - Math.random() * Math.PI * 0.6;
      const speed = (1 + Math.random() * 2) * this.scale;
      this.particles.push({
        x, y: y - 10 * this.scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#FF6B6B',
        size: (2 + Math.random() * 2) * this.scale,
        life: 12 + Math.random() * 6
      });
    }
  }

  // ── Rendering ───────────────────────────────────────────

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.shakeTimer > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 8 * this.scale,
        (Math.random() - 0.5) * 8 * this.scale
      );
    }

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(0.5, '#2d1b4e');
    bg.addColorStop(1, '#1a1040');
    ctx.fillStyle = bg;
    ctx.fillRect(-10, -10, this.W + 20, this.H + 20);

    // Background sparkles
    for (const s of this.bgSparkles) {
      const alpha = s.opacity * (0.5 + 0.5 * Math.sin(s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!this.started) {
      this._renderStartScreen();
      ctx.restore();
      return;
    }

    // Draw cone
    this._drawCone(this.cone.x, this.cone.y);

    // Draw stacked scoops on cone
    for (let i = 0; i < this.stack.length; i++) {
      const flavor = this.stack[i];
      const wobble = Math.sin(performance.now() / 400 + i * 0.7) * (i * 1.0) * this.scale;
      const sy = this.cone.y - (i + 1) * this.SCOOP_R * 1.5;
      this._drawScoop(this.cone.x + wobble, sy, this.SCOOP_R, flavor);
    }

    // Draw delivering scoops (flying off upward)
    if (this.delivering) {
      const alpha = Math.max(0, this.deliverTimer / 20);
      ctx.globalAlpha = alpha;
      for (let i = 0; i < this.deliverStack.length; i++) {
        const flavor = this.deliverStack[i];
        const sy = this.cone.y - (i + 1) * this.SCOOP_R * 1.5 + this.deliverY;
        this._drawScoop(this.cone.x, sy, this.SCOOP_R, flavor);
      }
      ctx.globalAlpha = 1;
    }

    // Draw stack progress indicator (dots showing how many of 5)
    this._drawStackProgress();

    // Draw falling scoops
    for (const s of this.scoops) {
      this._drawScoop(s.x, s.y, s.r, s.flavor);
      // Draw shadow under falling scoop
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(s.x, this.cone.y + 10 * this.scale, this.SCOOP_R * 0.6, 4 * this.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw floating texts
    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${ft.size * this.scale}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Draw delivery count
    ctx.font = `bold ${13 * this.scale}px Fredoka, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Deliveries: ${this.deliveries}`, 12 * this.scale, 30 * this.scale);

    ctx.restore();
  }

  _drawStackProgress() {
    const ctx = this.ctx;
    const dotR = 5 * this.scale;
    const gap = 14 * this.scale;
    const startX = this.W - (this.DELIVER_AT * gap) - 8 * this.scale;
    const y = 25 * this.scale;

    for (let i = 0; i < this.DELIVER_AT; i++) {
      const filled = i < this.stack.length;
      ctx.beginPath();
      ctx.arc(startX + i * gap, y, dotR, 0, Math.PI * 2);
      if (filled) {
        ctx.fillStyle = '#FF4FAF';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5 * this.scale;
        ctx.stroke();
      }
    }
  }

  _renderStartScreen() {
    const ctx = this.ctx;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, this.H);
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(0.5, '#2d1b4e');
    bg.addColorStop(1, '#1a1040');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    // Sparkles
    for (const s of this.bgSparkles) {
      const alpha = s.opacity * (0.5 + 0.5 * Math.sin(s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title
    const bounce = Math.sin(performance.now() / 500) * 8 * this.scale;
    const centerY = this.H * 0.35 + bounce;

    // Big ice cream emoji
    ctx.font = `${80 * this.scale}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🍦', this.W / 2, centerY);

    // Game title
    ctx.font = `bold ${32 * this.scale}px Fredoka, sans-serif`;
    ctx.fillStyle = '#FF4FAF';
    ctx.fillText('Scoop Stack', this.W / 2, centerY + 60 * this.scale);

    // Subtitle
    ctx.font = `${16 * this.scale}px Nunito, sans-serif`;
    ctx.fillStyle = '#C084FC';
    ctx.fillText('Catch 5 scoops to deliver!', this.W / 2, centerY + 90 * this.scale);

    // Tap to start (pulsing)
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 400);
    ctx.globalAlpha = pulse;
    ctx.font = `bold ${20 * this.scale}px Fredoka, sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Tap to Start!', this.W / 2, this.H * 0.7);
    ctx.globalAlpha = 1;

    // Instructions
    ctx.font = `${13 * this.scale}px Nunito, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Drag the cone to catch scoops', this.W / 2, this.H * 0.78);
    ctx.fillText('Miss 3 and it\'s game over!', this.W / 2, this.H * 0.83);
  }

  _drawScoop(x, y, r, flavor) {
    const ctx = this.ctx;

    // Main circle
    ctx.fillStyle = flavor.base;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Highlight (top-left)
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, flavor.highlight);
    grad.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Shadow (bottom edge)
    ctx.fillStyle = flavor.shadow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0.2, Math.PI - 0.2);
    ctx.lineTo(x - r * 0.9, y + r * 0.3);
    ctx.arc(x, y, r * 0.95, Math.PI - 0.3, 0.3, true);
    ctx.closePath();
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Birthday cake gets sprinkle dots
    if (flavor.name === 'Birthday Cake') {
      const sprinkleColors = ['#FF4FAF', '#FFD700', '#34D399', '#7090E0', '#C084FC'];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + 0.3;
        const dist = r * 0.5;
        const sx = x + Math.cos(angle) * dist;
        const sy = y + Math.sin(angle) * dist;
        ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
        ctx.fillRect(sx - 1.5 * this.scale, sy - 0.5 * this.scale, 3 * this.scale, 1.5 * this.scale);
      }
    }
  }

  _drawCone(x, y) {
    const ctx = this.ctx;
    const w = this.CONE_W;
    const h = this.CONE_H;

    // Cone body (trapezoid)
    ctx.fillStyle = '#D4A040';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.lineTo(x - w * 0.1, y + h);
    ctx.closePath();
    ctx.fill();

    // Waffle pattern
    ctx.strokeStyle = '#B8852C';
    ctx.lineWidth = 1.2 * this.scale;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.lineTo(x - w * 0.1, y + h);
    ctx.closePath();
    ctx.clip();

    // Diagonal lines (left-to-right)
    for (let i = -3; i < 6; i++) {
      const offset = i * 12 * this.scale;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + offset, y);
      ctx.lineTo(x - w / 2 + offset - 15 * this.scale, y + h);
      ctx.stroke();
    }
    // Diagonal lines (right-to-left)
    for (let i = -3; i < 6; i++) {
      const offset = i * 12 * this.scale;
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + offset, y);
      ctx.lineTo(x - w / 2 + offset + 15 * this.scale, y + h);
      ctx.stroke();
    }
    ctx.restore();

    // Cone rim highlight
    ctx.strokeStyle = '#E8C070';
    ctx.lineWidth = 2 * this.scale;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.stroke();
  }
}
