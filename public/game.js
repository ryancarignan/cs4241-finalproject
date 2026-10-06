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
  projectileSpeed: 600,
  projectileCount: 1,
  healthRegen: 0,
  xp_collection_radius: 250,
  explosiveBullets: false,
  bulletSplit: false,
};

let upgrades = [
  { name: "Projectile Speed", description: "Bullets travel 25% faster.", apply: () => { settings.projectileSpeed *= 1.25; } },
  { name: "Projectile Count", description: "Fire one additional bullet.", apply: () => { settings.projectileCount++; } },
  { name: "Player Speed", description: "Move 15% faster.", apply: () => { settings.playerSpeed *= 1.15; } },
  { name: "Attack Speed", description: "Fire 20% more often.", apply: () => { settings.fireInterval /= 1.2; } },
  { name: "Health Regen", description: "Regenerate health each second.", apply: () => { settings.healthRegen++; } },
  { name: "XP Collection Radius", description: "Increase the radius at which XP is collected.", apply: () => { settings.xp_collection_radius += 50; } },
  { name: "Explosive Bullets", description: "25% change of bullet exploding on impact, damaging nearby enemies.", apply: () => { settings.explosiveBullets = true; } },
  { name: "Split Bullets", description: "Bullets split in two after a distance.", apply: () => { settings.bulletSplit = true; } },
];

// Display constants
const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 14;
const BULLET_RADIUS = 4;
const ENEMY_COLOR = [255, 50, 50];
const BULLET_COLOR = [255, 220, 0];
const XP_RADIUS = 3;
const UPGRADE_CARD_WIDTH = 190;
const UPGRADE_CARD_HEIGHT = 190;
const XP_COLOR = [247, 174, 248];
const BAR_COLOR = [69, 69, 75];

const MAX_HP = 4;

// more enemies spawn the longer the game goes for
const SPAWN_STEP_SECONDS = 10;
const SPAWN_SPEEDUP = 0.75;
const MIN_SPAWN_INTERVAL = 0.01;

// XP / leveling constants
const XP_SPEED = 3;
const XP_SPEED_SCALING_FACTOR = 5;
const FIRST_PLAYER_LEVEL_XP = 10;
const PLAYER_LEVEL_XP_SCALING_FACTOR = 3;
const LEVEL_TEXT_POS = vec2(16, 16 + 20 + 16 + 20 + 4)

// Upgrades constants
const BULLET_SPLIT_DISTANCE = 15000;
const BULLET_SPLIT_ANGLE = 7.5;
const EXPLOSION_RADIUS = 50;

// pause the game as long as an overlay exists
let paused = true;
let levelUpPending = false;

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
  if (levelUpPending) return;

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
  let healthRegenTimer = 0;
  let spawnInterval = settings.spawnInterval;
  let levelUpUpgrades = [];

  levelUpPending = false;

  // XP / Leveling
  let xp = 0;
  let playerLevel = 0;
  let nextPlayerLevelXP = FIRST_PLAYER_LEVEL_XP;

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
    
    // Health regen
    if (settings.healthRegen > 0 && hp < MAX_HP) {
      healthRegenTimer += dt();
      while (healthRegenTimer >= 1 && hp < MAX_HP) {
        hp = Math.min(hp + settings.healthRegen, MAX_HP);
        healthRegenTimer -= 1;
      }
      if (hp >= MAX_HP) healthRegenTimer = 0;
    } else {
      healthRegenTimer = 0;
    }

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
      color(ENEMY_COLOR),
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

  function shoot(position, direction, split) {
    const bullet = add([
      circle(BULLET_RADIUS),
      pos(position),
      anchor("center"),
      color(BULLET_COLOR),
      "bullet",
      {
        distanceTraveled: 0,
      }
    ]);

    bullet.onUpdate(() => {
      if (paused) return;

      const moveVector = direction.scale(settings.projectileSpeed);
      const moveDistance = Math.sqrt(moveVector.x ** 2 + moveVector.y ** 2);
      bullet.distanceTraveled += moveDistance;
      bullet.move(moveVector);

      if (split && bullet.distanceTraveled >= BULLET_SPLIT_DISTANCE) {
        const directionAngle = Math.atan2(direction.y, direction.x);
        const splitAngle = BULLET_SPLIT_ANGLE * Math.PI / 180;
        const leftDirection = directionAngle - splitAngle;
        const rightDirection = directionAngle + splitAngle;
        shoot(bullet.pos.clone(), vec2(Math.cos(leftDirection), Math.sin(leftDirection)), false);
        shoot(bullet.pos.clone(), vec2(Math.cos(rightDirection), Math.sin(rightDirection)), false);
        destroy(bullet);
      }

      if (
        bullet.pos.x < -20 || bullet.pos.x > width() + 20 ||
        bullet.pos.y < -20 || bullet.pos.y > height() + 20
      ) {
        destroy(bullet);
        return;
      }

      const killEnemy = (e) => {
        dropXP(e.pos.x, e.pos.y);
        destroy(e);
        destroy(bullet);
        score++;
        scoreLabel.text = `Score: ${score}`;
      }

      for (const e of get("enemy")) {
        if (bullet.pos.dist(e.pos) < BULLET_RADIUS + ENEMY_RADIUS) {
          if (settings.explosiveBullets && Math.random() <= 0.25) {
            circleEffect(bullet.pos, EXPLOSION_RADIUS, 1, BULLET_COLOR)
            for (const e of get("enemy")) {
              if (bullet.pos.dist(e.pos) < EXPLOSION_RADIUS + ENEMY_RADIUS) {
                killEnemy(e);
              }
            }
          }
          killEnemy(e);
          break;
        }
      }
    });
  }

  function shootAt(target) {
    const dir = target.pos.sub(player.pos).unit();
    const baseAngle = Math.atan2(dir.y, dir.x);

    for (let i = 0; i < settings.projectileCount; i++) {
      const spread = (i - (settings.projectileCount - 1) / 2) * (Math.PI / 18);
      const bulletDir = vec2(Math.cos(baseAngle + spread), Math.sin(baseAngle + spread));
      shoot(player.pos.clone(), bulletDir, settings.bulletSplit);
    }
  }

  function dropXP(xPos, yPos) {
    const xp = add([
      circle(XP_RADIUS),
      pos(xPos, yPos),
      color(...XP_COLOR),
      "xp"
    ]);

    xp.onUpdate(() => {
      if (!alive || paused) return;

      const dir = player.pos.sub(xp.pos).unit();
      const distFromPlayer = xp.pos.dist(player.pos);

      const speed = XP_SPEED * (Math.max(0, ((settings.xp_collection_radius - distFromPlayer) * 0.01)) ** XP_SPEED_SCALING_FACTOR);
      xp.move(dir.scale(Math.max(speed, 0)))

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

  // level upgrades
  function levelUpPlayer() {
    playerLevel++;
    nextPlayerLevelXP = FIRST_PLAYER_LEVEL_XP + PLAYER_LEVEL_XP_SCALING_FACTOR ** playerLevel;
    levelUpUpgrades = [];
    const availableUpgrades = [...upgrades];

    // Remove upgrades that can only be bought once
    const removeUpgrade = (name) => {
      const eBIndex = availableUpgrades.findIndex(u => u.name === name);
      if (eBIndex !== -1) availableUpgrades.splice(eBIndex, 1);
    }
    if (settings.explosiveBullets) {
      removeUpgrade("Explosive Bullets")
    }
    if (settings.bulletSplit) {
      removeUpgrade("Split Bullets")
    }
    while (levelUpUpgrades.length < 3 && availableUpgrades.length > 0) {
      const index = randi(availableUpgrades.length);
      levelUpUpgrades.push(availableUpgrades.splice(index, 1)[0]);
    }
    levelUpPending = true;
    paused = true;
    const levelTextPos = vec2(LEVEL_TEXT_POS.x + 47.5, LEVEL_TEXT_POS.y + 5);
    circleEffect(levelTextPos, 40, 2, XP_COLOR);
  }

  onMousePress((button) => {
    if (button !== "left" || !levelUpPending) return;

    const mouse = mousePos();
    const cardGap = 20;
    const cardsWidth = UPGRADE_CARD_WIDTH * levelUpUpgrades.length + cardGap * (levelUpUpgrades.length - 1);
    const firstCardX = (width() - cardsWidth) / 2;
    const cardY = (height() - UPGRADE_CARD_HEIGHT) / 2;

    for (let i = 0; i < levelUpUpgrades.length; i++) {
      const cardX = firstCardX + i * (UPGRADE_CARD_WIDTH + cardGap);
      if (
        mouse.x < cardX || mouse.x > cardX + UPGRADE_CARD_WIDTH ||
        mouse.y < cardY || mouse.y > cardY + UPGRADE_CARD_HEIGHT
      ) continue;

      levelUpUpgrades[i].apply();
      levelUpPending = false;
      paused = false;
      return;
    }
  });

  function circleEffect(position, radius, times, color) {
    const ANIMATION_LENGTH = 0.6;
    const ANIMATION_LENGTH_INCREMENT = 0.05;

    const play = (animationLengthAddition) => {
      const circleAnimation = add([
        pos(position),
        circle(2, { fill: false }),
        outline(2, new Color(...color)),
        anchor("center"),
        timer(),
      ]);
      circleAnimation
        .tween(1, radius, ANIMATION_LENGTH + animationLengthAddition, (radius) => { circleAnimation.radius = radius }, easings.easeOutQuad)
        .onEnd(() => circleAnimation.destroy());
    };

    for (let i = 0; i < times; i++) {
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

    if (levelUpPending) {
      drawRect({
        pos: vec2(0, 0),
        width: width(),
        height: height(),
        color: rgb(0, 0, 0),
        opacity: 0.8,
      });
      drawText({
        text: "Level Up! Choose an upgrade",
        size: 30,
        pos: vec2(width() / 2, height() / 2 - UPGRADE_CARD_HEIGHT / 2 - 45),
        anchor: "center",
        color: rgb(255, 255, 255),
      });

      const cardGap = 20;
      const cardsWidth = UPGRADE_CARD_WIDTH * levelUpUpgrades.length + cardGap * (levelUpUpgrades.length - 1);
      const firstCardX = (width() - cardsWidth) / 2;
      const cardY = (height() - UPGRADE_CARD_HEIGHT) / 2;

      for (let i = 0; i < levelUpUpgrades.length; i++) {
        const cardX = firstCardX + i * (UPGRADE_CARD_WIDTH + cardGap);
        drawRect({
          pos: vec2(cardX, cardY),
          width: UPGRADE_CARD_WIDTH,
          height: UPGRADE_CARD_HEIGHT,
          color: rgb(26, 24, 38),
          outline: { color: rgb(108, 143, 255), width: 2 },
        });
        drawText({
          text: levelUpUpgrades[i].name,
          size: 18,
          pos: vec2(cardX + UPGRADE_CARD_WIDTH / 2, cardY + 42),
          anchor: "center",
          color: rgb(255, 255, 255),
        });
        drawText({
          text: levelUpUpgrades[i].description,
          size: 14,
          width: UPGRADE_CARD_WIDTH - 24,
          pos: vec2(cardX + UPGRADE_CARD_WIDTH / 2, cardY + 105),
          anchor: "center",
          color: rgb(210, 210, 220),
        });
      }
    }
  });
});

go("game");