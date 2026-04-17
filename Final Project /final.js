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
  speed: BASE_PLAYER_SPEED
};

const playerTwo = {
  x: canvas.width - 70,
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

const swapPlayerBall = {
  x: 70,
  y: canvas.height / 2,
  radius: 28,
  speed: 14
};

const swapBallPaddle = {
  x: canvas.width / 2 - 12,
  y: canvas.height / 2 - 60,
  width: 24,
  height: 120,
  dx: 6.5,
  dy: 3.2,
  color: "#f97316"
};

let walls = [];
let goalMode = false;
let balls = [];
let ballIdCounter = 0;
let bumpers = [];

const levelData = {
  1: {
    title: "Level 1: Warm Up",
    hint: "One ball. Slightly faster. Still pretending to be normal."
  },
  2: {
    title: "Level 2: Split",
    hint: "At volume 10, one ball becomes three. Love that for you."
  },
  3: {
    title: "Level 3: Role Reversal",
    hint: "Your paddle is now a ball. The flying ball is now a paddle."
  },
  4: {
    title: "Level 4: Now You See It",
    hint: "The ball disappears for a whole second at a time."
  },
  5: {
    title: "Level 5: Betrayal",
    hint: "Your controls invert and the ball curves."
  },
  6: {
    title: "Level 6: Sideways",
    hint: "Your paddle rotates. Normal movement. Awful shape."
  },
  7: {
    title: "Level 7: Red Means Death",
    hint: "One real ball. Five red balls. Red sends you to zero."
  },
  8: {
    title: "Level 8: Random Deflectors",
    hint: "Static balls sit in the arena. Hit one and the ball bounces weird."
  },
  9: {
    title: "Level 9: Two Jobs",
    hint: "Two paddles. Arrows for one. W and S for the other."
  },
  10: {
    title: "Level 10: Panic",
    hint: "Volume 90 through 98 is fast. At 99, the goal appears."
  },
  11: {
    title: "Level 11: Final Goal",
    hint: "At volume 99, move around and score into the goal."
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
  if (v >= 99) return 11;
  if (v >= 90) return 10;
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

  playerTwo.active = false;
  playerTwo.width = BASE_PLAYER_WIDTH;
  playerTwo.height = BASE_PLAYER_HEIGHT;
  playerTwo.speed = BASE_PLAYER_SPEED;
  playerTwo.x = canvas.width - 70;
  playerTwo.y = canvas.height / 2 - playerTwo.height / 2;

  cpuWall.color = "#ffffff";

  swapPlayerBall.x = 70;
  swapPlayerBall.y = canvas.height / 2;
  swapPlayerBall.radius = 28;
  swapPlayerBall.speed = 14;

  swapBallPaddle.x = canvas.width / 2 - swapBallPaddle.width / 2;
  swapBallPaddle.y = canvas.height / 2 - swapBallPaddle.height / 2;
  swapBallPaddle.dx = 6.5;
  swapBallPaddle.dy = 3.2;
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
    dy: randomBetween(2.4, 3.8) * dirY,
    color: options.color ?? "#f97316",
    isHazard: options.isHazard ?? false,
    visible: true
  };
}

function resetBallsForLevel() {
  balls = [];
  walls = [];
  bumpers = [];
  goalMode = false;
  invisTimer = 0;
  invisibleNow = false;
  curveTime = 0;

  if (currentLevel === 1) {
    balls.push(createBall({ speed: 6.3 }));
  } else if (currentLevel === 2) {
    balls.push(createBall({ speed: 6.8 }));
  } else if (currentLevel === 4) {
    balls.push(createBall({ speed: 7.2 }));
  } else if (currentLevel === 5) {
    balls.push(createBall({ speed: 7.6 }));
  } else if (currentLevel === 6) {
    balls.push(createBall({ speed: 7.4 }));
  } else if (currentLevel === 7) {
    balls.push(createBall({ speed: 7.2 }));
    for (let i = 0; i < 5; i++) {
      balls.push(
        createBall({
          x: canvas.width * 0.52 + i * 18,
          y: 70 + i * 70,
          speed: 5.2 + i * 0.15,
          color: "#ff2b2b",
          isHazard: true
        })
      );
    }
  } else if (currentLevel === 8) {
    balls.push(createBall({ speed: 7.0 }));
    bumpers = [
      { x: 260, y: 120, radius: 28 },
      { x: 420, y: 240, radius: 28 },
      { x: 300, y: 380, radius: 28 },
      { x: 560, y: 150, radius: 28 },
      { x: 610, y: 330, radius: 28 }
    ];
  } else if (currentLevel === 9) {
    playerTwo.active = true;
    balls.push(createBall({ speed: 7.0 }));
  } else if (currentLevel === 10) {
    balls.push(createBall({ speed: 10.5 }));
    player.speed = 22;
  } else if (currentLevel === 11) {
    goalMode = true;
    balls.push(createBall({ speed: 4.5, dirX: 1 }));
    player.speed = 12;
  }
}

function applyLevelSettings() {
  resetPaddles();

  if (currentLevel === 2) {
    player.speed = 15;
  }

  if (currentLevel === 3) {
    swapPlayerBall.speed = 15;
  }

  if (currentLevel === 4) {
    player.speed = 15;
  }

  if (currentLevel === 5) {
    player.speed = 15;
  }

  if (currentLevel === 6) {
    player.width = 90;
    player.height = 18;
    player.x = 55;
    player.y = canvas.height / 2 - player.height / 2;
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
    player.speed = 22;
  }

  if (currentLevel === 11) {
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
    advanceLevelIfNeeded();
  }
}

function sendVolumeToZero() {
  if (!volumeIsSet) {
    volume = 0;
    updateVolumeDisplay();
    currentLevel = 1;
    applyLevelSettings();
    if (hintsEnabled) {
      showLevelPopup(1);
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

function splitIntoThree(sourceBall) {
  const baseSpeed = 6.8;
  balls = [
    createBall({
      x: sourceBall.x,
      y: sourceBall.y - 22,
      speed: baseSpeed,
      dirX: Math.sign(sourceBall.dx) || 1,
      dirY: -1
    }),
    createBall({
      x: sourceBall.x,
      y: sourceBall.y,
      speed: baseSpeed + 0.4,
      dirX: Math.sign(sourceBall.dx) || 1,
      dirY: 1
    }),
    createBall({
      x: sourceBall.x,
      y: sourceBall.y + 22,
      speed: baseSpeed + 0.8,
      dirX: Math.sign(sourceBall.dx) || 1,
      dirY: -1
    })
  ];
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
  ctx.fillStyle = "#1f7a1f";
  ctx.fillRect(canvas.width - 24, canvas.height / 2 - 70, 20, 140);
  ctx.fillStyle = "#9cff9c";
  ctx.font = "16px Arial";
  ctx.fillText("GOAL", canvas.width - 78, canvas.height / 2 - 84);
}

function drawCpuWall() {
  if (currentLevel === 11) return;
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

function drawBumpers() {
  if (currentLevel !== 8) return;
  bumpers.forEach((bumper) => {
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#666";
    ctx.fill();
    ctx.closePath();
  });
}

function drawText() {
  ctx.fillStyle = "#bdbdbd";
  ctx.font = "20px Arial";

  if (currentLevel === 9) {
    ctx.fillText("ARROWS", 40, 35);
    ctx.fillText("W / S", canvas.width - 130, 35);
  } else if (currentLevel === 3) {
    ctx.fillText("BALL", 35, 35);
    ctx.fillText("WALL", canvas.width - 105, 35);
  } else {
    ctx.fillText("YOU", 55, 35);
    if (currentLevel !== 11) {
      ctx.fillText("WALL", canvas.width - 105, 35);
    }
  }
}

function draw() {
  drawBackground();
  drawGoal();
  drawBumpers();
  drawText();

  if (currentLevel === 3) {
    drawSwapMode();
    drawCpuWall();
  } else {
    drawPaddle(player, "#ffffff");
    if (currentLevel === 9 && playerTwo.active) {
      drawPaddle(playerTwo, "#7ddf95");
    }
    drawCpuWall();
    balls.forEach(drawBall);
  }
}

function moveVerticalPaddle(paddle, moveUp, moveDown, invert = false) {
  let direction = 0;
  if (moveUp) direction -= 1;
  if (moveDown) direction += 1;
  if (invert) direction *= -1;

  paddle.y += direction * paddle.speed;
  paddle.y = clamp(paddle.y, 0, canvas.height - paddle.height);
}

function moveHorizontalPaddleNormal() {
  let direction = 0;
  if (upPressed) direction -= 1;
  if (downPressed) direction += 1;

  player.y += direction * player.speed;
  player.y = clamp(player.y, 0, canvas.height - player.height);
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

function movePlayerControls() {
  if (currentLevel === 3) {
    moveSwapPlayerBall();
    return;
  }

  if (currentLevel === 5) {
    moveVerticalPaddle(player, upPressed, downPressed, true);
    return;
  }

  if (currentLevel === 6) {
    moveHorizontalPaddleNormal();
    return;
  }

  if (currentLevel === 11) {
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
}

function ballHitsVerticalPaddle(ball, paddle) {
  return (
    ball.x - ball.radius <= paddle.x + paddle.width &&
    ball.x + ball.radius >= paddle.x &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height
  );
}

function ballHitsHorizontalPaddle(ball, paddle) {
  return (
    ball.x + ball.radius >= paddle.x &&
    ball.x - ball.radius <= paddle.x + paddle.width &&
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

function reflectOffHorizontalPaddle(ball, paddle) {
  const centerX = paddle.x + paddle.width / 2;
  const offset = (ball.x - centerX) / (paddle.width / 2);

  ball.y = ball.dy > 0 ? paddle.y - ball.radius : paddle.y + paddle.height + ball.radius;

  if (Math.abs(offset) < 0.25) {
    ball.dy *= -1;
    ball.dx *= 0.95;
  } else {
    ball.dy *= -1;
    ball.dx += offset * 5;
  }
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

  const goalTop = canvas.height / 2 - 70;
  const goalBottom = canvas.height / 2 + 70;

  if (ball.x + ball.radius >= canvas.width - 24) {
    if (ball.y >= goalTop && ball.y <= goalBottom) {
      if (!volumeIsSet) {
        volume = 100;
        updateVolumeDisplay();
      }
      return true;
    }
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

function handleBumpers(ball) {
  if (currentLevel !== 8) return;

  for (const bumper of bumpers) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= ball.radius + bumper.radius) {
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
      const angle = randomBetween(-Math.PI / 3, Math.PI / 3);

      if (ball.dx > 0) {
        ball.dx = -Math.abs(speed * Math.cos(angle));
      } else {
        ball.dx = Math.abs(speed * Math.cos(angle));
      }

      ball.dy = speed * Math.sin(angle);
      ball.x += ball.dx * 0.5;
      ball.y += ball.dy * 0.5;
      return;
    }
  }
}

function moveBalls() {
  const ballsToRemove = new Set();
  let reachedHundred = false;

  for (const ball of balls) {
    ball.x += ball.dx;
    ball.y += ball.dy;

    handleWallCollision(ball);
    handleBumpers(ball);

    if (!ball.isHazard) {
      if (currentLevel === 6) {
        if (ballHitsHorizontalPaddle(ball, player) && ball.dx < 0) {
          reflectOffHorizontalPaddle(ball, player);
          increaseVolume();
        }
      } else {
        if (ballHitsVerticalPaddle(ball, player) && ball.dx < 0) {
          reflectOffVerticalPaddle(ball, player, true);
          increaseVolume();

          if (currentLevel === 2 && balls.length === 1 && volume >= 10 && volume < 20) {
            splitIntoThree(ball);
            return;
          }
        }

        if (currentLevel === 9 && playerTwo.active) {
          if (ballHitsVerticalPaddle(ball, playerTwo) && ball.dx < 0) {
            reflectOffVerticalPaddle(ball, playerTwo, true);
            increaseVolume();
          }
        }
      }

      if (currentLevel !== 11 && ballHitsCpuWall(ball) && ball.dx > 0) {
        reflectOffCpuWall(ball);
        increaseVolume();
      }
    } else {
      if (currentLevel === 6) {
        if (ballHitsHorizontalPaddle(ball, player) && ball.dx < 0) {
          sendVolumeToZero();
          return;
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

        if (ballHitsCpuWall(ball) && ball.dx > 0) {
          reflectOffCpuWall(ball);
        }
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

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  draw();

  if (!isPaused && gameStarted) {
    movePlayerControls();
    applyBallSpecials(deltaTime);

    if (currentLevel === 3) {
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
  } else {
    volume = lockedVolume;
    updateVolumeDisplay();
    volumeIsSet = false;
    currentLevel = getLevelFromVolume(volume);
    applyLevelSettings();
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
  if (event.code === "ArrowUp") upPressed = true;
  if (event.code === "ArrowDown") downPressed = true;
  if (event.code === "ArrowLeft") leftPressed = true;
  if (event.code === "ArrowRight") rightPressed = true;
  if (event.code === "KeyW") wPressed = true;
  if (event.code === "KeyS") sPressed = true;

  if (event.code === "Space") {
    event.preventDefault();
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