# 📋 Product Requirements Document (PRD)
## Melon Sandbox — HTML5 Web Clone

**Version:** 1.0  
**Last Updated:** 2026-08-02  
**Status:** Draft — open for editing before development begins

---

## 1. Overview

### 1.1 Product Vision

Build a browser-native 2D ragdoll physics sandbox game that captures the spirit of Melon Sandbox / Melon Playground — a chaotic, creative, open-ended simulation toy — using only HTML5 Canvas, CSS, and Vanilla JavaScript with no external libraries or build tools. The game must be deployable as a static site on GitHub Pages.

### 1.2 Goals

| Goal | Description |
|---|---|
| **Playable in browser** | Zero installation, works via GitHub Pages URL |
| **No build tools** | Plain `.html`, `.css`, `.js` — open and run |
| **Physics fidelity** | Believable ragdoll physics with verlet integration |
| **Fun first** | Prioritize satisfying, chaotic interactions over technical perfection |
| **Extensible** | Code architecture must allow easy addition of new entities |

### 1.3 Non-Goals (v1.0)

- No multiplayer
- No user-uploaded mods/content
- No 3D rendering
- No mobile-first design (keyboard+mouse primary, touch stretch goal)
- No backend / server-side code

---

## 2. Target Users

| User Type | Description |
|---|---|
| **Casual browser gamers** | Want to play immediately, no sign-up, no install |
| **Physics sandbox fans** | Fans of People Playground, Melon Sandbox, Happy Wheels |
| **Developers / learners** | Interested in seeing a pure JS physics engine implementation |

---

## 3. Core Mechanics

### 3.1 Physics Engine

The game will implement a lightweight **2D impulse/verlet-based physics engine** in pure JavaScript.

| Feature | Requirement |
|---|---|
| Gravity | Constant downward acceleration (configurable) |
| Rigid bodies | Position, velocity, mass, restitution, friction |
| Verlet integration | Position-based dynamics for stable simulation |
| Collision detection | AABB broad-phase + SAT/circle narrow-phase |
| Collision response | Impulse resolution with restitution and friction |
| Constraints | Distance joints, hinge joints for ragdoll limbs |
| Fixed timestep | 60 FPS target with `requestAnimationFrame` |
| Sleeping | Bodies at rest enter a sleep state to save CPU |

**Physics library:** Custom — no Box2D, Matter.js, or other external engines.

> 💡 **Design note:** The physics engine does NOT need to be perfectly realistic. It needs to feel fun and responsive. Ragdoll floppiness and exaggerated reactions are features, not bugs.

### 3.2 Ragdoll System

The primary interactive entity is a **humanoid ragdoll**.

| Part | Description |
|---|---|
| Head | Circle collider, top of body |
| Torso | Rectangle collider, main body |
| Upper Arms (x2) | Rectangle colliders |
| Lower Arms (x2) | Rectangle colliders |
| Upper Legs (x2) | Rectangle colliders |
| Lower Legs (x2) | Rectangle colliders |

Each part is connected via **hinge/distance constraints** that limit joint angle. When force is applied (explosion, bullet, etc.), joints absorb and transfer the force realistically.

**Ragdoll states:**
- `alive` — upright, passive reaction to physics
- `dead` — fully limp, all joints relaxed
- `pinned` — one or more limbs pinned to the world

### 3.3 Interaction / Tools

The player uses **tools** selected from a toolbar to interact with the world.

| Tool | Description |
|---|---|
| **Spawn** | Click canvas to place the selected item from palette |
| **Grab** | Click + drag any object to move it; release to throw |
| **Rotate** | While hovering an object, right-drag or press R to rotate |
| **Delete** | Click an object to remove it from the simulation |
| **Force Push** | Click near an object to apply an outward force impulse |
| **Freeze/Unfreeze** | Toggle static body mode on any object |
| **Pin** | Attach an object joint to a fixed world point |

### 3.4 Entity Catalogue

#### Characters
| Entity | Description |
|---|---|
| Ragdoll (Human) | Standard humanoid, reacts to damage and force |
| *(v2) Melon head variant* | Ragdoll with melon pixel art head |

#### Weapons (Spawnable, Can Be Held by Hand-Grab)
| Entity | Description |
|---|---|
| Pistol | Single shot, medium velocity projectile |
| Shotgun | Fires spread of pellets |
| Rifle / Assault Rifle | Rapid fire, moderate recoil |
| Rocket Launcher | Fires a rocket that explodes on impact |
| Grenade | Thrown arc projectile, delayed explosion |
| Sword / Knife | Melee, applies slice force on contact |
| Bat | Blunt melee, large impulse force |
| Bomb | Placed, timer-detonated explosion |

> **Weapon fire mechanic:** Player grabs a weapon with Grab tool, then clicks a fire button or presses a key to discharge it toward the mouse cursor.

#### Props
| Entity | Description |
|---|---|
| Wooden Crate | Breakable on impact |
| Metal Barrel | Heavy, rolls, flammable (optional) |
| Rubber Ball | Highly elastic, bouncy |
| Platform (small/large) | Static ground element |
| Ramp | Angled platform |
| Spike / Blade trap | Damages ragdolls on contact |
| Fan | Applies constant force in a direction |
| TNT Block | Explodes on impact or trigger |

#### Environment
| Entity | Description |
|---|---|
| Ground (default) | Pre-placed static floor |
| Wall segment | Vertical static block |
| Gravity field | Zone that applies custom gravity |

### 3.5 Projectile & Explosion System

**Projectiles:**
- Treated as fast-moving rigid bodies
- Ray-cast (or fast body step) to prevent tunneling
- On contact: apply impulse to hit body, create hit particle effect
- Bullets leave a brief tracer trail

**Explosions:**
- Defined by: `center`, `radius`, `force`, `damage`
- Apply radial impulse falloff to all bodies within radius
- Play particle burst animation (sparks, smoke)
- Screen shake proportional to blast force

---

## 4. User Interface

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  TOOLBAR (top bar: tools, pause, clear, save/load)      │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  PALETTE   │           CANVAS (game world)              │
│  (left     │                                            │
│  sidebar)  │                                            │
│            │                                            │
│  [Characters]                                           │
│  [Weapons] │                                            │
│  [Props]   │                                            │
│  [Env]     │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

### 4.2 Item Palette

- Collapsible left sidebar
- Tabs: Characters | Weapons | Props | Environment
- Each item shown as a pixel-art icon + label
- Clicking an item selects it for spawning (Spawn tool auto-activates)
- Selected item shows a ghost preview on the canvas following the cursor

### 4.3 Toolbar

Top bar contains:
- **Tool buttons:** Spawn, Grab, Rotate, Delete, Force, Freeze, Pin
- **Simulation controls:** Play/Pause (P), Step-once, Clear all
- **File controls:** Save (Ctrl+S), Load (Ctrl+O)
- **Settings:** Gravity toggle, Wind toggle

### 4.4 HUD Overlays

- Spawn ghost preview (semi-transparent entity outline)
- Selected entity highlight (glow border)
- Force vector arrow (shown when dragging grab tool)
- FPS counter (small, top-right corner)
- "PAUSED" overlay text when simulation is paused

### 4.5 Visual Style

| Attribute | Value |
|---|---|
| Art style | Pixel art / retro (matching Melon Sandbox aesthetic) |
| Background | Dark tile pattern or simple solid dark color |
| Color palette | Dark theme — dark greys, with accent orange/red |
| Font | Monospace pixel font (e.g. Press Start 2P from Google Fonts) |
| Canvas background | Dark grid pattern (optional) |
| Ragdoll color | Warm skin tones with dark outline |

---

## 5. Camera System

| Feature | Description |
|---|---|
| Pan | Hold Space + drag, or middle-mouse drag |
| Zoom | Scroll wheel, 0.25x to 4x range |
| World size | Effectively infinite (objects can be anywhere) |
| Default view | Centers on a 1280×720 world area |

The camera transform is applied as a `canvas.setTransform()` call each frame before drawing.

---

## 6. Scene Save / Load

- **Format:** JSON stored in `localStorage` (key: `melon-sandbox-scene`)
- **Saved data:** All entity types, positions, rotations, states, velocities
- **Export/Import:** Optional future feature — download `.json` file

---

## 7. Performance Requirements

| Metric | Target |
|---|---|
| Target frame rate | 60 FPS |
| Max simultaneous entities | ~100 (ragdolls + props) before degradation |
| Physics timestep | Fixed 1/60 s |
| Broad-phase optimization | Spatial grid or simple AABB tree |
| Rendering optimization | Dirty-rect or full clear + redraw each frame |

---

## 8. Audio (Stretch Goal)

Using the **Web Audio API** (no external library):

| Sound | Trigger |
|---|---|
| Gunshot | Weapon fired |
| Explosion boom | Explosion detonated |
| Thud | Ragdoll hits ground |
| Metal clank | Metal props colliding |
| Whoosh | Object thrown at high velocity |

All audio is generated procedurally (Web Audio oscillators + noise) or uses royalty-free audio files bundled in `/assets/audio/`.

---

## 9. Mobile / Touch (Stretch Goal)

| Feature | Description |
|---|---|
| Touch spawn | Tap to spawn selected item |
| Pinch to zoom | Standard pinch gesture |
| Touch grab | Single finger drag |
| Bottom palette | Palette moved to bottom drawer on small screens |

---

## 10. Milestones & Phases

### Phase 1 — Foundation
- [ ] `index.html` shell, canvas setup, game loop
- [ ] 2D vector math utilities (`vector.js`)
- [ ] Basic physics: rigid body, gravity, ground collision
- [ ] Canvas renderer with camera transform

### Phase 2 — Core Physics
- [ ] Verlet integration + distance constraints
- [ ] SAT collision detection between convex polygons
- [ ] Impulse-based collision response
- [ ] Circle vs polygon collision

### Phase 3 — Ragdoll
- [ ] Multi-body ragdoll with hinge joints
- [ ] Ragdoll rendering (pixel art limbs)
- [ ] Mouse grab interaction
- [ ] Ragdoll spawning from palette

### Phase 4 — Entities
- [ ] Weapon entities (pistol, grenade, sword)
- [ ] Projectile + raycasting
- [ ] Explosion system with particle burst
- [ ] Props (crate, barrel, platform)

### Phase 5 — UI
- [ ] Item palette sidebar
- [ ] Toolbar with tool switching
- [ ] Ghost spawn preview
- [ ] Pause/resume/clear controls

### Phase 6 — Polish
- [ ] Screen shake on explosions
- [ ] Particle effects (blood, sparks, smoke)
- [ ] Sound effects (Web Audio)
- [ ] Camera pan & zoom
- [ ] Save/Load scenes
- [ ] Mobile touch support

---

## 11. Open Questions / Decisions Needed

> ✏️ **Please review and edit these before development starts.**

| # | Question | Options | Decision |
|---|---|---|---|
| 1 | Physics engine approach | A) Custom verlet, B) Custom impulse, C) Integrate Matter.js as external file | TBD |
| 2 | Art style for ragdolls | A) Simple geometric shapes (circles/rects), B) Pixel art sprites, C) SVG stick figures | TBD |
| 3 | Weapon firing | A) Player clicks a fire button while holding weapon, B) Weapons auto-fire when spawned at cursor direction, C) Keyboard key fires selected weapon | TBD |
| 4 | Map / world size | A) Single infinite scrolling world, B) Fixed map with borders, C) Multiple selectable maps | TBD |
| 5 | Save/load | A) localStorage only, B) Download/upload JSON file, C) Both | TBD |
| 6 | Ragdoll death | A) Visual change only (limp), B) Disappear after timer, C) Persistent forever (potential perf issue) | TBD |
| 7 | Pixel art assets | A) Generate with code (canvas draw calls), B) Include sprite sheet PNG files, C) Inline SVG | TBD |
| 8 | Scope of v1.0 weapons | Minimum viable weapon set? | TBD |

---

## 12. Acceptance Criteria (v1.0 Definition of Done)

- [ ] Game loads in browser by opening `index.html` (no server, no build step)
- [ ] Game deploys to GitHub Pages and works at the Pages URL
- [ ] Player can spawn at least 1 ragdoll character
- [ ] Player can spawn at least 3 weapon types
- [ ] Player can spawn at least 3 prop types
- [ ] Physics simulation runs at ≥30 FPS with 10+ active ragdolls
- [ ] Mouse grab/drag works on all entities
- [ ] Explosion applies radial force correctly
- [ ] UI palette and toolbar are functional
- [ ] Scene can be saved and reloaded via localStorage
- [ ] Works in latest Chrome, Firefox, and Safari
