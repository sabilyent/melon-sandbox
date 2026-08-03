'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  GAME — Main game class, loop, tools, UI, save/load
// ═══════════════════════════════════════════════════════════════════════════════

class Camera {
  constructor(canvas) {
    this.canvas  = canvas;
    this.x       = 0;      // world X at screen center
    this.y       = 380;    // world Y at screen center
    this.zoom    = 1.0;
    this.minZoom = 0.2;
    this.maxZoom = 4.0;
    this._dragStart = null;
    this._camStart  = null;
  }

  // Convert screen coordinates to world coordinates
  toWorld(sx, sy) {
    return new Vec2(
      (sx - this.canvas.width  / 2) / this.zoom + this.x,
      (sy - this.canvas.height / 2) / this.zoom + this.y
    );
  }

  // Convert world coordinates to screen coordinates
  toScreen(wx, wy) {
    return new Vec2(
      (wx - this.x) * this.zoom + this.canvas.width  / 2,
      (wy - this.y) * this.zoom + this.canvas.height / 2
    );
  }

  apply(ctx, shakeX = 0, shakeY = 0) {
    ctx.translate(this.canvas.width/2 + shakeX, this.canvas.height/2 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  pan(dx, dy) { this.x -= dx / this.zoom; this.y -= dy / this.zoom; }

  zoomAt(sx, sy, factor) {
    const before = this.toWorld(sx, sy);
    this.zoom    = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const after  = this.toWorld(sx, sy);
    this.x      -= after.x - before.x;
    this.y      -= after.y - before.y;
  }

  reset() { this.x = 0; this.y = 380; this.zoom = 1.0; }
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
class Game {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.camera  = new Camera(canvas);
    this.world   = new World();
    this.effects = new EffectsManager();

    this.entities    = [];  // all logical entities
    this.projectiles = [];  // active projectiles
    this.history     = [];  // for undo (stores removal functions)

    // ── Tool state ──
    this.currentTool   = 'grab';   // 'grab'|'spawn'|'delete'|'push'|'freeze'
    this.selectedItem  = null;     // item id from palette
    this.grabbedParticle = null;
    this.mouseWorld    = new Vec2();
    this.mouseScreen   = new Vec2();
    this.isPanning     = false;
    this.panStart      = null;
    this.camAtPan      = null;
    this.mouseDown     = false;
    this.aimStart      = null;     // for grenade throw aiming

    // ── Bombs list (for manual detonation) ──
    this.bombs = [];

    // ── Stats ──
    this.stats = { spawned: 0, exploded: 0, fired: 0 };

    // ── FPS ──
    this._fps     = 60;
    this._frames  = 0;
    this._fpsTimer= 0;
    this._last    = 0;

    // ── Ghost preview ──
    this.ghostPos  = new Vec2(-9999, -9999);
    this.showGhost = false;

    this._setupInput();
    this._spawnInitialScene();
    this._loop(0);
  }

  // ── INITIAL SCENE ────────────────────────────────────────────────────────
  _spawnInitialScene() {
    // Ground platforms
    this._addEntity(new BoxProp( 200, this.world.groundY - 60, 200, 20, this.world, { fixed:true, type:'platform', color:'#445', outline:'#334', label:'Platform' }));
    this._addEntity(new BoxProp(-200, this.world.groundY - 120, 200, 20, this.world,{ fixed:true, type:'platform', color:'#445', outline:'#334', label:'Platform' }));

    // Starter crates
    for (let i = 0; i < 3; i++) {
      this._addEntity(new BoxProp(-60+i*60, this.world.groundY - 40, 50, 50, this.world,
        { type:'crate', color:'#8b6914', outline:'#5a4009' }));
    }

    // A ragdoll
    this._addEntity(new Ragdoll(0, this.world.groundY - 200, this.world, 'human'));
    this._addEntity(new Ragdoll(120, this.world.groundY - 200, this.world, 'zombie'));

    // Ball
    this._addEntity(new BallProp(200, this.world.groundY - 60, 20, this.world, '#ef5350'));
  }

  // ── ENTITY MANAGEMENT ────────────────────────────────────────────────────
  _addEntity(e) {
    this.entities.push(e);
    this.stats.spawned++;
    this.effects.spawn(e.center?.().x || 0, e.center?.().y || 0);
    return e;
  }

  _removeEntity(e) {
    if (!e) return;
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    if (e.remove) e.remove(this.world);
    const bi = this.bombs.indexOf(e);
    if (bi >= 0) this.bombs.splice(bi, 1);
  }

  _findEntityAt(worldPos, radius = 50) {
    for (const e of this.entities) {
      if (e.particles) {
        for (const p of e.particles) {
          if (Vec2.dist(p.pos, worldPos) < radius) return e;
        }
      }
    }
    return null;
  }

  clearAll() {
    for (const e of [...this.entities]) e.remove(this.world);
    for (const p of [...this.projectiles]) p.remove(this.world);
    this.entities    = [];
    this.projectiles = [];
    this.bombs       = [];
    this.world.clear();
    this.effects.effects = [];
    this.history = [];
    this.effects.pop(0, this.world.groundY - 50, 'CLEARED!', '#4ade80');
  }

  undo() {
    if (this.history.length === 0) return;
    const e = this.history.pop();
    this._removeEntity(e);
    this.effects.pop(this.camera.x, this.world.groundY - 100, 'UNDO', '#a78bfa');
  }

  // ── SPAWNING ─────────────────────────────────────────────────────────────
  spawnAt(worldPos) {
    const item = this.selectedItem;
    if (!item) return;
    const x = worldPos.x, y = worldPos.y;
    let e = null;

    // Characters
    if (Object.keys(RAGDOLL_PRESETS).includes(item)) {
      e = new Ragdoll(x, y, this.world, item);
    }
    // Props
    else if (item === 'crate')    e = new BoxProp(x, y, 55, 55, this.world, { type:'crate',    color:'#8b6914', outline:'#5a4009' });
    else if (item === 'barrel')   e = new BoxProp(x, y, 45, 70, this.world, { type:'barrel',   color:'#b71c1c', outline:'#7f0000' });
    else if (item === 'platform') e = new BoxProp(x, y, 200, 20, this.world, { fixed:true, type:'platform', color:'#445', outline:'#334' });
    else if (item === 'ball')     e = new BallProp(x, y, 22, this.world, '#ef5350');
    else if (item === 'bigball')  e = new BallProp(x, y, 40, this.world, '#ab47bc');
    // Explosives
    else if (item === 'grenade')  { e = new Explosive(x, y, this.world, { type:'grenade', timer:3.0, blastR:120, force:10 }); }
    else if (item === 'bomb')     { e = new Explosive(x, y, this.world, { type:'bomb',    timer:Infinity, blastR:180, force:14 }); this.bombs.push(e); }
    else if (item === 'mine')     { e = new Explosive(x, y, this.world, { type:'mine',    timer:Infinity, blastR:100, force:8  }); this.bombs.push(e); }
    // Weapons (fire)
    else if (['pistol','rifle','shotgun','rocket','flamethrower'].includes(item)) {
      this._fireWeapon(item, worldPos);
      return;
    }

    if (e) {
      this._addEntity(e);
      this.history.push(e);
      if (this.history.length > 30) this.history.shift();
    }
  }

  _fireWeapon(weapon, worldPos) {
    const { x, y } = worldPos;
    const leftX = this.camera.toWorld(0, 0).x - 50;
    const origin = new Vec2(leftX, y);
    const dir    = worldPos.sub(origin).norm();
    this.stats.fired++;

    if (weapon === 'pistol') {
      this._spawnBullet(origin, dir.mul(1400), { radius:4, color:'#FFD700', glow:'#FF8800', life:2 });
    } else if (weapon === 'rifle') {
      this._spawnBullet(origin, dir.mul(2200), { radius:3, color:'#e0e0e0', glow:'#bbb', life:2 });
    } else if (weapon === 'shotgun') {
      for (let i = -2; i <= 2; i++) {
        const spread = i * 0.06 + (Math.random()-0.5)*0.04;
        const a = Math.atan2(dir.y, dir.x) + spread;
        this._spawnBullet(origin.clone(), Vec2.fromAngle(a).mul(1100),
          { radius:5, color:'#ffcc02', glow:'#ff9800', life:1 });
      }
    } else if (weapon === 'rocket') {
      const botY  = this.camera.toWorld(0, this.canvas.height).y + 50;
      const rOrigin = new Vec2(x, botY);
      const rDir    = worldPos.sub(rOrigin).norm();
      this._spawnBullet(rOrigin, rDir.mul(700), { radius:8, color:'#ff5722', glow:'#ff9800', life:4, isRocket:true });
    } else if (weapon === 'flamethrower') {
      const fire = new FireStream(x, y, dir.x, dir.y);
      this.entities.push(fire);
      setTimeout(()=>{ const i=this.entities.indexOf(fire); if(i>=0)this.entities.splice(i,1); }, 600);
    }
  }

  _spawnBullet(origin, velocity, opts = {}) {
    const proj = new Projectile(origin.x, origin.y, velocity.x, velocity.y, opts);
    this.projectiles.push(proj);
    this.world.particles.push(proj.particle);
    return proj;
  }

  // ── EXPLOSION ─────────────────────────────────────────────────────────────
  _explode(x, y, blastR, force, opts = {}) {
    this.world.applyExplosion(new Vec2(x,y), blastR, force);
    this.effects.explosion(x, y, blastR, { label: opts.label ?? 'BOOM!' });
    this.stats.exploded++;

    // Deal explosion damage to all entities in range
    const ePos = new Vec2(x, y);
    for (const e of [...this.entities]) {
      if (e === opts.self) continue;
      const c = e.center ? e.center() : null;
      if (!c) continue;
      const d = Vec2.dist(ePos, c);
      if (d < blastR + 35) {
        const dmg = Math.round((1 - Math.min(d, blastR) / blastR) * 95) + 15;
        if (e.takeDamage) e.takeDamage(dmg, c);
      }
    }

    // Chain-react other explosives in range
    for (const e of [...this.entities]) {
      if (e.isExplosive && e.alive && e !== opts.self) {
        const d = Vec2.dist(new Vec2(x,y), e.center());
        if (d < blastR + 30) {
          setTimeout(()=>this._explodeEntity(e), 100 + Math.random()*200);
        }
      }
    }
  }

  _explodeEntity(e) {
    if (!e.alive) return;
    const c = e.center();
    this._explode(c.x, c.y, e.radius, e.force, { self: e, label:'💥 CHAIN!' });
    this._removeEntity(e);
  }

  detonateAll() {
    // Find all explosive entities (bombs, grenades, mines, barrels)
    const toExplode = this.entities.filter(e => 
      e.alive && (e.tag === 'explosive' || e.type === 'bomb' || e.type === 'grenade' || e.type === 'mine' || e.type === 'barrel' || this.bombs.includes(e))
    );

    if (toExplode.length > 0) {
      toExplode.forEach((b, i) => {
        setTimeout(() => {
          if (b.alive) this._explodeEntity(b);
        }, i * 100);
      });
      this.bombs = [];
    } else {
      // Fallback: Massive explosion at camera center if no explosives exist
      const cx = this.camera.x;
      const cy = this.camera.y;
      this._explode(cx, cy, 260, 25, { label: '💣 BOOM!' });
    }
  }

  // ── PROJECTILE COLLISION ──────────────────────────────────────────────────
  _checkProjectileHits() {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      const pp = proj.particle.pos;

      // Ground hit
      if (pp.y + proj.radius > this.world.groundY) {
        if (proj.isRocket) {
          this._explode(pp.x, pp.y, 160, 13, { label:'🚀 DIRECT HIT!' });
        } else {
          this.effects.hit(pp.x, pp.y);
        }
        proj.remove(this.world);
        continue;
      }

      // Entity hit
      for (const e of this.entities) {
        if (!e.particles || e === proj) continue;
        let hitParticle = null;
        for (const ep of e.particles) {
          if (Vec2.dist(pp, ep.pos) < proj.radius + ep.radius + 3) { hitParticle = ep; break; }
        }
        if (hitParticle) {
          if (proj.isRocket) {
            this._explode(pp.x, pp.y, 160, 13, { label:'🚀 DIRECT HIT!' });
          } else {
            // Apply bullet impulse & deal damage with blood spurts/fracture
            const dir = proj.particle.velocity().norm();
            for (const ep of e.particles) ep.addVelocity(dir.mul(0.12 / ep.mass));
            this.effects.hit(pp.x, pp.y);

            if (e.takeDamage) {
              const dmg = Math.floor(25 + Math.random() * 30);
              e.takeDamage(dmg, pp, hitParticle);
            }
          }
          proj.remove(this.world);
          break;
        }
      }
    }
  }

  // ── MINES PROXIMITY CHECK ─────────────────────────────────────────────────
  _checkMines() {
    for (const b of [...this.bombs]) {
      if (!b.alive || b.type !== 'mine') continue;
      for (const e of this.entities) {
        if (e === b || !e.particles) continue;
        for (const ep of e.particles) {
          if (Vec2.dist(ep.pos, b.particle.pos) < b.radius * 0.4) {
            this._explodeEntity(b);
            break;
          }
        }
      }
    }
  }

  // ── INPUT ─────────────────────────────────────────────────────────────────
  _setupInput() {
    const c = this.canvas;

    // Mouse move
    c.addEventListener('mousemove', e => {
      const rect = c.getBoundingClientRect();
      this.mouseScreen.x = e.clientX - rect.left;
      this.mouseScreen.y = e.clientY - rect.top;
      this.mouseWorld    = this.camera.toWorld(this.mouseScreen.x, this.mouseScreen.y);
      this.ghostPos      = this.mouseWorld.clone();

      if (this.isPanning && this.panStart) {
        const dx = e.clientX - this.panStart.x;
        const dy = e.clientY - this.panStart.y;
        this.camera.x = this.camAtPan.x - dx / this.camera.zoom;
        this.camera.y = this.camAtPan.y - dy / this.camera.zoom;
      }

      if (this.grabbedParticle && !this.world.paused) {
        const mw = this.mouseWorld;
        this.grabbedParticle.pos.x += (mw.x - this.grabbedParticle.pos.x) * 0.55;
        this.grabbedParticle.pos.y += (mw.y - this.grabbedParticle.pos.y) * 0.55;
      }
    });

    // Mouse down
    c.addEventListener('mousedown', e => {
      const rect = c.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wpos = this.camera.toWorld(sx, sy);

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle button or Alt+LMB = pan
        this.isPanning   = true;
        this.panStart    = { x: e.clientX, y: e.clientY };
        this.camAtPan    = { x: this.camera.x, y: this.camera.y };
        e.preventDefault();
        return;
      }

      this.mouseDown = true;
      this.aimStart  = wpos.clone();

      if (e.button === 0) this._handleToolDown(wpos);
    });

    // Mouse up
    c.addEventListener('mouseup', e => {
      if (e.button === 1) { this.isPanning = false; return; }
      this.mouseDown = false;
      if (this.isPanning) { this.isPanning = false; return; }

      if (e.button === 0) this._handleToolUp();

      // Throw grabbed particle
      if (this.grabbedParticle) {
        this.grabbedParticle = null;
      }
    });

    // Wheel → zoom
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.camera.zoomAt(this.mouseScreen.x, this.mouseScreen.y, e.deltaY < 0 ? 1.12 : 1/1.12);
    }, { passive: false });

    // Context menu disable
    c.addEventListener('contextmenu', e => e.preventDefault());

    // Right click — detonate / force push
    c.addEventListener('mousedown', e => {
      if (e.button === 2) {
        const rect = c.getBoundingClientRect();
        const wpos = this.camera.toWorld(e.clientX-rect.left, e.clientY-rect.top);
        this._forcePush(wpos, 80, 6);
        e.preventDefault();
      }
    });

    // Space = pan
    window.addEventListener('keydown', e => this._handleKey(e));

    // ── Touch Events ──
    let lastTouchDist = 0;
    let lastTouchMid = null;

    c.addEventListener('touchstart', e => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        this.mouseScreen.x = touch.clientX - rect.left;
        this.mouseScreen.y = touch.clientY - rect.top;
        this.mouseWorld    = this.camera.toWorld(this.mouseScreen.x, this.mouseScreen.y);
        this.ghostPos      = this.mouseWorld.clone();
        this.mouseDown     = true;
        this.aimStart      = this.mouseWorld.clone();

        this._handleToolDown(this.mouseWorld);
      } else if (e.touches.length === 2) {
        // Multi-touch: setup pinch & pan
        this.grabbedParticle = null; // drop any grabbed object
        this.mouseDown = false;
        const t1 = e.touches[0], t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        lastTouchDist = Math.hypot(dx, dy);
        lastTouchMid  = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top
        };
      }
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();

      if (e.touches.length === 1 && !lastTouchMid) {
        const touch = e.touches[0];
        this.mouseScreen.x = touch.clientX - rect.left;
        this.mouseScreen.y = touch.clientY - rect.top;
        this.mouseWorld    = this.camera.toWorld(this.mouseScreen.x, this.mouseScreen.y);
        this.ghostPos      = this.mouseWorld.clone();

        if (this.grabbedParticle && !this.world.paused) {
          const mw = this.mouseWorld;
          this.grabbedParticle.pos.x += (mw.x - this.grabbedParticle.pos.x) * 0.55;
          this.grabbedParticle.pos.y += (mw.y - this.grabbedParticle.pos.y) * 0.55;
        }
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const dist = Math.hypot(dx, dy);
        const mid  = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top
        };

        if (lastTouchDist > 0 && dist > 0) {
          // Pinch Zoom
          const factor = dist / lastTouchDist;
          this.camera.zoomAt(mid.x, mid.y, factor);

          // Pan
          if (lastTouchMid) {
            const pdx = mid.x - lastTouchMid.x;
            const pdy = mid.y - lastTouchMid.y;
            this.camera.x -= pdx / this.camera.zoom;
            this.camera.y -= pdy / this.camera.zoom;
          }
        }
        lastTouchDist = dist;
        lastTouchMid  = mid;
      }
    }, { passive: false });

    const handleTouchEnd = e => {
      if (e.touches.length === 0) {
        this.mouseDown = false;
        this._handleToolUp();
        if (this.grabbedParticle) this.grabbedParticle = null;
        lastTouchDist = 0;
        lastTouchMid  = null;
      } else if (e.touches.length === 1) {
        lastTouchDist = 0;
        lastTouchMid  = null;
      }
    };

    c.addEventListener('touchend', handleTouchEnd, { passive: true });
    c.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  }

  _handleToolDown(wpos) {
    switch (this.currentTool) {
      case 'grab': {
        const p = this.world.findNearest(wpos, 50, true);
        if (p) this.grabbedParticle = p;
        break;
      }
      case 'spawn':
        this.showGhost = false;
        this.spawnAt(wpos);
        break;
      case 'delete': {
        const e = this._findEntityAt(wpos);
        if (e) {
          const c = e.center();
          this.effects.pop(c.x, c.y, 'DELETED', '#f87171');
          this._removeEntity(e);
        }
        break;
      }
      case 'push':
        this._forcePush(wpos, 100, 8);
        break;
      case 'freeze': {
        const p = this.world.findNearest(wpos, 50);
        if (p) {
          p.fixed = !p.fixed;
          this.effects.pop(p.pos.x, p.pos.y, p.fixed ? '❄ FROZEN' : '▶ FREE', '#22d3ee');
        }
        break;
      }
    }
  }

  _handleToolUp() {
    // Grenade throw: on mouseup, throw with velocity based on drag distance
    if (this.currentTool === 'spawn' && this.selectedItem === 'grenade' && this.aimStart) {
      // Already spawned on mousedown; could add throw velocity here
    }
  }

  _forcePush(wpos, radius, force) {
    this.world.applyExplosion(wpos, radius, force);
    this.effects.effects.push(new Shockwave(wpos.x, wpos.y, radius, { color:'#22d3ee', lw:2 }));
    this.effects.shake.add(3);
  }

  _handleKey(e) {
    if ((e.target.tagName === 'INPUT') || (e.target.tagName === 'BUTTON')) return;
    switch (e.key.toLowerCase()) {
      case 'p':         this.world.paused = !this.world.paused; this._updatePauseUI(); break;
      case 's':         this.world.slowMo = !this.world.slowMo; break;
      case 'g':         this._cycleGravity(); break;
      case 'r':         this.camera.reset(); break;
      case 'f':         this.detonateAll(); break;
      case ' ':         e.preventDefault(); this.camera.reset(); break;
      case 'delete':
      case 'backspace': this.clearAll(); break;
      case 'z':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.undo(); }
        break;
      case '1': this._selectTool('grab');   break;
      case '2': this._selectTool('spawn');  break;
      case '3': this._selectTool('delete'); break;
      case '4': this._selectTool('push');   break;
      case '5': this._selectTool('freeze'); break;
    }
  }

  _cycleGravity() {
    const g = this.world.gravity;
    if      (g > 500) { this.world.gravity = 150;  this.effects.pop(this.camera.x, this.world.groundY-200, '🌙 LOW GRAV', '#a78bfa'); }
    else if (g > 0)   { this.world.gravity = 0;    this.effects.pop(this.camera.x, this.world.groundY-200, '🚀 ZERO G',   '#22d3ee'); }
    else if (g === 0) { this.world.gravity = -400;  this.effects.pop(this.camera.x, this.world.groundY-200, '⬆ ANTI-G',   '#f87171'); }
    else              { this.world.gravity = 750;   this.effects.pop(this.camera.x, this.world.groundY-200, '↓ NORMAL G', '#4ade80'); }
  }

  _updatePauseUI() {
    const el = document.getElementById('pause-overlay');
    if (el) el.style.display = this.world.paused ? 'flex' : 'none';
    const btn = document.getElementById('btn-pause');
    if (btn) btn.classList.toggle('active', this.world.paused);
  }

  _selectTool(tool) {
    this.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tool-' + tool);
    if (btn) btn.classList.add('active');
    this.canvas.className = tool === 'grab' ? 'cursor-grab' :
                            tool === 'delete' ? 'cursor-delete' :
                            tool === 'push'   ? 'cursor-push'   : '';
  }

  // ── MAIN LOOP ─────────────────────────────────────────────────────────────
  _loop(ts) {
    requestAnimationFrame(t => this._loop(t));
    const dt = Math.min((ts - this._last) / 1000, 0.05);
    this._last = ts;

    // FPS counter
    this._frames++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 0.5) {
      this._fps = Math.round(this._frames / this._fpsTimer);
      this._frames = 0; this._fpsTimer = 0;
    }

    // Physics update
    this.world.update(dt);

    // Update projectiles
    for (const p of this.projectiles) p.update(dt);
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Update entities (Ragdoll standing balance, health, props damage, explosives)
    for (const e of [...this.entities]) {
      if (e.isExplosive && e.alive) {
        const shouldExplode = e.update(dt);
        if (shouldExplode) {
          const c = e.center ? e.center() : (e.particle ? e.particle.pos : new Vec2());
          this._explode(c.x, c.y, e.radius, e.force, { self: e, label: '💥 GRENADE!' });
          this._removeEntity(e);
        }
      } else if (e.update) {
        e.update(dt);
      }

      if (e.type === 'fire' && e.update) {
        e.checkHits && e.checkHits(this.world.particles, (...a)=>this._explode(...a));
      }
    }

    this._checkProjectileHits();
    this._checkMines();

    // Effects
    this.effects.update(dt);

    // Render
    this._render(dt);

    // Update HUD
    this._updateHUD();
  }

  // ── RENDERER ──────────────────────────────────────────────────────────────
  _render(dt) {
    const { ctx, canvas, camera, world, effects } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // ── Background ──
    this._drawBackground(ctx, canvas, camera);

    // ── World ──
    ctx.save();
    camera.apply(ctx, effects.shake.x, effects.shake.y);

    // Grid
    this._drawGrid(ctx, camera);

    // Ground
    this._drawGround(ctx, world.groundY);

    // Entities
    for (const e of this.entities) {
      if (e.draw) e.draw(ctx, this);
    }

    // Projectiles
    for (const p of this.projectiles) p.draw(ctx);

    // Effects (in world space)
    effects.draw(ctx);

    // Ghost preview
    if (this.currentTool === 'spawn' && this.selectedItem && !this.mouseDown) {
      this._drawGhost(ctx, this.ghostPos);
    }

    // Grab line
    if (this.grabbedParticle) {
      ctx.beginPath();
      ctx.moveTo(this.mouseWorld.x, this.mouseWorld.y);
      ctx.lineTo(this.grabbedParticle.pos.x, this.grabbedParticle.pos.y);
      ctx.strokeStyle = 'rgba(74,222,128,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(this.mouseWorld.x, this.mouseWorld.y, 8, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(74,222,128,0.4)';
      ctx.fill();
    }

    ctx.restore();

    // ── Aiming line (weapon mode from left) ──
    if (['pistol','rifle','shotgun','rocket','flamethrower'].includes(this.selectedItem) && this.currentTool === 'spawn') {
      this._drawAimLine(ctx, camera);
    }
  }

  _drawBackground(ctx, canvas, camera) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#0d0d12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _drawGrid(ctx, camera) {
    const step  = 80;
    const zoom  = camera.zoom;
    const alpha = Math.max(0, Math.min(0.15, zoom * 0.1));
    if (alpha < 0.01) return;

    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth   = 0.5;

    const left   = camera.x - camera.canvas.width  / (2 * zoom) - step;
    const right  = camera.x + camera.canvas.width  / (2 * zoom) + step;
    const top    = camera.y - camera.canvas.height / (2 * zoom) - step;
    const bottom = camera.y + camera.canvas.height / (2 * zoom) + step;

    for (let x = Math.floor(left/step)*step; x < right; x += step) {
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    }
    for (let y = Math.floor(top/step)*step; y < bottom; y += step) {
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    }
    ctx.restore();
  }

  _drawGround(ctx, groundY) {
    const left  = -4500;
    const right =  4500;

    // Ground fill
    const grd = ctx.createLinearGradient(0, groundY, 0, groundY + 200);
    grd.addColorStop(0,   '#2d4a1e');
    grd.addColorStop(0.1, '#1a2e10');
    grd.addColorStop(1,   '#0a1008');
    ctx.fillStyle = grd;
    ctx.fillRect(left, groundY, right - left, 300);

    // Top grass strip
    ctx.fillStyle = '#4a7c2f';
    ctx.fillRect(left, groundY - 4, right - left, 10);

    // Grass blades (pixel art style)
    ctx.fillStyle = '#5a8f36';
    for (let x = left; x < right; x += 20) {
      const h = 4 + Math.sin(x * 0.3) * 2;
      ctx.fillRect(x, groundY - 4 - h, 3, h);
    }

    // Ground shadow
    const shadowGrd = ctx.createLinearGradient(0, groundY - 20, 0, groundY);
    shadowGrd.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrd.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = shadowGrd;
    ctx.fillRect(left, groundY - 20, right - left, 20);
  }

  _drawGhost(ctx, worldPos) {
    const item = this.selectedItem;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#4ade80';
    ctx.fillStyle   = 'rgba(74,222,128,0.15)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 5]);

    if (Object.keys(RAGDOLL_PRESETS).includes(item)) {
      ctx.beginPath();
      ctx.arc(worldPos.x, worldPos.y - 90, 14, 0, Math.PI*2); ctx.stroke();
      ctx.strokeRect(worldPos.x - 15, worldPos.y - 70, 30, 70);
    } else if (['crate','barrel'].includes(item)) {
      ctx.strokeRect(worldPos.x - 27, worldPos.y - 27, 54, 54);
    } else if (item === 'ball' || item === 'bigball') {
      const r = item === 'bigball' ? 40 : 22;
      ctx.beginPath(); ctx.arc(worldPos.x, worldPos.y, r, 0, Math.PI*2); ctx.stroke();
    } else if (['grenade','bomb','mine'].includes(item)) {
      ctx.beginPath(); ctx.arc(worldPos.x, worldPos.y, 14, 0, Math.PI*2); ctx.stroke();
    } else if (item === 'platform') {
      ctx.strokeRect(worldPos.x - 100, worldPos.y - 10, 200, 20);
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawAimLine(ctx, camera) {
    const ms  = this.mouseScreen;
    const item = this.selectedItem;
    const fromScreen = item === 'rocket'
      ? { x: ms.x, y: this.canvas.height + 10 }
      : { x: -20,  y: ms.y };

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(255,160,0,0.5)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(fromScreen.x, fromScreen.y);
    ctx.lineTo(ms.x, ms.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair
    const [cx, cy] = [ms.x, ms.y];
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth   = 1.5;
    [[cx-12,cy,cx-4,cy],[cx+4,cy,cx+12,cy],[cx,cy-12,cx,cy-4],[cx,cy+4,cx,cy+12]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,152,0,0.6)'; ctx.stroke();
    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  _updateHUD() {
    const fpsEl  = document.getElementById('hud-fps');
    const entEl  = document.getElementById('hud-entities');
    const gravEl = document.getElementById('hud-grav');
    const zoomEl = document.getElementById('hud-zoom');
    if (fpsEl)  fpsEl.textContent  = this._fps + ' fps';
    if (entEl)  entEl.textContent  = this.entities.length + ' entities';
    if (gravEl) gravEl.textContent = (this.world.gravity === 0 ? '🚀 zero-g' :
                                      this.world.gravity < 0   ? '⬆ anti-g'  :
                                      this.world.gravity < 400 ? '🌙 low-g'  : '↓ normal-g');
    if (zoomEl) zoomEl.textContent = Math.round(this.camera.zoom*100) + '%';
    const slowEl = document.getElementById('hud-slowmo');
    if (slowEl) slowEl.style.display = this.world.slowMo ? 'block' : 'none';
  }

  // ── SAVE / LOAD ───────────────────────────────────────────────────────────
  save() {
    try {
      const data = { entities: this.entities.map(e => this._serializeEntity(e)) };
      localStorage.setItem('melon-sandbox-save', JSON.stringify(data));
      this.effects.pop(this.camera.x, this.world.groundY - 150, '💾 SAVED!', '#4ade80');
    } catch(err) { console.error('Save failed', err); }
  }

  load() {
    try {
      const raw = localStorage.getItem('melon-sandbox-save');
      if (!raw) return;
      const data = JSON.parse(raw);
      this.clearAll();
      for (const d of data.entities) this._deserializeEntity(d);
      this.effects.pop(this.camera.x, this.world.groundY - 150, '📂 LOADED!', '#4ade80');
    } catch(err) { console.error('Load failed', err); }
  }

  _serializeEntity(e) {
    const c = e.center();
    return { type: e.type, preset: e.preset, x: c.x, y: c.y, w: e.w, h: e.h, explosive: e.isExplosive };
  }

  _deserializeEntity(d) {
    if (d.type === 'ragdoll') this._addEntity(new Ragdoll(d.x, d.y, this.world, d.preset || 'human'));
    else if (d.type === 'crate') this._addEntity(new BoxProp(d.x, d.y, d.w||55, d.h||55, this.world, { type:'crate' }));
    else if (d.type === 'ball')  this._addEntity(new BallProp(d.x, d.y, 22, this.world));
  }
}

// ─── PALETTE CONFIG ───────────────────────────────────────────────────────────
const PALETTE = {
  characters: [
    { id:'human',    label:'Human',    emoji:'🧑', color:'#3a86ff' },
    { id:'zombie',   label:'Zombie',   emoji:'🧟', color:'#8fbc5c' },
    { id:'skeleton', label:'Skeleton', emoji:'💀', color:'#e8e8e8' },
    { id:'melon',    label:'Melon',    emoji:'🍉', color:'#4caf50' },
    { id:'ninja',    label:'Ninja',    emoji:'🥷', color:'#37474f' },
  ],
  weapons: [
    { id:'pistol',      label:'Pistol',       emoji:'🔫', color:'#ffd740' },
    { id:'rifle',       label:'Rifle',         emoji:'🪖', color:'#aaa' },
    { id:'shotgun',     label:'Shotgun',       emoji:'💥', color:'#ff9800' },
    { id:'rocket',      label:'Rocket',        emoji:'🚀', color:'#ff5722' },
    { id:'flamethrower',label:'Flame',         emoji:'🔥', color:'#ff6d00' },
    { id:'grenade',     label:'Grenade',       emoji:'💣', color:'#4caf50' },
    { id:'bomb',        label:'Bomb',          emoji:'⚫', color:'#555'    },
    { id:'mine',        label:'Mine',          emoji:'⭕', color:'#f44336' },
  ],
  props: [
    { id:'crate',    label:'Crate',    emoji:'📦', color:'#8b6914' },
    { id:'barrel',   label:'Barrel',   emoji:'🛢',  color:'#b71c1c' },
    { id:'ball',     label:'Ball',     emoji:'🔴', color:'#ef5350' },
    { id:'bigball',  label:'Big Ball', emoji:'🟣', color:'#ab47bc' },
    { id:'platform', label:'Platform', emoji:'▬',  color:'#556' },
  ],
};
