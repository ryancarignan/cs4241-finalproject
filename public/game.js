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

// Boss constants
const BOSS_NAME = "Skull Emoji";
const BOSS_RADIUS = 40;
const BOSS_MAX_HP = 60;
const BOSS_DAMAGE_PER_HIT = 1;
const BOSS_SPEED = 50;
const BOSS_SPAWN_TIME = 5; // seconds into the game
const BOSS_FADE_IN_TIME = 2;

const BOSS_PROJECTILE_INTERVAL = 5;
const BOSS_PROJECTILE_SPEED = 180;
const BOSS_PROJECTILE_LIFETIME = 3;
const BOSS_PROJECTILE_RADIUS = 6;

const BOSS_LASER_MIN_INTERVAL = 12;
const BOSS_LASER_MAX_INTERVAL = 15;
const BOSS_LASER_FOLLOW_UP_SHOTS = 2;
const BOSS_LASER_CHARGE_TIME = 0.2;      // fades in, no collision
const BOSS_LASER_SOLID_DURATION = 0.1; // full color, has collision
const BOSS_LASER_WIDTH = 24;

const BOSS_SHOCKWAVE_HP_THRESHOLD = 0.5;
const BOSS_SHOCKWAVE_CHARGE_TIME = 15;
const BOSS_SHOCKWAVE_RING_MAX_RADIUS = 1000;

const BOSS_SAFE_ZONE_RADIUS = 55;
const BOSS_SAFE_ZONE_CHARGE_TIME = 8;
const BOSS_SAFE_ZONE_FINAL_RADIUS = 60;
const BOSS_SAFE_ZONE_MARGIN = 90; // distance from each corner

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

// Simple point-to-segment distance helper, used for the boss laser hitbox
function pointSegmentDistance(point, origin, dir, length) {
  const toPoint = point.sub(origin);
  const t = Math.max(0, Math.min(length, toPoint.dot(dir)));
  const closest = origin.add(dir.scale(t));
  return point.dist(closest);
}

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

  // Boss state
  let gameTime = 0;
  let bossSpawned = false;
  let bossAlive = false;
  let boss = null;
  let bossHp = BOSS_MAX_HP;
  let bossUiAlpha = 0;
  let bossBusy = false;

  let bossProjectileTimer = 0;
  let bossLaserTimer = 0;
  let bossLaserInterval = rand(BOSS_LASER_MIN_INTERVAL, BOSS_LASER_MAX_INTERVAL);
  let shockwaveUsed = false;

  let laserActive = false;
  let laserOrigin = null;
  let laserDir = null;
  let laserLength = 1400;
  let laserAlpha = 0;
  let laserSolid = false;
  let laserShotsRemaining = 0;

  let safeStation = null;
  let stationChargeTime = 0;
  let immunityCircle = null;

  // Player
  const player = add([
    sprite("player", { anim: "idle" }),
    pos(center()),
    anchor("center"),
    scale(3),
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
    if (!alive) return;
    const hurtColors = rgb(165, 35, 35);
    hp--;
    shake(6);
    flash(hurtColors, 0.5);
    if (hp <= 0) {
      killPlayer();
    }
  }

  function killPlayer() {
    if (!alive) return;
    const deadColors = rgb(165, 35, 35);
    alive = false;
    hp = 0;
    shake(6);
    flash(deadColors, 0.5);
    destroy(player);
    wait(2, () => go("game"));
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
    if (bossAlive && boss) {
      const d = boss.pos.dist(player.pos);
      if (d < bestDist) {
        best = boss;
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

      if (bossAlive && boss && bullet.pos.dist(boss.pos) < BULLET_RADIUS + BOSS_RADIUS) {
        destroy(bullet);
        damageBoss(BOSS_DAMAGE_PER_HIT);
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
    xp++;
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

  // Boss
  function spawnBoss() {
    bossAlive = true;
    bossHp = BOSS_MAX_HP;
    bossUiAlpha = 0;
    bossBusy = false;
    bossProjectileTimer = 0;
    bossLaserTimer = 0;
    bossLaserInterval = rand(BOSS_LASER_MIN_INTERVAL, BOSS_LASER_MAX_INTERVAL);

    boss = add([
      circle(BOSS_RADIUS),
      pos(center()),
      anchor("center"),
      color(255, 255, 255),
      opacity(0),
      "boss",
    ]);

    boss.onUpdate(() => {
      if (!bossAlive || paused) return;
      boss.opacity = bossUiAlpha;

      if (!bossBusy) {
        const dir = player.pos.sub(boss.pos).unit();
        boss.move(dir.scale(BOSS_SPEED));
        boss.pos.x = clamp(boss.pos.x, BOSS_RADIUS, width() - BOSS_RADIUS);
        boss.pos.y = clamp(boss.pos.y, BOSS_RADIUS, height() - BOSS_RADIUS);
      }
    });
  }

  function damageBoss(amount) {
    if (!bossAlive) return;
    bossHp -= amount;

    if (!shockwaveUsed && bossHp <= BOSS_MAX_HP * BOSS_SHOCKWAVE_HP_THRESHOLD) {
      shockwaveUsed = true;
      startShockwaveCharge();
    }

    if (bossHp <= 0) {
      bossHp = 0;
      killBoss();
    }
  }

  function killBoss() {
    bossAlive = false;
    bossBusy = false;
    if (boss && boss.exists()) destroy(boss);
    for (const r of get("shockwaveRing")) destroy(r);
    if (safeStation && safeStation.exists()) destroy(safeStation);
    if (immunityCircle && immunityCircle.exists()) destroy(immunityCircle);
    for (const p of get("bossProjectile")) destroy(p);
    laserActive = false;
    laserShotsRemaining = 0;
  }

  function fireBossProjectile() {
    const proj = add([
      circle(BOSS_PROJECTILE_RADIUS),
      pos(boss.pos.clone()),
      anchor("center"),
      color(200, 80, 220),
      "bossProjectile",
    ]);

    proj.onUpdate(() => {
      if (paused || !proj.exists()) return;
      if (!alive) return;
      const dir = player.pos.sub(proj.pos).unit();
      proj.move(dir.scale(BOSS_PROJECTILE_SPEED));

      if (proj.pos.dist(player.pos) < BOSS_PROJECTILE_RADIUS + PLAYER_RADIUS) {
        hurtPlayer();
        destroy(proj);
      }
    });

    wait(BOSS_PROJECTILE_LIFETIME, () => {
      if (proj.exists()) destroy(proj);
    });
  }

  function startLaserCast() {
    if (!bossAlive || bossBusy) return;
    bossBusy = true;
    laserShotsRemaining = BOSS_LASER_FOLLOW_UP_SHOTS;

    castLaserShot();
  }

  function castLaserShot() {
    if (!bossAlive) return;
    laserOrigin = boss.pos.clone();
    laserDir = player.pos.sub(boss.pos).unit();
    laserActive = true;
    laserSolid = false;
    laserAlpha = 0.15;

    wait(BOSS_LASER_CHARGE_TIME, () => {
      if (!bossAlive || !laserActive) return;
      laserSolid = true;
    });

    wait(BOSS_LASER_CHARGE_TIME + BOSS_LASER_SOLID_DURATION, () => {
      laserActive = false;
      if (!bossAlive) return;
      if (laserShotsRemaining > 0) {
        laserShotsRemaining--;
        castLaserShot();
      } else {
        bossBusy = false;
      }
    });
  }

  function startShockwaveCharge() {
    bossBusy = true;
    stationChargeTime = 0;

    // Telegraphed instant kill shockwave
    const ring = add([
      pos(boss.pos.clone()),
      circle(4, { fill: false }),
      outline(4, new Color(255, 255, 255)),
      anchor("center"),
      timer(),
      "shockwaveRing",
    ]);
    ring.tween(
      4,
      BOSS_SHOCKWAVE_RING_MAX_RADIUS,
      BOSS_SHOCKWAVE_CHARGE_TIME,
      (r) => { ring.radius = r; },
      easings.linear
    ).onEnd(() => { if (ring.exists()) destroy(ring); });

    // Charging station near a random corner
    const corners = [
      vec2(BOSS_SAFE_ZONE_MARGIN, BOSS_SAFE_ZONE_MARGIN),
      vec2(width() - BOSS_SAFE_ZONE_MARGIN, BOSS_SAFE_ZONE_MARGIN),
      vec2(BOSS_SAFE_ZONE_MARGIN, height() - BOSS_SAFE_ZONE_MARGIN),
      vec2(width() - BOSS_SAFE_ZONE_MARGIN, height() - BOSS_SAFE_ZONE_MARGIN),
    ];
    const stationPos = corners[randi(corners.length)];

    safeStation = add([
      pos(stationPos),
      circle(BOSS_SAFE_ZONE_RADIUS, { fill: false }),
      outline(4, new Color(255, 20, 147)),
      anchor("center"),
      "safeStation",
    ]);

    safeStation.onUpdate(() => {
      if (paused || !alive) return;
      if (player.pos.dist(safeStation.pos) <= BOSS_SAFE_ZONE_RADIUS) {
        stationChargeTime = Math.min(BOSS_SAFE_ZONE_CHARGE_TIME, stationChargeTime + dt());
      }
    });

    // Growing immunity field 
    immunityCircle = add([
      pos(player.pos.clone()),
      circle(1),
      color(255, 105, 180),
      opacity(0),
      anchor("center"),
      "immunityCircle",
    ]);

    immunityCircle.onUpdate(() => {
      if (paused) return;
      immunityCircle.pos = stationPos.clone();
      const frac = Math.min(1, stationChargeTime / BOSS_SAFE_ZONE_CHARGE_TIME);
      immunityCircle.radius = Math.max(1, BOSS_SAFE_ZONE_FINAL_RADIUS * frac);
      immunityCircle.opacity = 0.5 * frac;
    });

    wait(BOSS_SHOCKWAVE_CHARGE_TIME, () => {
      resolveShockwave();
    });
  }

  function resolveShockwave() {
    const survived =
      stationChargeTime >= BOSS_SAFE_ZONE_CHARGE_TIME &&
      immunityCircle &&
      immunityCircle.exists() &&
      player.pos.dist(immunityCircle.pos) <= immunityCircle.radius;

    if (safeStation && safeStation.exists()) destroy(safeStation);
    if (immunityCircle && immunityCircle.exists()) destroy(immunityCircle);
    safeStation = null;
    immunityCircle = null;

    if (!survived) {
      shake(10);
      killPlayer();
    } else {
      shake(10);
      flash(rgb(255, 255, 255), 0.3);
    }

    bossBusy = false;
  }

  // Boss timer functions
  onUpdate(() => {
    if (!alive || paused) return;

    gameTime += dt();

    if (!bossSpawned && gameTime >= BOSS_SPAWN_TIME) {
      bossSpawned = true;
      spawnBoss();
    }

    if (!bossAlive) return;

    if (bossUiAlpha < 1) {
      bossUiAlpha = Math.min(1, bossUiAlpha + dt() / BOSS_FADE_IN_TIME);
    }

    // boss attacks when not busy
    if (!bossBusy) {
      bossProjectileTimer += dt();
      if (bossProjectileTimer >= BOSS_PROJECTILE_INTERVAL) {
        bossProjectileTimer = 0;
        fireBossProjectile();
      }

      bossLaserTimer += dt();
      if (bossLaserTimer >= bossLaserInterval) {
        bossLaserTimer = 0;
        bossLaserInterval = rand(BOSS_LASER_MIN_INTERVAL, BOSS_LASER_MAX_INTERVAL);
        startLaserCast();
      }
    }

    if (laserActive) {
      if (!laserSolid) {
        laserAlpha = Math.min(1, laserAlpha + dt() / BOSS_LASER_CHARGE_TIME);
      } else {
        laserAlpha = 1;
        if (alive) {
          const d = pointSegmentDistance(player.pos, laserOrigin, laserDir, laserLength);
          if (d < BOSS_LASER_WIDTH / 2 + PLAYER_RADIUS) {
            killPlayer();
          }
        }
      }
    }
  });

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

    // UI for boss
    if (bossAlive) {
      const bossBarWidth = 400;
      const bossBarHeight = 22;
      const bossBarX = width() / 2 - bossBarWidth / 2;
      const bossBarY = height() - 46;

      drawRect({
        pos: vec2(bossBarX, bossBarY),
        width: bossBarWidth,
        height: bossBarHeight,
        color: rgb(40, 40, 40),
        opacity: bossUiAlpha * 0.9,
      });
      drawRect({
        pos: vec2(bossBarX, bossBarY),
        width: (bossBarWidth * Math.max(bossHp, 0)) / BOSS_MAX_HP,
        height: bossBarHeight,
        color: rgb(220, 20, 20),
        opacity: bossUiAlpha,
      });
      drawText({
        text: BOSS_NAME,
        size: 20,
        pos: vec2(width() / 2, bossBarY - 18),
        anchor: "center",
        color: rgb(255, 255, 255),
        opacity: bossUiAlpha,
      });
    }

    // laser beam ability
    if (laserActive) {
      const endPoint = laserOrigin.add(laserDir.scale(laserLength));
      drawLine({
        p1: laserOrigin,
        p2: endPoint,
        width: BOSS_LASER_WIDTH,
        color: laserSolid ? rgb(255, 0, 0) : rgb(255, 130, 130),
        opacity: laserAlpha,
      });
    }
  });
});

go("game");