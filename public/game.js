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

// Display constants
const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 14;
const BULLET_RADIUS = 4;
const XP_RADIUS = 3;
const BULLET_SPEED = 600;
const XP_COLOR = [44, 239, 242];
const BAR_COLOR = [69, 69, 75];

const MAX_HP = 4;

// more enemies spawn the longer the game goes for
const SPAWN_STEP_SECONDS = 10;
const SPAWN_SPEEDUP = 0.75;
const MIN_SPAWN_INTERVAL = 0.01;

// XP / leveling constants
const XP_SPEED = 3;
const XP_SPEED_SCALING_FACTOR = 5;
const XP_COLLECTION_RADIUS = 250;
const FIRST_PLAYER_LEVEL_XP = 10;
const PLAYER_LEVEL_XP_SCALING_FACTOR = 3;
const LEVEL_TEXT_POS = vec2(16, 16 + 20 + 16 + 20 + 4)

// load player sprite
loadSprite("player", [
  "art/player/l0_sprite_player1.png",
  "art/player/l0_sprite_player2.png",
  "art/player/l0_sprite_player3.png",
  "art/player/l0_sprite_player4.png",
  "art/player/l0_sprite_player5.png",
  "art/player/l0_sprite_player6.png",
  "art/player/l0_sprite_player7.png",
], {
  anims: {
    idle: { from: 0, to: 6, loop: true, speed: 10 },
  },
});

// load enemy sprite
loadSprite("enemy", [
  "art/enemy/l0_sprite_enemy1.png",
  "art/enemy/l0_sprite_enemy2.png",
  "art/enemy/l0_sprite_enemy3.png",
  "art/enemy/l0_sprite_enemy4.png",
  "art/enemy/l0_sprite_enemy5.png",
  "art/enemy/l0_sprite_enemy6.png",
  "art/enemy/l0_sprite_enemy7.png",
], {
  anims: {
    walk: { from: 0, to: 6, loop: true, speed: 10 },
  },
});

// load xp sprite 
loadSprite("xp", [
  "art/xp/l0_sprite_XP_updated1.png",
  "art/xp/l0_sprite_XP_updated2.png",
  "art/xp/l0_sprite_XP_updated3.png",
  "art/xp/l0_sprite_XP_updated4.png",
  "art/xp/l0_sprite_XP_updated5.png",
  "art/xp/l0_sprite_XP_updated6.png",
  "art/xp/l0_sprite_XP_updated7.png",
  "art/xp/l0_sprite_XP_updated8.png",
  "art/xp/l0_sprite_XP_updated9.png",
], {
  anims: {
    spin: { from: 0, to: 8, loop: true, speed: 10 },
  },
});

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

  // XP / Leveling
  let xp = 0;
  let playerLevel = 0;
  let nextPlayerLevelXP = FIRST_PLAYER_LEVEL_XP;

  // Player
  const player = add([
    sprite("player", { anim: "idle" }),
    pos(center()),
    anchor("center"),
    scale(3)
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
      sprite("enemy", { anim: "walk" }),
      pos(p),
      anchor("center"),
      scale(3),
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
          dropXP(e.pos.x, e.pos.y);
          destroy(e);
          destroy(bullet);
          score++;
          scoreLabel.text = `Score: ${score}`;
          break;
        }
      }
    });
  }

  function dropXP(xPos, yPos) {
    const xp = add([
      sprite("xp", { anim: "spin" }),
      pos(xPos, yPos),
      anchor("center"),
      scale(1.5),
      "xp",
    ]);

    xp.onUpdate(() => {
      if (!alive || paused) return;

      const dir = player.pos.sub(xp.pos).unit();
      const distFromPlayer = xp.pos.dist(player.pos);

      const speed = XP_SPEED * (Math.max(0, ((XP_COLLECTION_RADIUS - distFromPlayer) * 0.01)) ** XP_SPEED_SCALING_FACTOR);
      xp.move(dir.scale(Math.max(speed, 0)));

      if (xp.pos.dist(player.pos) < PLAYER_RADIUS + XP_RADIUS) {
        destroy(xp);
        incrementPlayerXP();
      }
    });
  }
  function incrementPlayerXP() {
    const xpColors = rgb(124, 252, 0);
    xp++;
    // restart if player dies
    if (xp >= nextPlayerLevelXP) {
      xp %= nextPlayerLevelXP;
      levelUpPlayer();
    }
  }

  function levelUpPlayer() {
    playerLevel++;
    nextPlayerLevelXP = FIRST_PLAYER_LEVEL_XP + PLAYER_LEVEL_XP_SCALING_FACTOR ** playerLevel;
    const levelTextPos = vec2(LEVEL_TEXT_POS.x + 47.5, LEVEL_TEXT_POS.y + 5);
    circleEffect(levelTextPos);
  }

  function circleEffect(position) {
    const NUM_PLAYS = 2;
    const END_RADIUS = 40;
    const ANIMATION_LENGTH = 0.6;
    const ANIMATION_LENGTH_INCREMENT = 0.05;

    const play = (animationLengthAddition) => {
      const circleAnimation = add([
        pos(position),
        circle(2, { fill: false }),
        outline(2, new Color(255, 255, 255)),
        anchor("center"),
        timer(),
      ]);
      circleAnimation
        .tween(1, END_RADIUS, ANIMATION_LENGTH + animationLengthAddition, (radius) => { circleAnimation.radius = radius }, easings.easeOutQuad)
        .onEnd(() => circleAnimation.destroy());
    };

    for (let i = 0; i < NUM_PLAYS; i++) {
      if (i == 0) {
        play(0);
      } else {
        wait(0.2, () => {
          play(i * ANIMATION_LENGTH_INCREMENT);
        });
      }
    }
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

  onDraw(() => {
    // UI for health bar
    const healthBarWidth = 160;
    drawRect({
      pos: vec2(16, 16),
      width: healthBarWidth,
      height: 20,
      color: rgb(206, 0, 0),
    });
    drawRect({
      pos: vec2(16, 16),
      width: (healthBarWidth * Math.max(hp, 0)) / MAX_HP,
      height: 20,
      color: rgb(0, 255, 102),
    });

    // UI for XP bar
    const xpBarWidth = healthBarWidth;
    drawRect({
      pos: vec2(16, 16 + 20 + 16),
      width: xpBarWidth,
      height: 20,
      color: rgb(...BAR_COLOR),
    });
    drawRect({
      pos: vec2(16, 16 + 20 + 16),
      width: (xpBarWidth * xp) / nextPlayerLevelXP,
      height: 20,
      color: rgb(...XP_COLOR),
    });
    drawText({
      text: `Level ${playerLevel + 1}`,
      size: 12,
      pos: LEVEL_TEXT_POS,
      color: rgb(255, 255, 255),
    });
  });
});

go("game");