const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const volumeText = document.getElementById("volumeText");
const levelTitle = document.getElementById("levelTitle");
const startOverlay = document.getElementById("startOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const levelOverlay = document.getElementById("levelOverlay");
const levelOverlayTitle = document.getElementById("levelOverlayTitle");
const levelOverlayText = document.getElementById("levelOverlayText");
const startBtn = document.getElementById("startBtn");
const continueBtn = document.getElementById("continueBtn");
const toggleHintsBtn = document.getElementById("toggleHintsBtn");
const confirmBtn = document.getElementById("confirmBtn");
const levelSkipButtons = document.querySelectorAll(".level-skip-btn");

let volume = 0;
let lockedVolume = 0;
let volumeIsSet = false;

let gameStarted = false;
let isPaused = false;
let animationId = null;
let hintsEnabled = true;
let currentLevel = 1;

let upPressed = false;
let downPressed = false;
let leftPressed = false;
let rightPressed = false;
let wPressed = false;
let sPressed = false;

let lastTime = 0;
let invisTimer = 0;
let invisibleNow = false;
let curveTime = 0;

const BASE_PLAYER_WIDTH = 16;
const BASE_PLAYER_HEIGHT = 110;
const BASE_PLAYER_SPEED = 14;

const player = {
  x: 30,
  y: canvas.height / 2 - BASE_PLAYER_HEIGHT / 2,
  width: BASE_PLAYER_WIDTH,
  height: BASE_PLAYER_HEIGHT,
  speed: BASE_PLAYER_SPEED,
  driftDir: 1
};

const playerTwo = {
  x: 85,
  y: canvas.height / 2 - BASE_PLAYER_HEIGHT / 2,
  width: BASE_PLAYER_WIDTH,
  height: BASE_PLAYER_HEIGHT,
  speed: BASE_PLAYER_SPEED,
  active: false
};

const cpuWall = {
  x: canvas.width - 24,
  y: 0,
  width: 24,
  height: canvas.height,
  color: "#ffffff"
};

const goalZone = {
  x: canvas.width - 24,
  y: canvas.height / 2 - 55,
  width: 24,
  height: 110
};

const swapPlayerBall = {
  x: 70,
  y: canvas.height / 2,
  radius: 12,
  speed: 20
};

const swapBallPaddle = {
  x: canvas.width / 2 - BASE_PLAYER_WIDTH / 2,
  y: canvas.height / 2 - BASE_PLAYER_HEIGHT / 2,
  width: BASE_PLAYER_WIDTH,
  height: BASE_PLAYER_HEIGHT,
  dx: 8.5,
  dy: 4.5,
  color: "#f97316"
};

let balls = [];
let bumpers = [];
let goalMode = false;
let ballIdCounter = 0;
let popups = [];
let popupIdCounter = 0;
let popupSpawnCooldown = 0;

const popupMessages = [
  "Don't forget to wear a seat belt.",
  "Always brush your teeth.",
  "Are you enjoying this game?",
  "Remember to stay hydrated.",
  "Posture check.",
  "Have you studied today?",
  "Drink some water right now.",
  "Did you call your grandma?",
  "Screens are bad for your eyes.",
  "Keep it up!"
];

const levelData = {
  1: {
    title: "Level 1: Warm Up",
    hint: "One ball. Looks to be a normal game of Pong."
  },
  2: {
    title: "Level 2: Role Reversal",
    hint: "Your paddle is a ball now. The flying ball is a paddle. Speed increased."
  },
  3: {
    title: "Level 3: Split",
    hint: "Now it splits into 2 staggered balls."
  },
  4: {
    title: "Level 4: Now You See It",
    hint: "The ball disappears for a full second."
  },
  5: {
    title: "Level 5: Inverted Controls",
    hint: "Your controls invert."
  },
  6: {
    title: "Level 6: Controller Drift",
    hint: "Your paddle drifts when you stop moving."
  },
  7: {
    title: "Level 7: Red Means Death",
    hint: "Ballz of death."
  },
  8: {
    title: "Level 8: Pop-Up Hell",
    hint: "Pop-up messages keep covering the game. You can close them, if you have time."
  },
  9: {
    title: "Level 9: Two Jobs",
    hint: "Two paddles. Two staggered balls. Arrows for one, W and S for the other."
  },
  10: {
    title: "Level 10: Final Goal",
    hint: "At volume 99 only, hit the small green goal. Anywhere else is a loss."
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomWallColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 85%, 60%)`;
}

function updateVolumeDisplay() {
  volumeText.textContent = volume;
}

function updateButtonText() {
  confirmBtn.textContent = volumeIsSet ? "Unset Volume" : "Set Volume";
}

function getLevelFromVolume(v) {
  if (v >= 99) return 10;
  if (v >= 80) return 9;
  if (v >= 70) return 8;
  if (v >= 60) return 7;
  if (v >= 50) return 6;
  if (v >= 40) return 5;
  if (v >= 30) return 4;
  if (v >= 20) return 3;
  if (v >= 10) return 2;
  return 1;
}

function updateLevelTitle() {
  levelTitle.textContent = levelData[currentLevel].title;
}

function resetPaddles() {
  player.width = BASE_PLAYER_WIDTH;
  player.height = BASE_PLAYER_HEIGHT;
  player.speed = BASE_PLAYER_SPEED;
  player.x = 30;
  player.y = canvas.height / 2 - player.height / 2;
  player.driftDir = Math.random() > 0.5 ? 1 : -1;

  playerTwo.active = false;
  playerTwo.width = BASE_PLAYER_WIDTH;
  playerTwo.height = BASE_PLAYER_HEIGHT;
  playerTwo.speed = BASE_PLAYER_SPEED;
  playerTwo.x = 85;
  playerTwo.y = canvas.height / 2 - playerTwo.height / 2;

  cpuWall.color = "#ffffff";

  swapPlayerBall.x = 70;
  swapPlayerBall.y = canvas.height / 2;
  swapPlayerBall.radius = 12;
  swapPlayerBall.speed = 20;

  swapBallPaddle.x = canvas.width / 2 - swapBallPaddle.width / 2;
  swapBallPaddle.y = canvas.height / 2 - swapBallPaddle.height / 2;
  swapBallPaddle.dx = 8.5;
  swapBallPaddle.dy = 4.5;
}

function createBall(options = {}) {
  const dirX = options.dirX ?? (Math.random() < 0.5 ? -1 : 1);
  const dirY = options.dirY ?? (Math.random() < 0.5 ? -1 : 1);
  const speed = options.speed ?? 6;

  return {
    id: ballIdCounter++,
    x: options.x ?? canvas.width / 2,
    y: options.y ?? canvas.height / 2,
    radius: options.radius ?? 12,
    dx: speed * dirX,
    dy: (options.dyMagnitude ?? randomBetween(2.4, 3.8)) * dirY,
    color: options.color ?? "#f97316",
    isHazard: options.isHazard ?? false,
    visible: true
  };
}

function createSplitBalls(sourceBall, count = 2) {
  const baseSpeed = 6.9;

  if (count === 2) {
    return [
      createBall({
        x: sourceBall.x,
        y: sourceBall.y - 42,
        speed: baseSpeed,
        dirX: Math.sign(sourceBall.dx) || 1,
        dirY: -1,
        dyMagnitude: 3.2
      }),
      createBall({
        x: sourceBall.x,
        y: sourceBall.y + 42,
        speed: baseSpeed + 0.6,
        dirX: Math.sign(sourceBall.dx) || 1,
        dirY: 1,
        dyMagnitude: 3.8
      })
    ];
  }

  return [createBall({ speed: baseSpeed })];
}

function createPopup(forceMessage = null) {
  const width = randomBetween(180, 260);
  const height = randomBetween(110, 170);
  const x = randomBetween(40, canvas.width - width - 60);
  const y = randomBetween(50, canvas.height - height - 40);
  const message = forceMessage ?? popupMessages[Math.floor(Math.random() * popupMessages.length)];

  popups.push({
    id: popupIdCounter++,
    x,
    y,
    width,
    height,
    message
  });
}

function spawnPopupsForVolumeGain() {
  if (currentLevel === 1) {
    if (volume >= 3 && volume <= 9 && volume % 2 === 1) {
      createPopup();
    }
    return;
  }

  if (currentLevel === 8) {
    const count = Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      createPopup();
    }
  }
}

function seedWarmupPopups() {
  return;
}

function resetBallsForLevel() {
  balls = [];
  bumpers = [];
  goalMode = false;
  invisTimer = 0;
  invisibleNow = false;
  curveTime = 0;
  popupSpawnCooldown = 0;

  if (currentLevel !== 1 && currentLevel !== 8) {
    popups = [];
  }

  if (currentLevel === 1) {
    balls.push(createBall({ speed: 6.3 }));
    
  } else if (currentLevel === 3) {
    balls.push(createBall({ speed: 6.8 }));
  } else if (currentLevel === 4) {
    balls.push(createBall({ speed: 7.2 }));
  } else if (currentLevel === 5) {
    balls.push(createBall({ speed: 7.6 }));
  } else if (currentLevel === 6) {
    balls.push(createBall({ speed: 7.4 }));
  } else if (currentLevel === 7) {
    balls.push(createBall({ speed: 7.2 }));
    for (let i = 0; i < 3; i++) {
      balls.push(
        createBall({
          x: canvas.width * 0.56 + i * 28,
          y: 95 + i * 110,
          speed: 5.2 + i * 0.25,
          color: "#ff2b2b",
          isHazard: true
        })
      );
    }
  } else if (currentLevel === 8) {
    balls.push(createBall({ speed: 7.0 }));
    if (popups.length < 5) {
      for (let i = popups.length; i < 5; i++) {
        createPopup();
      }
    }
  } else if (currentLevel === 9) {
    playerTwo.active = true;
    balls.push(
      ...createSplitBalls(
        {
          x: canvas.width / 2,
          y: canvas.height / 2,
          dx: 1
        },
        2
      )
    );
  } else if (currentLevel === 10) {
    goalMode = true;
    balls.push(createBall({ speed: 4.7, dirX: -1, dyMagnitude: 3.0 }));
  }
}

function applyLevelSettings() {
  resetPaddles();

  if (currentLevel === 2) {
    swapPlayerBall.speed = 20;
  }

  if (currentLevel === 3) {
    player.speed = 15;
  }

  if (currentLevel === 4) {
    player.speed = 15;
  }

  if (currentLevel === 5) {
    player.speed = 15;
  }

  if (currentLevel === 6) {
    player.speed = 15;
  }

  if (currentLevel === 7) {
    player.speed = 15;
  }

  if (currentLevel === 8) {
    player.speed = 15;
  }

  if (currentLevel === 9) {
    player.speed = 16;
    playerTwo.speed = 16;
  }

  if (currentLevel === 10) {
    player.speed = 12;
  }

  resetBallsForLevel();
  updateLevelTitle();
}

function showLevelPopup(level) {
  isPaused = true;
  levelOverlayTitle.textContent = levelData[level].title;
  levelOverlayText.textContent = levelData[level].hint;
  levelOverlay.classList.add("show");
}

function advanceLevelIfNeeded() {
  const newLevel = getLevelFromVolume(volume);

  if (newLevel !== currentLevel) {
    currentLevel = newLevel;
    applyLevelSettings();

    if (hintsEnabled) {
      showLevelPopup(newLevel);
    }
  }
}

function increaseVolume() {
  if (volumeIsSet) return;

  if (volume < 100) {
    volume += 1;
    updateVolumeDisplay();
    spawnPopupsForVolumeGain();
    advanceLevelIfNeeded();
  }
}

function sendVolumeToZero() {
  if (!volumeIsSet) {
    volume = 0;
    updateVolumeDisplay();
    currentLevel = getLevelFromVolume(volume);
    applyLevelSettings();

    if (hintsEnabled) {
      showLevelPopup(currentLevel);
    }
  } else {
    resetBallsForLevel();
  }
}

function resetBallOnly(ball) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  const dirX = Math.random() < 0.5 ? -1 : 1;
  const dirY = Math.random() < 0.5 ? -1 : 1;
  ball.dx = Math.abs(ball.dx || 6) * dirX;
  ball.dy = randomBetween(2.4, 3.8) * dirY;
}

function drawBackground() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGoal() {
  if (!goalMode) return;

  ctx.fillStyle = "#173017";
  ctx.fillRect(goalZone.x, 0, goalZone.width, canvas.height);

  ctx.fillStyle = "#29a329";
  ctx.fillRect(goalZone.x, goalZone.y, goalZone.width, goalZone.height);

  ctx.fillStyle = "#9cff9c";
  ctx.font = "16px Arial";
  ctx.fillText("GOAL", canvas.width - 82, goalZone.y - 10);
}

function drawCpuWall() {
  if (goalMode) return;
  ctx.fillStyle = cpuWall.color;
  ctx.fillRect(cpuWall.x, cpuWall.y, cpuWall.width, cpuWall.height);
}

function drawPaddle(paddle, color = "#ffffff") {
  ctx.fillStyle = color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall(ball) {
  if (!ball.visible) return;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawSwapMode() {
  ctx.beginPath();
  ctx.arc(swapPlayerBall.x, swapPlayerBall.y, swapPlayerBall.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.closePath();

  ctx.fillStyle = swapBallPaddle.color;
  ctx.fillRect(swapBallPaddle.x, swapBallPaddle.y, swapBallPaddle.width, swapBallPaddle.height);
}

function drawText() {
  ctx.fillStyle = "#bdbdbd";
  ctx.font = "20px Arial";

  if (currentLevel === 9) {
    ctx.fillText("ARROWS", 35, 35);
    ctx.fillText("W / S", 110, 35);
  } else if (currentLevel === 2) {
    ctx.fillText("BALL", 35, 35);
    ctx.fillText("WALL", canvas.width - 105, 35);
  } else {
    ctx.fillText("YOU", 55, 35);
    if (!goalMode) {
      ctx.fillText("WALL", canvas.width - 105, 35);
    }
  }
}

function drawPopup(popup) {
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(popup.x, popup.y, popup.width, popup.height);

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(popup.x, popup.y, popup.width, 26);

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px Arial";
  ctx.fillText("Important Message", popup.x + 10, popup.y + 17);

  ctx.fillStyle = "#ff4d4d";
  ctx.fillRect(popup.x + popup.width - 26, popup.y + 4, 18, 18);

  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.fillText("X", popup.x + popup.width - 20, popup.y + 17);

  ctx.fillStyle = "#111";
  ctx.font = "14px Arial";
  wrapText(popup.message, popup.x + 12, popup.y + 48, popup.width - 24, 18);

  if (popup.message === "Are you enjoying this game?") {
    ctx.fillStyle = "#f5b301";
    ctx.font = "18px Arial";
    ctx.fillText("★★★★★", popup.x + 12, popup.y + popup.height - 18);
  }
}

function drawPopups() {
  popups.forEach(drawPopup);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
}

function draw() {
  drawBackground();
  drawGoal();
  drawText();

  if (currentLevel === 2) {
    drawSwapMode();
    drawCpuWall();
    drawPopups();
    return;
  }

  drawPaddle(player, "#ffffff");

  if (currentLevel === 9 && playerTwo.active) {
    drawPaddle(playerTwo, "#7ddf95");
  }

  drawCpuWall();
  balls.forEach(drawBall);
  drawPopups();
}

function moveVerticalPaddle(paddle, moveUp, moveDown, invert = false) {
  let direction = 0;
  if (moveUp) direction -= 1;
  if (moveDown) direction += 1;
  if (invert) direction *= -1;

  paddle.y += direction * paddle.speed;
  paddle.y = clamp(paddle.y, 0, canvas.height - paddle.height);
}

function moveGoalModePaddle() {
  let dx = 0;
  let dy = 0;

  if (leftPressed) dx -= 1;
  if (rightPressed) dx += 1;
  if (upPressed) dy -= 1;
  if (downPressed) dy += 1;

  player.x += dx * player.speed;
  player.y += dy * player.speed;

  player.x = clamp(player.x, 0, canvas.width / 2 - player.width);
  player.y = clamp(player.y, 0, canvas.height - player.height);
}

function moveSwapPlayerBall() {
  let direction = 0;
  if (upPressed) direction -= 1;
  if (downPressed) direction += 1;

  swapPlayerBall.y += direction * swapPlayerBall.speed;
  swapPlayerBall.y = clamp(
    swapPlayerBall.y,
    swapPlayerBall.radius,
    canvas.height - swapPlayerBall.radius
  );
}

function moveDriftPaddle() {
  if (upPressed) {
    player.y -= player.speed;
  } else if (downPressed) {
    player.y += player.speed;
  } else {
    if (Math.random() < 0.02) {
      player.driftDir *= -1;
    }

    player.y += player.driftDir * (player.speed * 0.6);
  }

  player.y = clamp(player.y, 0, canvas.height - player.height);
}

function movePlayerControls() {
  if (currentLevel === 2) {
    moveSwapPlayerBall();
    return;
  }

  if (currentLevel === 5) {
    moveVerticalPaddle(player, upPressed, downPressed, true);
    return;
  }

  if (currentLevel === 6) {
    moveDriftPaddle();
    return;
  }

  if (currentLevel === 10) {
    moveGoalModePaddle();
    return;
  }

  moveVerticalPaddle(player, upPressed, downPressed, false);

  if (currentLevel === 9 && playerTwo.active) {
    moveVerticalPaddle(playerTwo, wPressed, sPressed, false);
  }
}

function applyBallSpecials(deltaTime) {
  if (currentLevel === 4) {
    invisTimer += deltaTime;

    if (invisTimer >= 1.2 && invisTimer < 2.2) {
      invisibleNow = true;
    } else {
      invisibleNow = false;
    }

    if (invisTimer >= 2.2) {
      invisTimer = 0;
      invisibleNow = false;
    }

    balls.forEach((ball) => {
      ball.visible = !invisibleNow;
    });
  } else {
    balls.forEach((ball) => {
      ball.visible = true;
    });
  }

  if (currentLevel === 5) {
    curveTime += deltaTime;
    balls.forEach((ball) => {
      ball.dy += Math.sin(curveTime * 2 + ball.id) * 0.04;
      ball.dy = clamp(ball.dy, -7, 7);
    });
  }

  if (currentLevel === 8) {
    popupSpawnCooldown -= deltaTime;

    if (popupSpawnCooldown <= 0) {
      createPopup(Math.random() < 0.25 ? "Are you enjoying this game?" : null);
      popupSpawnCooldown = randomBetween(0.8, 1.5);
    }
  }
}

function ballHitsVerticalPaddle(ball, paddle) {
  return (
    ball.x - ball.radius <= paddle.x + paddle.width &&
    ball.x + ball.radius >= paddle.x &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height
  );
}

function ballHitsCpuWall(ball) {
  return ball.x + ball.radius >= cpuWall.x;
}

function reflectOffVerticalPaddle(ball, paddle, isPlayerSide) {
  const paddleCenter = paddle.y + paddle.height / 2;
  const hitOffset = (ball.y - paddleCenter) / (paddle.height / 2);

  if (isPlayerSide) {
    ball.x = paddle.x + paddle.width + ball.radius;
    ball.dx = Math.abs(ball.dx);
  } else {
    ball.x = paddle.x - ball.radius;
    ball.dx = -Math.abs(ball.dx);
  }

  ball.dy += hitOffset * 2.2;
}

function reflectOffCpuWall(ball) {
  ball.x = cpuWall.x - ball.radius;
  ball.dx = -Math.abs(ball.dx);
  cpuWall.color = randomWallColor();
}

function handleWallCollision(ball) {
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy *= -1;
  }

  if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.dy *= -1;
  }
}

function handleGoal(ball) {
  if (!goalMode || volume !== 99) return false;

  if (ball.x + ball.radius >= goalZone.x) {
    if (ball.y >= goalZone.y && ball.y <= goalZone.y + goalZone.height) {
      volume = 100;
      updateVolumeDisplay();
      return true;
    }

    sendVolumeToZero();
    return true;
  }

  return false;
}

function handleOutOfBounds(ball) {
  if (ball.isHazard) {
    if (
      ball.x + ball.radius < 0 ||
      ball.x - ball.radius > canvas.width ||
      ball.y + ball.radius < 0 ||
      ball.y - ball.radius > canvas.height
    ) {
      resetBallOnly(ball);
    }
    return false;
  }

  if (ball.x + ball.radius < 0) {
    sendVolumeToZero();
    return true;
  }

  return false;
}

function swapModeCollisionCircleRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function moveSwapMode() {
  swapBallPaddle.x += swapBallPaddle.dx;
  swapBallPaddle.y += swapBallPaddle.dy;

  if (swapBallPaddle.y <= 0) {
    swapBallPaddle.y = 0;
    swapBallPaddle.dy *= -1;
  }

  if (swapBallPaddle.y + swapBallPaddle.height >= canvas.height) {
    swapBallPaddle.y = canvas.height - swapBallPaddle.height;
    swapBallPaddle.dy *= -1;
  }

  if (swapModeCollisionCircleRect(swapPlayerBall, swapBallPaddle) && swapBallPaddle.dx < 0) {
    swapBallPaddle.x = swapPlayerBall.x + swapPlayerBall.radius;
    swapBallPaddle.dx = Math.abs(swapBallPaddle.dx);
    increaseVolume();
  }

  if (swapBallPaddle.x + swapBallPaddle.width >= cpuWall.x) {
    swapBallPaddle.x = cpuWall.x - swapBallPaddle.width;
    swapBallPaddle.dx = -Math.abs(swapBallPaddle.dx);
    cpuWall.color = randomWallColor();
    increaseVolume();
  }

  if (swapBallPaddle.x + swapBallPaddle.width < 0) {
    sendVolumeToZero();
  }
}

function handleNormalBallPlayerCollision(ball) {
  if (ballHitsVerticalPaddle(ball, player) && ball.dx < 0) {
    reflectOffVerticalPaddle(ball, player, true);
    if (currentLevel !== 10) {
  increaseVolume();
}

    if (currentLevel === 3 && balls.length === 1 && volume >= 20 && volume < 30) {
      balls = createSplitBalls(ball, 2);
      return true;
    }

    return true;
  }

  if (currentLevel === 9 && playerTwo.active) {
    if (ballHitsVerticalPaddle(ball, playerTwo) && ball.dx < 0) {
      reflectOffVerticalPaddle(ball, playerTwo, true);
      if (currentLevel !== 10) {
  increaseVolume();
}
      return true;
    }
  }

  return false;
}

function moveBalls() {
  const ballsToRemove = new Set();
  let reachedHundred = false;

  for (const ball of balls) {
    ball.x += ball.dx;
    ball.y += ball.dy;

    handleWallCollision(ball);

    if (!ball.isHazard) {
      const changed = handleNormalBallPlayerCollision(ball);
      if (changed && currentLevel === 3 && balls.length === 2) {
        return;
      }

      if (!goalMode && ballHitsCpuWall(ball) && ball.dx > 0) {
        reflectOffCpuWall(ball);
        increaseVolume();
      }
    } else {
      if (ballHitsVerticalPaddle(ball, player) && ball.dx < 0) {
        sendVolumeToZero();
        return;
      }

      if (currentLevel === 9 && playerTwo.active) {
        if (ballHitsVerticalPaddle(ball, playerTwo) && ball.dx < 0) {
          sendVolumeToZero();
          return;
        }
      }

      if (!goalMode && ballHitsCpuWall(ball) && ball.dx > 0) {
        reflectOffCpuWall(ball);
      }
    }

    if (handleGoal(ball)) {
      reachedHundred = true;
      ballsToRemove.add(ball.id);
    }

    if (handleOutOfBounds(ball)) {
      continue;
    }
  }

  if (ballsToRemove.size > 0) {
    balls = balls.filter((ball) => !ballsToRemove.has(ball.id));
  }

  if (reachedHundred) {
    pauseOverlay.classList.add("show");
    pauseOverlay.querySelector("h2").textContent = "Volume 100";
    isPaused = true;
  }
}

function handlePopupClick(mouseX, mouseY) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const popup = popups[i];
    const closeX = popup.x + popup.width - 26;
    const closeY = popup.y + 4;
    const closeW = 18;
    const closeH = 18;

    const clickedClose =
      mouseX >= closeX &&
      mouseX <= closeX + closeW &&
      mouseY >= closeY &&
      mouseY <= closeY + closeH;

    if (clickedClose) {
      popups.splice(i, 1);
      return true;
    }
  }

  return false;
}

canvas.addEventListener("click", function (event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  handlePopupClick(mouseX, mouseY);
});

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  draw();

  if (!isPaused && gameStarted) {
    movePlayerControls();
    applyBallSpecials(deltaTime);

    if (currentLevel === 2) {
      moveSwapMode();
    } else {
      moveBalls();
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  gameStarted = true;
  isPaused = false;
  pauseOverlay.classList.remove("show");
  levelOverlay.classList.remove("show");
  startOverlay.classList.remove("show");
  currentLevel = getLevelFromVolume(volume);
  applyLevelSettings();
  updateButtonText();

  if (!animationId) {
    requestAnimationFrame(gameLoop);
  }
}

function togglePause() {
  if (!gameStarted) return;
  if (levelOverlay.classList.contains("show")) return;

  isPaused = !isPaused;

  if (isPaused) {
    pauseOverlay.querySelector("h2").textContent = "Pause";
    pauseOverlay.classList.add("show");
  } else {
    pauseOverlay.classList.remove("show");
  }
}

function toggleSetVolume() {
  if (!volumeIsSet) {
    lockedVolume = volume;
    volumeIsSet = true;

    isPaused = true;
    pauseOverlay.querySelector("h2").textContent = "Volume Has Been Set";
    pauseOverlay.classList.add("show");
  } else {
    volume = lockedVolume;
    updateVolumeDisplay();
    volumeIsSet = false;
    currentLevel = getLevelFromVolume(volume);
    applyLevelSettings();

    pauseOverlay.classList.remove("show");
    isPaused = false;
  }

  updateButtonText();
}

function continueFromLevelPopup() {
  levelOverlay.classList.remove("show");
  pauseOverlay.classList.remove("show");
  isPaused = false;
}

function toggleHints() {
  hintsEnabled = !hintsEnabled;
  toggleHintsBtn.textContent = hintsEnabled ? "Turn Off Hints" : "Turn On Hints";
}

function skipToVolume(targetVolume) {
  volume = targetVolume;
  updateVolumeDisplay();
  currentLevel = getLevelFromVolume(volume);
  applyLevelSettings();
  pauseOverlay.classList.remove("show");
  levelOverlay.classList.remove("show");
  isPaused = false;
}

document.addEventListener("keydown", function (event) {
  const gameKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

  if (gameKeys.includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "ArrowUp") upPressed = true;
  if (event.code === "ArrowDown") downPressed = true;
  if (event.code === "ArrowLeft") leftPressed = true;
  if (event.code === "ArrowRight") rightPressed = true;
  if (event.code === "KeyW") wPressed = true;
  if (event.code === "KeyS") sPressed = true;

  if (event.code === "Space") {
    togglePause();
  }
});

document.addEventListener("keyup", function (event) {
  if (event.code === "ArrowUp") upPressed = false;
  if (event.code === "ArrowDown") downPressed = false;
  if (event.code === "ArrowLeft") leftPressed = false;
  if (event.code === "ArrowRight") rightPressed = false;
  if (event.code === "KeyW") wPressed = false;
  if (event.code === "KeyS") sPressed = false;
});

startBtn.addEventListener("click", startGame);
continueBtn.addEventListener("click", continueFromLevelPopup);
toggleHintsBtn.addEventListener("click", toggleHints);
confirmBtn.addEventListener("click", toggleSetVolume);

levelSkipButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const targetVolume = Number(button.dataset.volume);
    skipToVolume(targetVolume);
  });
});

updateVolumeDisplay();
updateButtonText();
updateLevelTitle();
applyLevelSettings();
draw();