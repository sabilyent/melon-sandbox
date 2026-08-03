'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  ENTITIES — Ragdoll, Props, Projectiles, Explosives
// ═══════════════════════════════════════════════════════════════════════════════

// ─── RAGDOLL PRESETS ──────────────────────────────────────────────────────────
const RAGDOLL_PRESETS = {
  human:    { skin:'#f4c2a1', shirt:'#3a86ff', pants:'#2c3e50', shoe:'#1a1a1a', hair:'#5c3317', eyeColor:'#1a1a1a', label:'Human'    },
  zombie:   { skin:'#8fbc5c', shirt:'#795548', pants:'#4e342e', shoe:'#3e2723', hair:'#33691e', eyeColor:'#ff0000', label:'Zombie'    },
  skeleton: { skin:'#e8e8e8', shirt:'#bdbdbd', pants:'#9e9e9e', shoe:'#757575', hair:null,      eyeColor:'#222',    label:'Skeleton'  },
  melon:    { skin:'#4caf50', shirt:'#ef5350', pants:'#1b5e20', shoe:'#0d3d00', hair:'#1b5e20', eyeColor:'#1a1a1a', label:'🍉 Melon'  },
  ninja:    { skin:'#37474f', shirt:'#212121', pants:'#1a1a1a', shoe:'#000',    hair:null,      eyeColor:'#f44336', label:'Ninja'     },
};

// ─── RAGDOLL ──────────────────────────────────────────────────────────────────
class Ragdoll {
  constructor(x, y, world, preset = 'human') {
    this.world        = world;
    this.preset       = preset;
    this.colors       = RAGDOLL_PRESETS[preset] || RAGDOLL_PRESETS.human;
    this.particles    = [];
    this.constraints  = [];
    this.alive        = true;
    this.health       = 100;
    this.maxHealth    = 100;
    this.stunTimer    = 0;
    this.damageStains = []; // blood/bruise marks on limbs
    this.type         = 'ragdoll';

    const bColors = {
      human: '#c62828', zombie: '#33691e', skeleton: '#e0e0e0', melon: '#e53935', ninja: '#b71c1c'
    };
    this.bloodColor = bColors[preset] || '#c62828';

    this._build(x, y);
  }

  _p(dx, dy, r, m) {
    const p       = new Particle(this.x0 + dx, this.y0 + dy, r, m);
    p.group       = this;
    p.restitution = 0.28;
    this.particles.push(p);
    this.world.particles.push(p);
    return p;
  }

  _c(a, b, s = 0.95, breakRatio = 2.4) {
    const c = new DistConstraint(a, b, null, s);
    c.breakAt = breakRatio;
    this.constraints.push(c);
    this.world.constraints.push(c);
    return c;
  }

  _build(x, y) {
    this.x0 = x; this.y0 = y;

    // Spine
    this.head    = this._p(   0, -90, 14, 2.0);
    this.neck    = this._p(   0, -68,  5, 1.0);
    this.chest   = this._p(   0, -44,  6, 2.0);
    this.belly   = this._p(   0, -20,  5, 1.5);
    this.hips    = this._p(   0,   2,  6, 1.5);

    // Arms
    this.shlL    = this._p( -22, -55,  5, 1.0);
    this.shlR    = this._p(  22, -55,  5, 1.0);
    this.elbL    = this._p( -30, -26,  4, 1.0);
    this.elbR    = this._p(  30, -26,  4, 1.0);
    this.wrsL    = this._p( -30,   4,  4, 0.7);
    this.wrsR    = this._p(  30,   4,  4, 0.7);

    // Legs
    this.hipL    = this._p( -11,   2,  5, 1.2);
    this.hipR    = this._p(  11,   2,  5, 1.2);
    this.kneeL   = this._p( -13,  35,  5, 1.0);
    this.kneeR   = this._p(  13,  35,  5, 1.0);
    this.footL   = this._p( -14,  68,  6, 0.8);
    this.footR   = this._p(  14,  68,  6, 0.8);

    // Spine constraints
    this._c(this.head,  this.neck,  0.97, 2.2);
    this._c(this.neck,  this.chest, 0.97, 2.2);
    this._c(this.chest, this.belly, 0.95, 2.5);
    this._c(this.belly, this.hips,  0.95, 2.5);

    // Shoulder girdle
    this._c(this.neck,  this.shlL, 0.95, 2.3);
    this._c(this.neck,  this.shlR, 0.95, 2.3);
    this._c(this.shlL,  this.shlR, 0.90, 2.5);
    this._c(this.chest, this.shlL, 0.55, 2.5);
    this._c(this.chest, this.shlR, 0.55, 2.5);

    // Arms
    this._c(this.shlL, this.elbL, 0.95, 2.2);
    this._c(this.shlR, this.elbR, 0.95, 2.2);
    this._c(this.elbL, this.wrsL, 0.95, 2.2);
    this._c(this.elbR, this.wrsR, 0.95, 2.2);

    // Hip girdle
    this._c(this.hips,  this.hipL, 0.97, 2.5);
    this._c(this.hips,  this.hipR, 0.97, 2.5);
    this._c(this.hipL,  this.hipR, 0.97, 2.5);
    this._c(this.belly, this.hipL, 0.50, 2.5);
    this._c(this.belly, this.hipR, 0.50, 2.5);

    // Legs
    this._c(this.hipL,  this.kneeL, 0.95, 2.3);
    this._c(this.hipR,  this.kneeR, 0.95, 2.3);
    this._c(this.kneeL, this.footL, 0.95, 2.3);
    this._c(this.kneeR, this.footR, 0.95, 2.3);

    // Cross-braces for torso rigidity
    this._c(this.neck,  this.belly, 0.40, 3.0);
    this._c(this.chest, this.hips,  0.40, 3.0);
    this._c(this.shlL,  this.belly, 0.25, 3.0);
    this._c(this.shlR,  this.belly, 0.25, 3.0);
    this._c(this.hipL,  this.kneeR, 0.20, 3.0);
    this._c(this.hipR,  this.kneeL, 0.20, 3.0);
  }

  update(dt) {
    if (this.stunTimer > 0) this.stunTimer -= dt;

    // Upright Standing Active Posture Controller (Melon Sandbox physics)
    if (this.alive && this.health > 15 && this.stunTimer <= 0) {
      this._applyUprightBalance(dt);
    }

    // Check broken constraints (joint fractures / dismemberment)
    for (const c of this.constraints) {
      if (c.broken && !c._notified) {
        c._notified = true;
        this.takeDamage(20, c.a.pos, c.a);
        if (this.world.effects) {
          this.world.effects.fracture(c.a.pos.x, c.a.pos.y, '🦴 PATAH!');
        }
      }
    }
  }

  _applyUprightBalance(dt) {
    const head  = this.head, chest = this.chest, hips = this.hips;
    const footL = this.footL, footR = this.footR;
    const kneeL = this.kneeL, kneeR = this.kneeR;

    if (!head || !chest || !hips) return;

    // Upright torque / vertical spine spring
    const targetY = hips.pos.y - 90;
    const diffY   = targetY - head.pos.y;
    if (diffY < 0) {
      head.pos.y  += diffY * 0.12;
      chest.pos.y += diffY * 0.08;
    }

    // Spine horizontal stabilization
    const diffX = hips.pos.x - head.pos.x;
    head.pos.x  += diffX * 0.08;
    chest.pos.x += diffX * 0.05;

    // Feet ground standing support
    const groundY = this.world.groundY;
    if (footL && footR) {
      const feetGrounded = (footL.pos.y >= groundY - 14) || (footR.pos.y >= groundY - 14);
      if (feetGrounded) {
        const hipTargetY = groundY - 66;
        const hipDiffY   = hipTargetY - hips.pos.y;
        if (hipDiffY < 0) hips.pos.y += hipDiffY * 0.10;

        if (kneeL) kneeL.pos.y = Math.min(kneeL.pos.y, groundY - 28);
        if (kneeR) kneeR.pos.y = Math.min(kneeR.pos.y, groundY - 28);

        // Keep stance stable
        footL.pos.x += (hips.pos.x - 16 - footL.pos.x) * 0.08;
        footR.pos.x += (hips.pos.x + 16 - footR.pos.x) * 0.08;
      }
    }
  }

  takeDamage(amount, hitPos, hitParticle) {
    if (this.health <= 0) return;
    this.health -= amount;

    // Record visual blood stain on limb
    const hp = hitPos || (hitParticle ? hitParticle.pos : this.head.pos);
    this.damageStains.push({
      x: hp.x, y: hp.y, r: 4 + Math.random() * 5, color: this.bloodColor
    });

    // Knock off balance on hard hit
    if (amount > 12) {
      this.stunTimer = 1.0 + Math.min(amount * 0.03, 2.8);
    }

    // Blood spurt FX
    if (this.world.effects) {
      this.world.effects.blood(hp.x, hp.y, this.bloodColor, Math.ceil(amount / 3.5), this.world.groundY);
    }

    if (this.health <= 0) {
      this.alive = false;
      this.stunTimer = Infinity;
      if (this.world.effects) {
        this.world.effects.pop(this.head.pos.x, this.head.pos.y - 20, '☠ DEAD!', '#f44336');
      }
    }
  }

  draw(ctx) {
    const c = this.colors;
    const seg = (a, b, w, col, cap = 'round') => {
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.lineTo(b.pos.x, b.pos.y);
      ctx.strokeStyle = col;
      ctx.lineWidth   = w;
      ctx.lineCap     = cap;
      ctx.stroke();
    };

    ctx.save();
    ctx.shadowBlur = 0;

    // Legs (behind body)
    seg(this.hipL, this.kneeL, 13, c.pants);
    seg(this.hipR, this.kneeR, 13, c.pants);
    seg(this.kneeL, this.footL, 11, c.pants);
    seg(this.kneeR, this.footR, 11, c.pants);

    // Shoes (foot caps)
    const drawShoe = (foot, knee) => {
      if (!foot || !knee) return;
      const dir = foot.pos.sub(knee.pos).norm().mul(6);
      ctx.beginPath();
      ctx.moveTo(foot.pos.x, foot.pos.y);
      ctx.lineTo(foot.pos.x + dir.x, foot.pos.y + dir.y);
      ctx.strokeStyle = c.shoe;
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.stroke();
    };
    drawShoe(this.footL, this.kneeL);
    drawShoe(this.footR, this.kneeR);

    // Torso
    seg(this.neck, this.hips, 24, c.shirt);

    // Shoulder to shoulder
    seg(this.shlL, this.shlR, 20, c.shirt);

    // Arms
    seg(this.shlL, this.elbL, 9, c.shirt);
    seg(this.shlR, this.elbR, 9, c.shirt);
    seg(this.elbL, this.wrsL, 8, c.skin);
    seg(this.elbR, this.wrsR, 8, c.skin);

    // Head
    if (this.head) {
      ctx.beginPath();
      ctx.arc(this.head.pos.x, this.head.pos.y, 14, 0, Math.PI * 2);
      ctx.fillStyle   = c.skin;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur  = 4;
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = this._shade(c.skin, -30);
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Hair
      if (c.hair && this.neck) {
        const headToNeck = this.neck.pos.sub(this.head.pos).norm();
        const angle = Math.atan2(headToNeck.y, headToNeck.x);
        ctx.beginPath();
        ctx.arc(this.head.pos.x, this.head.pos.y, 14, angle + 0.2, angle + Math.PI - 0.2);
        ctx.fillStyle = c.hair;
        ctx.fill();
      }

      // Eyes
      if (this.neck) {
        const fwd  = this.neck.pos.sub(this.head.pos).norm();
        const perp = fwd.perp();
        const eyeOff = 5.5, eyeDn = 3;
        const eyeL = this.head.pos.add(perp.mul(-eyeOff)).add(fwd.mul(-eyeDn));
        const eyeR = this.head.pos.add(perp.mul( eyeOff)).add(fwd.mul(-eyeDn));

        if (this.health <= 0) {
          const drawDeadEye = (ep) => {
            ctx.beginPath();
            ctx.moveTo(ep.x - 3, ep.y - 3); ctx.lineTo(ep.x + 3, ep.y + 3);
            ctx.moveTo(ep.x + 3, ep.y - 3); ctx.lineTo(ep.x - 3, ep.y + 3);
            ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2; ctx.stroke();
          };
          drawDeadEye(eyeL); drawDeadEye(eyeR);
        } else {
          const drawEye = (ep) => {
            ctx.beginPath(); ctx.arc(ep.x, ep.y, 3.2, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
            ctx.beginPath(); ctx.arc(ep.x + fwd.x*0.6, ep.y + fwd.y*0.6, 2, 0, Math.PI*2);
            ctx.fillStyle = c.eyeColor; ctx.fill();
          };
          drawEye(eyeL); drawEye(eyeR);
        }
      }
    }

    // Blood stains on ragdoll limbs
    for (const ds of this.damageStains) {
      ctx.beginPath();
      ctx.arc(ds.x, ds.y, ds.r, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Health bar
    if (this.health < this.maxHealth && this.head) {
      const hx = this.head.pos.x - 16;
      const hy = this.head.pos.y - 24;
      const pct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(hx, hy, 32, 5);
      ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fb923c' : '#f87171';
      ctx.fillRect(hx, hy, 32 * pct, 5);
    }

    // Zombie drool
    if (this.preset === 'zombie' && this.health > 0) {
      const mouthPos = this.head.pos.add(this.neck.pos.sub(this.head.pos).norm().mul(-6));
      ctx.beginPath();
      ctx.arc(mouthPos.x, mouthPos.y, 3, 0, Math.PI);
      ctx.fillStyle = '#4caf50';
      ctx.fill();
    }

    ctx.restore();
  }

  _shade(hex, amt) {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.max(0, Math.min(255, (n>>16) + amt));
    const g = Math.max(0, Math.min(255, ((n>>8)&0xff) + amt));
    const b = Math.max(0, Math.min(255, (n&0xff) + amt));
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  center() {
    if (!this.particles.length) return new Vec2();
    let x = 0, y = 0;
    for (const p of this.particles) { x += p.pos.x; y += p.pos.y; }
    return new Vec2(x/this.particles.length, y/this.particles.length);
  }

  remove() { this.world.removeGroup(this); this.particles=[]; this.constraints=[]; }
}

// ─── BOX PROP ─────────────────────────────────────────────────────────────────
class BoxProp {
  constructor(x, y, w, h, world, opts = {}) {
    this.world     = world;
    this.w         = w;
    this.h         = h;
    this.color     = opts.color   || '#8b6914';
    this.outline   = opts.outline || '#5a4009';
    this.label     = opts.label   || '';
    this.type      = opts.type    || 'crate';
    this.health    = opts.health  || 100;
    this.maxHealth = this.health;
    this.cracks    = [];
    this.particles   = [];
    this.constraints = [];
    this._build(x, y, opts.fixed || false);
  }

  _build(x, y, fixed) {
    const hw = this.w / 2, hh = this.h / 2;
    const mk = (dx, dy) => {
      const p = new Particle(x+dx, y+dy, 5, 2.5, fixed);
      p.group = this; p.restitution = 0.25; p.groundFrict = 0.78;
      this.particles.push(p); this.world.particles.push(p); return p;
    };
    const mc = (a, b) => {
      const c = new DistConstraint(a, b, null, 0.99);
      this.constraints.push(c); this.world.constraints.push(c);
    };
    this.tl = mk(-hw, -hh); this.tr = mk(hw, -hh);
    this.br = mk( hw,  hh); this.bl = mk(-hw,  hh);
    mc(this.tl, this.tr); mc(this.tr, this.br);
    mc(this.br, this.bl); mc(this.bl, this.tl);
    mc(this.tl, this.br); mc(this.tr, this.bl); // diagonals
    if (this.world.boxes) this.world.boxes.push(this);
  }

  takeDamage(amount, hitPos) {
    if (this.health <= 0) return;
    this.health -= amount;

    if (hitPos) {
      this.cracks.push({ x: hitPos.x, y: hitPos.y, r: 6 + Math.random() * 8 });
    }

    if (this.world.effects) {
      const p = hitPos || this.tl.pos;
      if (this.type === 'barrel') {
        this.world.effects.hit(p.x, p.y);
      } else {
        this.world.effects.debris(p.x, p.y, this.color, 4, this.world.groundY);
      }
    }

    if (this.health <= 0) {
      this.shatter();
    }
  }

  shatter() {
    const c = this.center();
    if (this.world.effects) {
      if (this.type === 'barrel') {
        this.world.effects.explosion(c.x, c.y, 140, { label: '💥 BARREL BOOM!' });
      } else {
        this.world.effects.debris(c.x, c.y, this.color, 12, this.world.groundY);
        this.world.effects.pop(c.x, c.y, '💥 SHATTERED!', '#ff9800');
      }
    }
    this.remove();
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.tl.pos.x, this.tl.pos.y);
    ctx.lineTo(this.tr.pos.x, this.tr.pos.y);
    ctx.lineTo(this.br.pos.x, this.br.pos.y);
    ctx.lineTo(this.bl.pos.x, this.bl.pos.y);
    ctx.closePath();

    if (this.type === 'platform') {
      const grd = ctx.createLinearGradient(this.tl.pos.x, this.tl.pos.y, this.bl.pos.x, this.bl.pos.y);
      grd.addColorStop(0, '#556');
      grd.addColorStop(1, '#334');
      ctx.fillStyle = grd;
    } else if (this.type === 'barrel') {
      ctx.fillStyle = this.color;
    } else {
      const cx = (this.tl.pos.x + this.br.pos.x)/2;
      const cy = (this.tl.pos.y + this.br.pos.y)/2;
      const grd = ctx.createRadialGradient(cx-5, cy-5, 0, cx, cy, this.w*0.8);
      grd.addColorStop(0, this._lighten(this.color, 20));
      grd.addColorStop(1, this.color);
      ctx.fillStyle = grd;
    }
    ctx.fill();
    ctx.strokeStyle = this.outline;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cracks
    for (const crack of this.cracks) {
      ctx.beginPath();
      ctx.arc(crack.x, crack.y, crack.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
    }

    // Crate inner X detail
    if (this.type === 'crate') {
      ctx.beginPath();
      ctx.moveTo(this.tl.pos.x, this.tl.pos.y);
      ctx.lineTo(this.br.pos.x, this.br.pos.y);
      ctx.moveTo(this.tr.pos.x, this.tr.pos.y);
      ctx.lineTo(this.bl.pos.x, this.bl.pos.y);
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Barrel bands
    if (this.type === 'barrel') {
      const mc = (a,b)=>new Vec2((a.pos.x+b.pos.x)/2,(a.pos.y+b.pos.y)/2);
      const topMid = mc(this.tl, this.tr);
      const botMid = mc(this.bl, this.br);
      const bandT  = Vec2.lerp(topMid, botMid, 0.25);
      const bandB  = Vec2.lerp(topMid, botMid, 0.75);
      [bandT, bandB].forEach(bp => {
        const lp = Vec2.lerp(this.tl.pos, this.bl.pos, bp.y === bandT.y ? 0.25:0.75);
        const rp = Vec2.lerp(this.tr.pos, this.br.pos, bp.y === bandT.y ? 0.25:0.75);
        ctx.beginPath(); ctx.moveTo(lp.x, lp.y); ctx.lineTo(rp.x, rp.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth=3; ctx.stroke();
      });
    }

    // Health bar
    if (this.health < this.maxHealth && this.type !== 'platform') {
      const c = this.center();
      const pct = Math.max(0, this.health / this.maxHealth);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(c.x - 16, c.y - this.h/2 - 12, 32, 4);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(c.x - 16, c.y - this.h/2 - 12, 32 * pct, 4);
    }
    ctx.restore();
  }

  center() {
    return new Vec2(
      (this.tl.pos.x+this.tr.pos.x+this.br.pos.x+this.bl.pos.x)/4,
      (this.tl.pos.y+this.tr.pos.y+this.br.pos.y+this.bl.pos.y)/4
    );
  }

  _lighten(hex, amt) {
    const n=parseInt(hex.replace('#',''),16);
    const r=Math.min(255,(n>>16)+amt), g=Math.min(255,((n>>8)&0xff)+amt), b=Math.min(255,(n&0xff)+amt);
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  remove() { this.world.removeGroup(this); this.particles=[]; this.constraints=[]; }
}

// ─── BALL PROP ────────────────────────────────────────────────────────────────
class BallProp {
  constructor(x, y, radius, world, color = '#ef5350') {
    this.world  = world;
    this.color  = color;
    this.type   = 'ball';
    this.particle = new Particle(x, y, radius, 1.5);
    this.particle.group       = this;
    this.particle.restitution = 0.7;  // bouncy!
    this.particle.groundFrict = 0.96;
    this.particles   = [this.particle];
    this.constraints = [];
    world.particles.push(this.particle);
  }

  draw(ctx) {
    const p = this.particle;
    ctx.save();
    const grd = ctx.createRadialGradient(
      p.pos.x - p.radius*0.3, p.pos.y - p.radius*0.3, p.radius*0.1,
      p.pos.x, p.pos.y, p.radius
    );
    grd.addColorStop(0, this._lighten(this.color, 60));
    grd.addColorStop(1, this.color);
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2);
    ctx.fillStyle   = grd;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = this._shade(this.color, -40);
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  _lighten(hex,amt){const n=parseInt(hex.replace('#',''),16);const r=Math.min(255,(n>>16)+amt),g=Math.min(255,((n>>8)&0xff)+amt),b=Math.min(255,(n&0xff)+amt);return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
  _shade(hex,amt){const n=parseInt(hex.replace('#',''),16);const r=Math.max(0,(n>>16)+amt),g=Math.max(0,((n>>8)&0xff)+amt),b=Math.max(0,(n&0xff)+amt);return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}

  center()  { return this.particle.pos.clone(); }
  remove()  { this.world.removeGroup(this); this.particles=[]; this.constraints=[]; }
}

// ─── PROJECTILE ───────────────────────────────────────────────────────────────
class Projectile {
  constructor(x, y, vx, vy, opts = {}) {
    this.radius  = opts.radius   || 4;
    this.color   = opts.color    || '#FFD700';
    this.glow    = opts.glow     || '#FF8800';
    this.trail   = [];
    this.maxLife = opts.life     || 3.0;   // seconds
    this.life    = this.maxLife;
    this.damage  = opts.damage   || 20;
    this.isRocket= opts.isRocket || false;
    this.alive   = true;
    this.type    = 'projectile';

    this.particle = new Particle(x, y, this.radius, 0.2);
    this.particle.group = this;
    this.particle.setVelocity(new Vec2(vx, vy).mul(1/60));  // velocity in px/s → verlet
    this.particle.friction = 1.0;  // no air resistance for bullets
    this.particle.restitution = 0.4;
    this.particle.tag = 'projectile';

    this.particles   = [this.particle];
    this.constraints = [];
  }

  update() {
    if (!this.alive) return;
    this.trail.push(this.particle.pos.clone());
    if (this.trail.length > (this.isRocket ? 20 : 8)) this.trail.shift();
    this.life -= 1/60;
    if (this.life <= 0) this.alive = false;
  }

  draw(ctx) {
    if (!this.alive) return;
    // Trail
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < this.trail.length; i++) {
        const t   = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
        ctx.lineTo(this.trail[i].x,   this.trail[i].y);
        ctx.strokeStyle = this.isRocket
          ? `rgba(255,${Math.floor(100+100*t)},0,${t*0.8})`
          : `rgba(255,220,50,${t*0.6})`;
        ctx.lineWidth = this.isRocket ? (1 + i * 0.5) : (this.radius * t);
        ctx.lineCap   = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bullet / rocket glow
    const p = this.particle;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, this.radius + 4, 0, Math.PI*2);
    ctx.fillStyle   = `rgba(255,160,0,0.15)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle   = this.color;
    ctx.shadowColor = this.glow;
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  center()  { return this.particle.pos.clone(); }

  remove(world) {
    if (world) {
      const i = world.particles.indexOf(this.particle);
      if (i >= 0) world.particles.splice(i, 1);
    }
    this.alive = false;
    this.particles = [];
  }
}

// ─── EXPLOSIVE (Grenade / Bomb / Mine) ────────────────────────────────────────
class Explosive {
  constructor(x, y, world, opts = {}) {
    this.world   = world;
    this.type    = opts.type    || 'grenade';
    this.timer   = opts.timer   || (this.type === 'grenade' ? 3.0 : Infinity);
    this.radius  = opts.blastR  || 150;
    this.force   = opts.force   || 12;
    this.color   = opts.color   || '#4caf50';
    this.alive   = true;
    this.armed   = true;
    this.age     = 0;
    this.beepT   = 0;
    this.isExplosive = true;
    this.particles   = [];
    this.constraints = [];

    const size = this.type === 'bomb' ? 14 : (this.type === 'mine' ? 10 : 7);
    this.particle = new Particle(x, y, size, 2);
    this.particle.group       = this;
    this.particle.restitution = 0.5;
    this.particle.groundFrict = 0.8;
    this.particle.tag = 'explosive';
    this.particles.push(this.particle);
    world.particles.push(this.particle);

    if (this.type === 'mine') {
      this.particle.fixed = true; // mines stay in place
    }
  }

  update(dt) {
    if (!this.alive) return;
    this.age   += dt;
    this.beepT += dt;
    if (isFinite(this.timer)) this.timer -= dt;
    if (this.timer <= 0) return true; // signal: explode!
    return false;
  }

  draw(ctx, game) {
    if (!this.alive) return;
    const p   = this.particle;
    const blink = isFinite(this.timer) && this.timer < 1.5
      ? Math.sin(this.age * (this.timer < 0.5 ? 20 : 10)) > 0
      : true;

    ctx.save();
    if (this.type === 'grenade') {
      // Body
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 7, 0, Math.PI*2);
      ctx.fillStyle   = '#4caf50';
      ctx.shadowColor = blink ? '#ff5722' : 'transparent';
      ctx.shadowBlur  = blink ? 10 : 0;
      ctx.fill();
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth=1.5; ctx.stroke();
      // Pin handle
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y - 9, 3, 0, Math.PI*2);
      ctx.fillStyle='#aaa'; ctx.fill();
    } else if (this.type === 'bomb') {
      // Classic bomb
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 14, 0, Math.PI*2);
      ctx.fillStyle   = '#1a1a1a';
      ctx.shadowColor = blink ? '#ff5722' : 'transparent';
      ctx.shadowBlur  = blink ? 16 : 0;
      ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth=2; ctx.stroke();
      // Fuse
      ctx.beginPath();
      ctx.moveTo(p.pos.x, p.pos.y-14);
      ctx.bezierCurveTo(p.pos.x+8, p.pos.y-22, p.pos.x+4, p.pos.y-30, p.pos.x+8, p.pos.y-36);
      ctx.strokeStyle = blink ? '#ff9800' : '#795548';
      ctx.lineWidth=2.5; ctx.stroke();
      // Spark
      if (blink && isFinite(this.timer)) {
        ctx.beginPath();
        ctx.arc(p.pos.x+8, p.pos.y-36, 3, 0, Math.PI*2);
        ctx.fillStyle='#fff176'; ctx.fill();
      }
    } else if (this.type === 'mine') {
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 10, 0, Math.PI*2);
      ctx.fillStyle='#f44336';
      ctx.shadowColor=blink?'#ff0000':'transparent';
      ctx.shadowBlur=blink?14:0;
      ctx.fill();
      ctx.strokeStyle='#b71c1c'; ctx.lineWidth=2; ctx.stroke();
      // Spikes
      for (let i=0;i<8;i++){
        const a=i/8*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(p.pos.x+Math.cos(a)*10, p.pos.y+Math.sin(a)*16);
        ctx.lineTo(p.pos.x+Math.cos(a)*16, p.pos.y+Math.sin(a)*16);
        ctx.strokeStyle='#b71c1c'; ctx.lineWidth=2; ctx.stroke();
      }
    }

    // Draw timer text if grenade / timed explosive
    if (isFinite(this.timer) && this.timer > 0) {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ff3d00';
      ctx.textAlign = 'center';
      ctx.fillText(this.timer.toFixed(1) + 's', p.pos.x, p.pos.y - 14);
    }

    ctx.restore();
  }

  center() {
    return this.particle ? this.particle.pos.clone() : new Vec2();
  }

  remove() {
    this.world.removeGroup(this);
    this.particles = []; this.constraints = [];
    this.alive = false;
  }
}

// ─── FIRE ENTITY (Flamethrower streams) ───────────────────────────────────────
class FireStream {
  constructor(x, y, dirX, dirY) {
    this.flames = [];
    this.alive  = true;
    const spd   = 300;
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random()-0.5)*0.5;
      const a      = Math.atan2(dirY, dirX) + spread;
      const s      = spd * (0.7 + Math.random()*0.6);
      this.flames.push({
        x: x + (Math.random()-0.5)*10,
        y: y + (Math.random()-0.5)*10,
        vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 0.4 + Math.random()*0.5,
        maxLife: 0.5 + Math.random()*0.5,
        size: 6 + Math.random()*10,
      });
    }
    this.particles   = [];
    this.constraints = [];
    this.type = 'fire';
  }

  update(dt) {
    for (const f of this.flames) {
      f.x  += f.vx * dt; f.y  += f.vy * dt;
      f.vx *= 0.96;      f.vy  = f.vy * 0.96 - 60*dt; // slight upward buoy
      f.life -= dt;
    }
    this.flames = this.flames.filter(f => f.life > 0);
    if (this.flames.length === 0) this.alive = false;
    return false;
  }

  draw(ctx) {
    ctx.save();
    for (const f of this.flames) {
      const t   = f.life / f.maxLife;
      const hue = 20 + (1-t)*40; // orange → red
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * t, 0, Math.PI*2);
      ctx.fillStyle = `hsla(${hue},100%,${40+t*30}%,${t*0.8})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // Check if any flame touches a world particle
  checkHits(worldParticles, explodeFn) {
    for (const f of this.flames) {
      for (const p of worldParticles) {
        if (p.group === this || p.fixed) continue;
        const dx = f.x - p.pos.x, dy = f.y - p.pos.y;
        if (dx*dx + dy*dy < (f.size+p.radius)**2) {
          p.addVelocity(new Vec2(f.vx*0.01, f.vy*0.01));
        }
      }
    }
  }

  center()  { return new Vec2(this.flames[0]?.x||0, this.flames[0]?.y||0); }
  remove()  { this.alive=false; }
}
