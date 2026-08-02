# 🍉 Melon Sandbox — Web Clone

> A browser-based 2D ragdoll physics sandbox game inspired by [Melon Sandbox](https://melonsandbox.com/).  
> Built with pure **HTML5 Canvas + CSS + Vanilla JavaScript** — zero frameworks, zero build tools, runs anywhere including GitHub Pages.

---

## 🎮 What Is This?

Melon Sandbox Web is an open-ended physics sandbox where you spawn ragdoll characters, weapons, props, and environmental objects, then let physics do the rest. There are no rules, no objectives — just creative chaos.

Drag objects, apply forces, shoot weapons, trigger explosions, and watch the ragdolls react. It's a mad-scientist playground in your browser.

---

## 🚀 Play Online

> **GitHub Pages link:** `https://<your-username>.github.io/melon-sandbox/`

Or clone and open `index.html` locally — no server required.

---

## ✨ Features (v1.0 Target)

| Category | Features |
|---|---|
| **Physics** | Gravity, velocity, collision, ragdoll joints, friction |
| **Ragdolls** | Spawn humanoid figures with reactive limbs and bodies |
| **Weapons** | Pistol, rifle, rocket launcher, sword, bomb |
| **Props** | Crates, barrels, platforms, ramps |
| **Tools** | Grab/move, rotate, delete, force push, freeze |
| **Environment** | Ground, walls, gravity toggle, wind |
| **UI** | Item palette panel, spawn preview, pause/resume |
| **Persistence** | Save/Load scene to localStorage |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Rendering | HTML5 Canvas 2D API |
| Physics | Custom 2D verlet/impulse physics engine (vanilla JS) |
| UI | HTML + Vanilla CSS (no frameworks) |
| Hosting | GitHub Pages (static, no build step) |

**No dependencies. No npm. No build tools.** Just open `index.html`.

---

## 📁 Project Structure

```
melon-sandbox/
├── index.html          # Entry point
├── style.css           # Global styles & UI layout
├── README.md           # This file
├── PRD.md              # Product Requirements Document
└── src/
    ├── main.js             # App entry, game loop
    ├── engine/
    │   ├── physics.js      # Rigid body physics, verlet integration
    │   ├── collision.js    # Collision detection & response
    │   ├── ragdoll.js      # Ragdoll character system
    │   └── constraints.js  # Joint/distance constraints
    ├── entities/
    │   ├── Entity.js       # Base entity class
    │   ├── Ragdoll.js      # Ragdoll entity
    │   ├── Weapon.js       # Weapon entity (guns, melee)
    │   ├── Projectile.js   # Bullet/rocket projectiles
    │   ├── Prop.js         # Static/dynamic props
    │   └── Explosion.js    # Explosion force & particles
    ├── input/
    │   ├── mouse.js        # Mouse/touch input handler
    │   └── keyboard.js     # Keyboard shortcuts
    ├── ui/
    │   ├── palette.js      # Item palette sidebar
    │   ├── toolbar.js      # Tool selection bar
    │   └── hud.js          # HUD overlays
    ├── systems/
    │   ├── spawner.js      # Entity spawning system
    │   ├── renderer.js     # Canvas rendering pipeline
    │   └── scene.js        # Scene save/load
    └── utils/
        ├── vector.js       # 2D vector math
        └── draw.js         # Canvas drawing helpers
```

---

## 🎮 Controls

| Action | Input |
|---|---|
| Spawn selected item | Left click on canvas |
| Grab & drag object | Left click + drag on object |
| Rotate spawned item | Right click drag / R key |
| Delete object | Middle click or Delete key |
| Pan camera | Space + drag / Middle mouse drag |
| Zoom | Scroll wheel |
| Pause simulation | P key |
| Clear all | Ctrl + Delete |
| Save scene | Ctrl + S |
| Load scene | Ctrl + O |

---

## 🗺️ Development Roadmap

- [x] Project scaffolding & documentation
- [ ] Physics engine (rigid body + verlet integration)
- [ ] Canvas rendering pipeline
- [ ] Ragdoll character with joints
- [ ] Mouse grab & interaction
- [ ] Item palette UI
- [ ] Weapons & projectiles
- [ ] Props & environment objects
- [ ] Explosions & particle effects
- [ ] Camera pan & zoom
- [ ] Save/Load scenes
- [ ] Sound effects (Web Audio API)
- [ ] Mobile / touch support

---

## 📜 License

MIT License. This is a fan-made clone for educational purposes. Original Melon Sandbox is made by [Melon Sandbox Team](https://melonsandbox.com/).
