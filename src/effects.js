'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  EFFECTS — Sparks, Smoke, Shockwave, ScreenShake, BloodSplat
// ═══════════════════════════════════════════════════════════════════════════════

class Spark {
  constructor(x, y, opts = {}) {
    const angle  = opts.angle ?? Math.random() * Math.PI * 2;
    const speed  = (opts.speed ?? 200) * (0.4 + Math.random() * 0.8);
    this.x  = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (opts.upBias ?? 60);
    this.life    = opts.life ?? (0.3 + Math.random() * 0.5);
    this.maxLife = this.life;
    this.size    = opts.size ?? (2 + Math.random() * 3);
    this.color   = opts.color ?? '#ff9800';
    this.square  = opts.square ?? (Math.random() > 0.5);
  }

  update(dt) {
    this.x  += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.93;         this.vy  = this.vy * 0.93 + 200 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle   = this.color;
    if (this.square) {
      const s = this.size * t;
      ctx.fillRect(this.x - s/2, this.y - s/2, s, s);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * t * 0.8, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

class SmokeParticle {
  constructor(x, y, opts = {}) {
    this.x    = x + (Math.random()-0.5)*20;
    this.y    = y + (Math.random()-0.5)*10;
    this.vx   = (Math.random()-0.5)*30;
    this.vy   = -(20 + Math.random()*40);
    this.size = opts.size ?? (10 + Math.random()*20);
    this.life    = opts.life ?? (0.8 + Math.random()*0.6);
    this.maxLife = this.life;
    this.dark = opts.dark ?? false;
  }

  update(dt) {
    this.x    += this.vx * dt; this.y  += this.vy * dt;
    this.vx   *= 0.98;        this.vy *= 0.97;
    this.size += 12 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    const v = this.dark ? 30 : 160;
    ctx.save();
    ctx.globalAlpha = t * 0.4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

class Shockwave {
  constructor(x, y, maxRadius, opts = {}) {
    this.x          = x; this.y = y;
    this.maxRadius  = maxRadius;
    this.radius     = 0;
    this.life       = opts.life ?? 0.4;
    this.maxLife    = this.life;
    this.color      = opts.color ?? '#ff9800';
    this.lineWidth  = opts.lw ?? 3;
  }

  update(dt) {
    this.radius  = this.maxRadius * (1 - this.life / this.maxLife);
    this.life   -= dt;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = t * 0.7;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.lineWidth * t;
    ctx.stroke();
    // Second inner ring
    if (this.radius > 20) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI*2);
      ctx.globalAlpha = t * 0.3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

class TextPop {
  constructor(x, y, text, opts = {}) {
    this.x    = x; this.y = y;
    this.text = text;
    this.life = opts.life ?? 1.2;
    this.maxLife = this.life;
    this.color = opts.color ?? '#fff';
    this.font  = opts.font  ?? 'bold 18px Outfit, sans-serif';
    this.vy    = -60;
  }

  update(dt) { this.y += this.vy * dt; this.vy *= 0.95; this.life -= dt; }

  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.font        = this.font;
    ctx.fillStyle   = this.color;
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

class ExplosionFlash {
  constructor(x, y, radius) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.life = 0.08;
    this.maxLife = 0.08;
  }

  update(dt) { this.life -= dt; }

  draw(ctx) {
    const t = this.life / this.maxLife;
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.2);
    grd.addColorStop(0,   `rgba(255,255,220,${t})`);
    grd.addColorStop(0.3, `rgba(255,180,50,${t*0.8})`);
    grd.addColorStop(1,   `rgba(255,80,0,0)`);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI*2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

// ─── SCREEN SHAKE ─────────────────────────────────────────────────────────────
class ScreenShake {
  constructor() { this.intensity = 0; this.x = 0; this.y = 0; }

  add(strength) { this.intensity = Math.min(this.intensity + strength, 30); }

  update(dt) {
    if (this.intensity < 0.1) { this.intensity = 0; this.x = 0; this.y = 0; return; }
    this.intensity *= Math.pow(0.01, dt);
    this.x = (Math.random()-0.5) * this.intensity * 2;
    this.y = (Math.random()-0.5) * this.intensity * 2;
  }
}

// ─── BLOOD DROPLET & STAIN ───────────────────────────────────────────────────
class BloodParticle {
  constructor(x, y, opts = {}) {
    const angle = opts.angle ?? (Math.random() * Math.PI * 2);
    const speed = (opts.speed ?? 180) * (0.3 + Math.random() * 0.9);
    this.x     = x;
    this.y     = y;
    this.vx    = Math.cos(angle) * speed;
    this.vy    = Math.sin(angle) * speed - 40;
    this.radius= opts.radius ?? (2.5 + Math.random() * 3);
    this.color = opts.color ?? '#d32f2f';
    this.life  = opts.life ?? (0.6 + Math.random() * 0.8);
    this.maxLife = this.life;
    this.groundY = opts.groundY ?? 560;
    this.splatted = false;
  }

  update(dt) {
    if (this.splatted) return;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vy += 650 * dt; // gravity
    this.vx *= 0.96;

    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.splatted = true;
    }
    this.life -= dt;
  }

  draw(ctx) {
    if (this.splatted) return;
    const t = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() { return this.life <= 0 || this.splatted; }
}

class BloodStain {
  constructor(x, y, color = '#b71c1c', radius = 6) {
    this.x = x + (Math.random() - 0.5) * 6;
    this.y = y;
    this.rx = radius * (0.8 + Math.random() * 0.6);
    this.ry = radius * (0.3 + Math.random() * 0.3);
    this.color = color;
    this.alpha = 0.85;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.rx, this.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── DEBRIS / BONE SPLINTER ──────────────────────────────────────────────────
class DebrisParticle {
  constructor(x, y, opts = {}) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 220;
    this.x     = x; this.y = y;
    this.vx    = Math.cos(angle) * speed;
    this.vy    = Math.sin(angle) * speed - 80;
    this.rot   = Math.random() * Math.PI * 2;
    this.vrot  = (Math.random() - 0.5) * 12;
    this.w     = opts.w ?? (6 + Math.random() * 10);
    this.h     = opts.h ?? (4 + Math.random() * 6);
    this.color = opts.color ?? '#8b6914';
    this.life  = opts.life ?? (1.0 + Math.random() * 0.8);
    this.maxLife = this.life;
    this.groundY = opts.groundY ?? 560;
  }

  update(dt) {
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.vy  += 700 * dt;
    this.rot += this.vrot * dt;
    this.vx  *= 0.97;
    if (this.y >= this.groundY - 3) {
      this.y = this.groundY - 3;
      this.vy = -this.vy * 0.3;
      this.vx *= 0.7;
    }
    this.life -= dt;
  }

  draw(ctx) {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = t;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }

  get dead() { return this.life <= 0; }
}

// ─── EFFECTS MANAGER ──────────────────────────────────────────────────────────
class EffectsManager {
  constructor() {
    this.effects = [];
    this.stains  = []; // persistent ground stains
    this.shake   = new ScreenShake();
  }

  explosion(x, y, radius, opts = {}) {
    const count  = opts.sparks ?? 35;
    const colors = ['#ff9800','#ff5722','#ffc107','#fff176','#ff6f00'];

    this.effects.push(new ExplosionFlash(x, y, radius));
    this.effects.push(new Shockwave(x, y, radius * 1.4, { color:'#ff9800', lw: 4 }));
    this.effects.push(new Shockwave(x, y, radius * 0.9, { color:'#fff176', lw: 2, life:0.25 }));

    for (let i = 0; i < count; i++) {
      this.effects.push(new Spark(x, y, {
        speed: 80 + Math.random() * (radius * 2.2),
        color: colors[Math.floor(Math.random()*colors.length)],
        size:  2 + Math.random() * 5,
        life:  0.4 + Math.random() * 0.8,
        square: Math.random()>0.4,
        upBias: 80,
      }));
    }
    for (let i = 0; i < 8; i++) {
      this.effects.push(new SmokeParticle(x, y, { size: radius*0.2, life: 1.0+Math.random(), dark: true }));
    }

    this.effects.push(new TextPop(x, y - radius, opts.label ?? 'BOOM!', {
      color: '#ff9800', font:'bold 24px "Press Start 2P", monospace'
    }));

    this.shake.add(Math.min(radius * 0.15, 25));
  }

  hit(x, y) {
    for (let i = 0; i < 8; i++) {
      this.effects.push(new Spark(x, y, {
        speed: 60 + Math.random()*100,
        color: ['#f44336','#ff9800','#ffd740'][Math.floor(Math.random()*3)],
        size:  1.5+Math.random()*3,
        life:  0.15+Math.random()*0.3,
      }));
    }
    this.shake.add(2);
  }

  blood(x, y, color = '#d32f2f', count = 12, groundY = 560) {
    for (let i = 0; i < count; i++) {
      const bp = new BloodParticle(x, y, { color, groundY });
      this.effects.push(bp);
    }
    // Also create ground stains
    for (let i = 0; i < Math.min(count, 4); i++) {
      if (this.stains.length < 150) {
        this.stains.push(new BloodStain(x + (Math.random()-0.5)*30, groundY, color, 4 + Math.random()*8));
      }
    }
  }

  fracture(x, y, label = '🦴 PATAH!') {
    this.effects.push(new TextPop(x, y - 10, label, {
      color: '#ffeb3b', font: 'bold 16px "Press Start 2P", monospace'
    }));
    for (let i = 0; i < 8; i++) {
      this.effects.push(new DebrisParticle(x, y, {
        color: '#e0e0e0', w: 5, h: 4, life: 0.8
      }));
    }
    this.shake.add(4);
  }

  debris(x, y, color = '#8b6914', count = 10, groundY = 560) {
    for (let i = 0; i < count; i++) {
      this.effects.push(new DebrisParticle(x, y, { color, groundY }));
    }
  }

  spawn(x, y) {
    for (let i = 0; i < 6; i++) {
      this.effects.push(new Spark(x, y, {
        speed: 40+Math.random()*80,
        color: '#4ade80',
        size:  1+Math.random()*2,
        life:  0.2+Math.random()*0.3,
      }));
    }
  }

  pop(x, y, text, color='#fff') {
    this.effects.push(new TextPop(x, y, text, { color }));
  }

  update(dt) {
    this.shake.update(dt);
    for (const e of this.effects) e.update(dt);
    this.effects = this.effects.filter(e => !e.dead);
  }

  draw(ctx) {
    // Draw ground stains first
    for (const s of this.stains) s.draw(ctx);
    // Draw dynamic particles
    for (const e of this.effects) e.draw(ctx);
  }
}

