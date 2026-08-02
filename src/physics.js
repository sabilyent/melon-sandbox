'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  PHYSICS ENGINE  — Verlet Integration + Position-Based Dynamics
// ═══════════════════════════════════════════════════════════════════════════════

// ─── VEC2 ─────────────────────────────────────────────────────────────────────
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone()      { return new Vec2(this.x, this.y); }
  add(v)       { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v)       { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s)       { return new Vec2(this.x * s,   this.y * s); }
  div(s)       { return new Vec2(this.x / s,   this.y / s); }
  dot(v)       { return this.x * v.x + this.y * v.y; }
  len()        { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lenSq()      { return this.x * this.x + this.y * this.y; }
  norm()       { const l = this.len(); return l > 1e-9 ? this.div(l) : new Vec2(); }
  perp()       { return new Vec2(-this.y, this.x); }
  addEq(v)     { this.x += v.x; this.y += v.y; return this; }
  subEq(v)     { this.x -= v.x; this.y -= v.y; return this; }
  mulEq(s)     { this.x *= s;   this.y *= s;   return this; }
  static dist(a, b)    { return a.sub(b).len(); }
  static distSq(a, b)  { return a.sub(b).lenSq(); }
  static lerp(a, b, t) { return new Vec2(a.x+(b.x-a.x)*t, a.y+(b.y-a.y)*t); }
  static fromAngle(a)  { return new Vec2(Math.cos(a), Math.sin(a)); }
}

// ─── PARTICLE ─────────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, radius = 4, mass = 1, fixed = false) {
    this.pos         = new Vec2(x, y);
    this.prev        = new Vec2(x, y);
    this.radius      = radius;
    this.mass        = mass;
    this.fixed       = fixed;
    this.group       = null;   // entity reference — skip same-group collision
    this.restitution = 0.25;
    this.friction    = 0.992;  // air damping
    this.groundFrict = 0.82;   // ground sliding friction
    this.id          = ++Particle._id;
    this.tag         = '';     // 'projectile', 'explosive', 'prop', etc.
  }

  velocity()      { return this.pos.sub(this.prev); }
  speed()         { return this.velocity().len(); }
  setVelocity(v)  { this.prev = this.pos.sub(v); }
  addVelocity(dv) { this.prev.subEq(dv); }

  update(dt, gravity) {
    if (this.fixed) return;
    const vel = this.velocity().mulEq(this.friction);
    this.prev = this.pos.clone();
    this.pos.addEq(vel);
    this.pos.y += gravity * dt * dt;
  }
}
Particle._id = 0;

// ─── DISTANCE CONSTRAINT ──────────────────────────────────────────────────────
class DistConstraint {
  constructor(a, b, restLen = null, stiffness = 1.0) {
    this.a         = a;
    this.b         = b;
    this.restLen   = restLen ?? Vec2.dist(a.pos, b.pos);
    this.stiffness = stiffness;
    this.broken    = false;
    this.breakAt   = Infinity; // ratio of stretch to break
  }

  solve() {
    if (this.broken) return;
    const dx   = this.b.pos.x - this.a.pos.x;
    const dy   = this.b.pos.y - this.a.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-9) return;
    if (dist / this.restLen > this.breakAt) { this.broken = true; return; }

    const diff      = ((dist - this.restLen) / dist) * this.stiffness;
    const invMA     = this.a.fixed ? 0 : 1 / this.a.mass;
    const invMB     = this.b.fixed ? 0 : 1 / this.b.mass;
    const totalInvM = invMA + invMB;
    if (totalInvM < 1e-9) return;

    const cx = dx * diff / totalInvM;
    const cy = dy * diff / totalInvM;
    if (!this.a.fixed) { this.a.pos.x += cx * invMA; this.a.pos.y += cy * invMA; }
    if (!this.b.fixed) { this.b.pos.x -= cx * invMB; this.b.pos.y -= cy * invMB; }
  }
}

// ─── PHYSICS WORLD ────────────────────────────────────────────────────────────
class World {
  constructor() {
    this.particles   = [];
    this.constraints = [];
    this.gravity     = 750;   // px/s²
    this.groundY     = 560;   // floor Y in world coords
    this.leftWall    = -4000;
    this.rightWall   = 4000;
    this.wind        = 0;     // horizontal acceleration
    this.substeps    = 6;
    this.iterations  = 10;
    this.paused      = false;
    this.slowMo      = false;
    this._accum      = 0;
  }

  update(rawDt) {
    if (this.paused) return;
    const dt = Math.min(rawDt, 1/30) * (this.slowMo ? 0.15 : 1.0);
    const subDt = dt / this.substeps;

    for (let s = 0; s < this.substeps; s++) {
      // Integrate
      for (const p of this.particles) {
        if (!p.fixed && this.wind !== 0) p.pos.x += this.wind * subDt * subDt;
        p.update(subDt, this.gravity);
      }
      // Constraints + collisions
      for (let i = 0; i < this.iterations; i++) {
        for (const c of this.constraints) c.solve();
        this._groundCollision();
        this._particleCollision();
      }
    }
  }

  _groundCollision() {
    for (const p of this.particles) {
      if (p.fixed) continue;
      if (p.pos.y + p.radius > this.groundY) {
        const vel = p.velocity();
        p.pos.y   = this.groundY - p.radius;
        p.prev.y  = p.pos.y + vel.y * p.restitution;
        p.prev.x  = p.pos.x - vel.x * p.groundFrict;
      }
      if (p.pos.x - p.radius < this.leftWall) {
        const vel = p.velocity();
        p.pos.x   = this.leftWall + p.radius;
        p.prev.x  = p.pos.x + vel.x * p.restitution;
      }
      if (p.pos.x + p.radius > this.rightWall) {
        const vel = p.velocity();
        p.pos.x   = this.rightWall - p.radius;
        p.prev.x  = p.pos.x + vel.x * p.restitution;
      }
      if (p.pos.y < -3000) { p.pos.y = -3000; p.prev.y = p.pos.y; }
    }
  }

  _particleCollision() {
    const ps = this.particles;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      if (a.radius < 5) continue;
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        if (b.radius < 5) continue;
        if (a.group && a.group === b.group) continue;
        const dx   = b.pos.x - a.pos.x;
        const dy   = b.pos.y - a.pos.y;
        const minD = a.radius + b.radius;
        if (dx*dx + dy*dy >= minD*minD) continue;
        const dist  = Math.sqrt(dx*dx + dy*dy);
        if (dist < 1e-6) continue;
        const pen   = (minD - dist) / dist;
        const nx    = dx * pen * 0.5;
        const ny    = dy * pen * 0.5;
        const totalM = (a.fixed?0:a.mass) + (b.fixed?0:b.mass);
        if (totalM < 1e-9) continue;
        if (!a.fixed) { a.pos.x -= nx*(b.fixed?1:b.mass/totalM); a.pos.y -= ny*(b.fixed?1:b.mass/totalM); }
        if (!b.fixed) { b.pos.x += nx*(a.fixed?1:a.mass/totalM); b.pos.y += ny*(a.fixed?1:a.mass/totalM); }
      }
    }
  }

  applyExplosion(center, radius, force) {
    for (const p of this.particles) {
      if (p.fixed) continue;
      const d    = p.pos.sub(center);
      const dist = d.len();
      if (dist > radius) continue;
      const mag = force * (1 - dist / radius) / p.mass;
      const dir = dist > 0.5 ? d.norm() : Vec2.fromAngle(Math.random() * Math.PI * 2);
      p.addVelocity(dir.mul(mag));
    }
  }

  findNearest(worldPos, maxDist = 50, excludeFixed = false) {
    let best = null, bestD = maxDist;
    for (const p of this.particles) {
      if (excludeFixed && p.fixed) continue;
      const d = Vec2.dist(p.pos, worldPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  removeGroup(group) {
    this.particles   = this.particles.filter(p => p.group !== group);
    this.constraints = this.constraints.filter(c => c.a.group !== group && c.b.group !== group);
  }

  clear() { this.particles = []; this.constraints = []; }
}
