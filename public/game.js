import kaplay from "https://unpkg.com/kaplay@3001/dist/kaplay.mjs";
import { Pane } from "https://cdn.jsdelivr.net/npm/tweakpane@4/dist/tweakpane.min.js";

kaplay({
  width: 800,
  height: 600,
  letterbox: true,
  background: [0, 0, 0],
});

// settings
setBackground("#0e0c1a");

// Tunable parameters
const settings = {
  playerSpeed: 220,
  enemySpeed: 180,
  fireInterval: 0.5,
  spawnInterval: 1.5,
};

const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 14;
const BULLET_RADIUS = 4;
const BULLET_SPEED = 600;

const MAX_HP = 4;

// more enemies spawn the longer the game goes for
const SPAWN_STEP_SECONDS = 10;
const SPAWN_SPEEDUP = 0.75;
const MIN_SPAWN_INTERVAL = 0.01;

// pause the game as long as an overlay exists
let paused = true;

// Overlay wiring
const introOverlay = document.getElementById("intro-overlay");
const pauseOverlay = document.getElementById("pause-overlay");

document.getElementById("start-btn").addEventListener("click", () => {
  introOverlay.classList.add("hidden");
  paused = false;
});

document.getElementById("resume-btn").addEventListener("click", () => {
  pauseOverlay.classList.add("hidden");
  paused = false;
});

// Press "esc" to pause the game
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") togglePause();
});

function togglePause() {
  // ignore "Esc" key until the intro has been dismissed
  if (!introOverlay.classList.contains("hidden")) return;

  if (paused) {
    pauseOverlay.classList.add("hidden");
    paused = false;
  } else {
    pauseOverlay.classList.remove("hidden");
    paused = true;
  }
}

// Settings panel (Tweakpane)  
try {
  const pane = new Pane({
    container: document.getElementById("settings-container"),
    title: "Parameters",
  });
  pane.addBinding(settings, "playerSpeed", {
    min: 100, max: 400, step: 10, label: "Player Speed",
  });
  pane.addBinding(settings, "enemySpeed", {
    min: 50, max: 350, step: 10, label: "Enemy Speed",
  });
  pane.addBinding(settings, "fireInterval", {
    min: 0.1, max: 1.5, step: 0.05, label: "Fire Rate (s)",
  });
  pane.addBinding(settings, "spawnInterval", {
    min: 0.01, max: 3, step: 0.1, label: "Spawn Interval",
  });
} catch (err) {
  console.error("Tweakpane failed to load — settings panel unavailable.", err);
  const container = document.getElementById("settings-container");
  container.textContent = "Settings panel failed to load (see console).";
  container.style.color = "#ff8080";
}

scene("game", () => {
  let hp = MAX_HP;
  let alive = true;
  let spawnTimer = 0;
  let fireTimer = 0;
  let spawnInterval = settings.spawnInterval;

  // Player
  const player = add([
    circle(PLAYER_RADIUS),
    pos(center()),
    anchor("center"),
    color(60, 120, 255),
  ]);

  // Player movement with WASD or arrow keys
  player.onUpdate(() => {
    if (!alive || paused) return;

    const dir = vec2(0, 0);
    if (isKeyDown("left") || isKeyDown("a")) dir.x -= 1;
    if (isKeyDown("right") || isKeyDown("d")) dir.x += 1;
    if (isKeyDown("up") || isKeyDown("w")) dir.y -= 1;
    if (isKeyDown("down") || isKeyDown("s")) dir.y += 1;

    if (dir.x !== 0 || dir.y !== 0) {
      player.move(dir.unit().scale(settings.playerSpeed));
    }

    player.pos.x = clamp(player.pos.x, PLAYER_RADIUS, width() - PLAYER_RADIUS);
    player.pos.y = clamp(player.pos.y, PLAYER_RADIUS, height() - PLAYER_RADIUS);
  });

  function hurtPlayer() {
    const hurtColors = rgb(165, 35, 35);
    hp--;
    shake(6);
    flash(hurtColors, 0.5);
    // restart if player dies
    if (hp <= 0) {
      alive = false;
      destroy(player);
      wait(2, () => go("game"));
    }
  }

  let score = 0;

  const scoreLabel = add([
    text("Score: 0", { size: 24 }),
    pos(width() - 20, 16),
    anchor("topright"),
    color(255, 255, 255),
  ]);

  // Enemies
  function spawnEnemy() {
    const margin = 30;
    const side = randi(4);
    let p;
    if (side === 0) p = vec2(rand(0, width()), -margin);
    else if (side === 1) p = vec2(width() + margin, rand(0, height()));
    else if (side === 2) p = vec2(rand(0, width()), height() + margin);
    else p = vec2(-margin, rand(0, height()));

    const enemy = add([
      circle(ENEMY_RADIUS),
      pos(p),
      anchor("center"),
      color(255, 50, 50),
      "enemy",
    ]);

    enemy.onUpdate(() => {
      if (!alive || paused) return;
      const dir = player.pos.sub(enemy.pos).unit();
      enemy.move(dir.scale(settings.enemySpeed));

      if (enemy.pos.dist(player.pos) < PLAYER_RADIUS + ENEMY_RADIUS) {
        destroy(enemy);
        hurtPlayer();
      }
    });
  }

  // spawn enemies on a timer
  onUpdate(() => {
    if (!alive || paused) return;
    spawnTimer += dt();
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEnemy();
    }
  });

  // spawn enemies faster over time
  loop(SPAWN_STEP_SECONDS, () => {
    if (paused) return;
    spawnInterval = Math.max(MIN_SPAWN_INTERVAL, spawnInterval * SPAWN_SPEEDUP);
  });

  // Attack nearest enemy
  function nearestEnemy() {
    let best = null;
    let bestDist = Infinity;
    for (const e of get("enemy")) {
      const d = e.pos.dist(player.pos);
      if (d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  function shootAt(target) {
    const dir = target.pos.sub(player.pos).unit();
    const bullet = add([
      circle(BULLET_RADIUS),
      pos(player.pos.clone()),
      anchor("center"),
      color(255, 220, 0),
      "bullet",
    ]);

    bullet.onUpdate(() => {
      if (paused) return;
      bullet.move(dir.scale(BULLET_SPEED));

      if (
        bullet.pos.x < -20 || bullet.pos.x > width() + 20 ||
        bullet.pos.y < -20 || bullet.pos.y > height() + 20
      ) {
        destroy(bullet);
        return;
      }

      for (const e of get("enemy")) {
        if (bullet.pos.dist(e.pos) < BULLET_RADIUS + ENEMY_RADIUS) {
          destroy(e);
          destroy(bullet);
          score++;
          scoreLabel.text = `Score: ${score}`;
          break;
        }
      }
    });
  }

  // fire on a timer
  onUpdate(() => {
    if (!alive || paused) return;
    fireTimer += dt();
    if (fireTimer >= settings.fireInterval) {
      fireTimer = 0;
      const target = nearestEnemy();
      if (target) shootAt(target);
    }
  });

  // UI for health bar
  onDraw(() => {
    const barWidth = 160;
    drawRect({
      pos: vec2(16, 16),
      width: barWidth,
      height: 20,
      color: rgb(206, 0, 0),
    });
    drawRect({
      pos: vec2(16, 16),
      width: (barWidth * Math.max(hp, 0)) / MAX_HP,
      height: 20,
      color: rgb(0, 255, 102),
    });
  });
});

go("game");