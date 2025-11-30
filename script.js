"use strict";

/***********************
 * 1. 設定區
 ***********************/

// 目標時間（北京時間）。月份 0–11，10 = 11 月
const targetTime = new Date(2025, 11, 1, 0, 53, 0);

// 粒子大字的順序
const BIG_WORDS = ["沐川大宝贝", "生日快乐", "又老一岁啰", "要天天开心呀"];

// 愛心中央顯示的字（要有字就填進去）
const HEART_CENTER_TEXT = "爱你";

// 打字機訊息
const MESSAGE_TEXT = `
我知道今年的生日礼物，看起来只是萤幕上的一段程式码、
一个小小的网页，没有很贵、也不是什么华丽的大礼物。

但这些 0 跟 1、这些像素跟动画，全部都是我一个一个敲出来、
一行一行测出来，只为了在这个时间点，对你说一声：

「生日快乐。」

如果有一天你觉得生活很卡、很累、很想关机重开，
希望你还是会记得今天这个画面，
记得萤幕前面有一个人，正在很努力地喜欢着你。

所以，最后再正式讲一次——

「生日快乐，谢谢你出现在我的人生里。」♡
`;

/***********************
 * 2. DOM 取得
 ***********************/
const nowTimeEl = document.getElementById("now-time");
const targetInfoEl = document.getElementById("target-info");
const distanceTextEl = document.getElementById("distance-text");

const timeSection = document.getElementById("time-section");
const countdownSection = document.getElementById("countdown-section");
const cakeSection = document.getElementById("cake-section");
const messageSection = document.getElementById("message-section");
const heartSection = document.getElementById("heart-section");

const countdownEl = document.getElementById("countdown");
const messageTextEl = document.getElementById("message-text");
const replayBtn = document.getElementById("replay-btn");

// 一開始標題偽裝成時間網站
document.title = "北京时间 · Beijing Time";

/***********************
 * 3. LOVE 字雨背景
 ***********************/
const matrixCanvas = document.getElementById("matrix-canvas");
const matrixCtx = matrixCanvas.getContext("2d");

const LOVE_CHARS = "LOVEYULO025♥".split("");
let matrixColumns = 0;
let matrixDrops = [];
const matrixFontSize = 18;
let matrixActive = true; // 倒數完會暫停，愛心階段再打開

function resizeMatrixCanvas() {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  matrixColumns = Math.floor(matrixCanvas.width / matrixFontSize);
  matrixDrops = new Array(matrixColumns).fill(0);
  matrixCtx.font = `${matrixFontSize}px "Share Tech Mono", monospace`;
}

function drawMatrix() {
  matrixCtx.fillStyle = matrixActive
    ? "rgba(0, 0, 0, 0.05)"
    : "rgba(0, 0, 0, 0.25)";
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

  if (matrixActive) {
    for (let i = 0; i < matrixColumns; i++) {
      const char = LOVE_CHARS[Math.floor(Math.random() * LOVE_CHARS.length)];
      const x = i * matrixFontSize;
      const y = matrixDrops[i] * matrixFontSize;
      const alpha = 0.4 + Math.random() * 0.6;
      matrixCtx.fillStyle = `rgba(255, 120, 190, ${alpha})`;
      matrixCtx.fillText(char, x, y);

      if (y > matrixCanvas.height && Math.random() > 0.965) {
        matrixDrops[i] = 0;
      } else {
        matrixDrops[i]++;
      }
    }
  }

  requestAnimationFrame(drawMatrix);
}

/***********************
 * 4. 粒子字 / 蛋糕 / 愛心 + 煙火
 ***********************/
const effectsCanvas = document.getElementById("effects-canvas");
const efCtx = effectsCanvas.getContext("2d");

let particles = [];     // 文字 / 蛋糕 / 愛心 / 轉場 的點
let fireworks = [];     // 煙火粒子
let currentNumber = null;
let currentWord = null;
let fireworksActive = false;
let fireworksIntensity = 0;
let smokePuffs = [];
let currentMode = "idle"; // idle / countdown / words / cake / message / transition / heart
let candleBlown = false;

// 形狀專用暫存 canvas
const shapeCanvas = document.createElement("canvas");
const shapeCtx = shapeCanvas.getContext("2d");
let shapeScale = 1;

/********* 共同工具：從形狀取出點 *********/
function createParticlesFromShape(drawFn, baseGap = 4) {
  const baseW = 700;
  const baseH = 400;

  shapeScale = Math.min(effectsCanvas.width / baseW, 1);
  shapeCanvas.width = baseW * shapeScale;
  shapeCanvas.height = baseH * shapeScale;

  const w = shapeCanvas.width;
  const h = shapeCanvas.height;

  shapeCtx.clearRect(0, 0, w, h);
  drawFn(shapeCtx, w, h, shapeScale);

  const img = shapeCtx.getImageData(0, 0, w, h).data;

  const mobile = window.innerWidth <= 600;   // 判斷是不是手機
  const gapBase = baseGap * shapeScale;

  // 手機：更密一點；桌機：維持原本
  const gap = mobile
    ? Math.max(2, gapBase * 0.7)
    : Math.max(3, gapBase);

  const result = [];

  for (let y = 0; y < h; y += gap) {
    for (let x = 0; x < w; x += gap) {
      const idx = (y * w + x) * 4;
      const a = img[idx + 3];
      if (a > 30) {
        const r = img[idx];
        const g = img[idx + 1];
        const b = img[idx + 2];
        const centerX = effectsCanvas.width / 2 - w / 2;
        const centerY = effectsCanvas.height / 2 - h / 2;
        result.push({
          x: centerX + x,
          y: centerY + y,
          baseX: centerX + x,
          baseY: centerY + y,
          color: `rgba(${r},${g},${b},1)`,
          seed: Math.random() * Math.PI * 2
        });
      }
    }
  }
  return result;
}

/********* 聚攏 / 消散專用包裝：文字 / 愛心 / 蛋糕粒子 *********/
function wrapTextParticles(points) {
  const cx = effectsCanvas.width / 2;
  const cy = effectsCanvas.height / 2;

  const mobile = window.innerWidth <= 600;
  // 手機版收得比較緊，字會比較清楚
  const spreadX = effectsCanvas.width * (mobile ? 0.25 : 0.4);
  const spreadY = effectsCanvas.height * (mobile ? 0.25 : 0.4);

  return points.map(p => ({
    ...p,
    x: cx + (Math.random() - 0.5) * spreadX,
    y: cy + (Math.random() - 0.5) * spreadY,
    alpha: 0,
    phase: "appear",   // appear -> stable -> scatter
    vx: 0,
    vy: 0,
    isText: true
  }));
}

// 讓目前粒子進入「消散」狀態（大字切換 / 蛋糕消散都會用到）
function scatterCurrentText() {
  for (const p of particles) {
    if (p.isText && p.phase !== "scatter") {
      p.phase = "scatter";
      p.alpha = p.alpha || 1;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    }
  }
}


/********* 各種形狀 *********/

// 倒數數字
function shapeNumber(num) {
  const base = createParticlesFromShape((ctx, w, h, s) => {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = 230 * s;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillText(String(num), w / 2, h / 2 + 10 * s);
  }, 5);
  return wrapTextParticles(base);
}

// 中文點陣字
function shapeWord(text) {
  const base = createParticlesFromShape((ctx, w, h, s) => {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = 96 * s;
    ctx.font =
      `bold ${fontSize}px 'Microsoft JhengHei','Noto Sans TC',sans-serif`;
    ctx.fillText(text, w / 2, h / 2);
  }, 3);
  return wrapTextParticles(base);
}

// 草莓雙層蛋糕（像素風）
function shapeCake() {
  const base = createParticlesFromShape((ctx, w, h, s) => {
    const cx = w / 2;
    const baseY = h / 2 + 40 * s;

    // 盤子
    ctx.fillStyle = "#8ea0ff";
    ctx.fillRect(cx - 180 * s, baseY - 30 * s, 360 * s, 30 * s);

    // 下層蛋糕
    ctx.fillStyle = "#f6b26b";
    ctx.fillRect(cx - 160 * s, baseY - 80 * s, 320 * s, 40 * s);

    // 下層糖霜
    ctx.fillStyle = "#ffd6e7";
    ctx.fillRect(cx - 160 * s, baseY - 110 * s, 320 * s, 35 * s);

    // 上層蛋糕
    ctx.fillStyle = "#f6b26b";
    ctx.fillRect(cx - 120 * s, baseY - 150 * s, 240 * s, 35 * s);

    // 上層糖霜
    ctx.fillStyle = "#ffd6e7";
    ctx.fillRect(cx - 120 * s, baseY - 180 * s, 240 * s, 30 * s);

    // 草莓（上層）
    ctx.fillStyle = "#ff4664";
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(cx + i * 40 * s - 8 * s, baseY - 190 * s, 16 * s, 16 * s);
    }

    // 草莓葉子
    ctx.fillStyle = "#3fbf5a";
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(cx + i * 40 * s - 6 * s, baseY - 200 * s, 12 * s, 6 * s);
    }

    // 左下角兩顆草莓
    ctx.fillStyle = "#ff4664";
    ctx.fillRect(cx - 190 * s, baseY - 40 * s, 18 * s, 18 * s);
    ctx.fillRect(cx - 165 * s, baseY - 35 * s, 18 * s, 18 * s);
    ctx.fillStyle = "#3fbf5a";
    ctx.fillRect(cx - 187 * s, baseY - 48 * s, 10 * s, 6 * s);

    // 蠟燭（只畫身體，火焰在 drawEffects 裡畫）
    ctx.fillStyle = "#9bffb0";
    const candleW = 12 * s;
    const candleH = 40 * s;
    const candleX = cx - candleW / 2;
    const candleY = baseY - 190 * s - candleH;
    ctx.fillRect(candleX, candleY, candleW, candleH);
  }, 4);

  return wrapTextParticles(base);
}

// 中空愛心（輪廓 + 文字）－放大版
function shapeHeart() {
  const base = createParticlesFromShape((ctx, w, h, s) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2 + 10 * s;

    // ★ 愛心整體變大：R 從 9.5 調到 11.5
    const R = 11.5;

    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 2; t += 0.02) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      const px = cx + x * R * s;
      const py = cy - y * R * s;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.strokeStyle = "#ff9bd3";
    ctx.lineWidth = 8 * s;        // ★ 線條稍微加粗一點
    ctx.stroke();

    if (HEART_CENTER_TEXT) {
      ctx.fillStyle = "#ffebff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // ★ 中間文字加大：75 → 95
      const fontSize = 95 * s;
      ctx.font =
        `bold ${fontSize}px 'Microsoft JhengHei','Noto Sans TC',sans-serif`;
      ctx.fillText(HEART_CENTER_TEXT, cx, cy);
    }
  }, 4);

  return wrapTextParticles(base);
}


/********* 原版圓形煙火 *********/
function spawnFirework(x, y) {
  const count = 70;
  const baseHue = Math.random() * 360;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 1.8 + Math.random() * 3;
    fireworks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 70 + Math.random() * 25,
      color: `hsl(${(baseHue + Math.random() * 40) % 360}, 100%, 60%)`
    });
  }
}

function spawnRandomFirework() {
  if (!fireworksActive || fireworksIntensity <= 0) return;
  for (let i = 0; i < fireworksIntensity; i++) {
    const x = Math.random() * effectsCanvas.width;
    const y = Math.random() * effectsCanvas.height * 0.6;
    spawnFirework(x, y);
  }
}
setInterval(spawnRandomFirework, 180);

/********* 吹蠟燭的煙 *********/
function spawnSmoke() {
  const w = shapeCanvas.width;
  const h = shapeCanvas.height;
  const centerX = effectsCanvas.width / 2 - w / 2;
  const centerY = effectsCanvas.height / 2 - h / 2;

  const cx = w / 2;
  const baseY = h / 2 + 40 * shapeScale;
  const candleTopX = centerX + cx;
  const candleTopY = centerY + (baseY - 190 * shapeScale - 40 * shapeScale);

  for (let i = 0; i < 35; i++) {
    smokePuffs.push({
      x: candleTopX + (Math.random() - 0.5) * 20 * shapeScale,
      y: candleTopY + (Math.random() - 0.2) * 10 * shapeScale,
      vy: -0.4 - Math.random() * 0.5,
      size: 3 + Math.random() * 3,
      alpha: 0.9
    });
  }
}

/********* 整體繪製循環 *********/
let lastTime = 0;
let flamePulse = 0;

function drawEffects(timestamp) {
  const dt = (timestamp - lastTime) || 16;
  lastTime = timestamp;
  flamePulse += dt / 1000;

  efCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);

  const t = timestamp / 1000;
  const isTextMode =
    currentMode === "countdown" ||
    currentMode === "words" ||
    currentMode === "heart" ||
    currentMode === "cake";

  // 1. 粒子主體
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    if (isTextMode && p.isText) {
      if (p.phase === "appear") {
        const dx = p.baseX - p.x;
        const dy = p.baseY - p.y;
        p.x += dx * 0.10;      // 聚攏速度
        p.y += dy * 0.10;
        p.alpha += 0.05;
        if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
          p.phase = "stable";
        }
      } else if (p.phase === "scatter") {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
      }
    } else if (currentMode === "transition") {
      // 訊息 → 愛心 的由下而上燃燒粒子
      p.y += p.vy;
      p.alpha -= 0.01;
      if (p.alpha <= 0 || p.y < -20) {
        particles.splice(i, 1);
        continue;
      }
    } else {
      // 其他模式粒子維持在 base 位置附近
      p.x = p.baseX;
      p.y = p.baseY;
    }

    const wobbleX = Math.sin(t * 2 + p.seed) * 1.2;
    const wobbleY = Math.cos(t * 2 + p.seed) * 1.2;

    const drawX = p.x + wobbleX;
    const drawY = p.y + wobbleY;

    const alpha =
      p.alpha !== undefined ? Math.max(0, Math.min(p.alpha, 1)) : 1;
    efCtx.globalAlpha = alpha;
    efCtx.fillStyle = p.color;
    efCtx.beginPath();
    efCtx.arc(drawX, drawY, 2.6, 0, Math.PI * 2);
    efCtx.fill();
  }
  efCtx.globalAlpha = 1;

  // 2. 蠟燭煙
  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const s = smokePuffs[i];
    s.y += s.vy;
    s.alpha -= 0.012;
    if (s.alpha <= 0) {
      smokePuffs.splice(i, 1);
      continue;
    }
    efCtx.fillStyle = `rgba(230, 230, 230, ${s.alpha})`;
    efCtx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }

  // 3. 煙火
  if (fireworks.length > 0) {
    efCtx.globalCompositeOperation = "lighter";
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.03;
      f.life--;

      const alpha = Math.max(f.life / 80, 0);
      efCtx.globalAlpha = alpha;
      efCtx.fillStyle = f.color;
      efCtx.beginPath();
      efCtx.arc(f.x, f.y, 2.3, 0, Math.PI * 2);
      efCtx.fill();

      if (f.life <= 0) {
        fireworks.splice(i, 1);
      }
    }
    efCtx.globalAlpha = 1;
    efCtx.globalCompositeOperation = "source-over";
  }

  // 4. 蛋糕火焰（加大＋粉色呼吸）
  if (currentMode === "cake" && !candleBlown) {
    const s = shapeScale;
    const w = shapeCanvas.width;
    const h = shapeCanvas.height;

    const centerX = effectsCanvas.width / 2 - w / 2;
    const centerY = effectsCanvas.height / 2 - h / 2;
    const cx = w / 2;
    const baseY = h / 2 + 40 * s;

    const candleH = 40 * s;
    const candleTopY = centerY + (baseY - 190 * s - candleH);
    const candleTopX = centerX + cx;

    const SIZE = 2.0;
    const pulse = 0.5 + 0.5 * Math.sin(flamePulse * 3);

    efCtx.save();
    efCtx.globalAlpha = 0.7 + 0.3 * pulse;

    efCtx.fillStyle = "#ff99ff";
    efCtx.fillRect(
      candleTopX - 4 * s * SIZE,
      candleTopY - 10 * s * SIZE,
      8 * s * SIZE,
      10 * s * SIZE
    );

    efCtx.fillStyle = "#ffe6ff";
    efCtx.fillRect(
      candleTopX - 3 * s * SIZE,
      candleTopY - 7 * s * SIZE,
      6 * s * SIZE,
      7 * s * SIZE
    );

    efCtx.fillStyle = "#ffffff";
    efCtx.fillRect(
      candleTopX - 2 * s * SIZE,
      candleTopY - 5 * s * SIZE,
      4 * s * SIZE,
      5 * s * SIZE
    );

    efCtx.restore();
  }

  requestAnimationFrame(drawEffects);
}

/***********************
 * 5. 時間 + 流程控制
 ***********************/
let countdownTimer = null;
let sequenceStarted = false;
let micStream = null;
let micAudioCtx = null;
let typewriterTimer = null;
let cursorTimer = null;
let typingDone = false;
let cursorVisible = true;

function format2(n) {
  return n.toString().padStart(2, "0");
}

function showSection(sec) {
  [timeSection, countdownSection, cakeSection, messageSection, heartSection]
    .forEach(s => s.classList.remove("active"));
  sec.classList.add("active");
}

function updateTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const y = now.getFullYear();
  const mon = now.getMonth() + 1;
  const d = now.getDate();

  // 距離目標時間還有幾秒
  const diffMs = targetTime.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // 還沒啟動流程 & 距離目標時間 > 10 秒 => 進入偽裝模式
  const shouldTimeOnly = (!sequenceStarted && diffSec > 10);

  if (shouldTimeOnly) {
    // 偽裝成時間網站：三行
    nowTimeEl.textContent =
      `BEIJING TIME\n` +
      `${y}年${format2(mon)}月${format2(d)}日\n` +
      `${format2(h)}:${format2(m)}:${format2(s)}`;

    document.body.classList.add("time-only");

    // 標題維持北京時間
    if (document.title !== "北京时间 · Beijing Time") {
      document.title = "北京时间 · Beijing Time";
    }

    targetInfoEl.textContent = "";
    distanceTextEl.textContent = "";
    replayBtn.style.display = "none";
    showSection(timeSection);
    return;
  }

  // 正式模式（倒數 / 蛋糕 / 愛心）
  document.body.classList.remove("time-only");

  if (document.title !== "生日快乐 · Birthday Code") {
    document.title = "生日快乐 · Birthday Code";
  }

  // 上方時間只顯示 HH:MM:SS
  nowTimeEl.textContent =
    "BEIJING TIME · " +
    format2(h) + ":" + format2(m) + ":" + format2(s);

  // 目標時間
  const ty = targetTime.getFullYear();
  const tm = targetTime.getMonth() + 1;
  const td = targetTime.getDate();
  const th = targetTime.getHours();
  const tmin = targetTime.getMinutes();
  targetInfoEl.textContent =
    `目标时间：${ty}年${tm}月${td}日 ` +
    `${format2(th)}:${format2(tmin)} （北京时间）`;

  if (diffSec >= 0) {
    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    distanceTextEl.textContent =
      `距离启动还有 ${hours} 小时 ${mins} 分 ${secs} 秒`;

    // 還沒啟動過，且 ≤10 秒，開始整個慶生流程
    if (!sequenceStarted && diffSec <= 10) {
      sequenceStarted = true;
      startSequence(diffSec);
    }
  } else {
    // 已超過目標時間
    distanceTextEl.textContent =
      "生日代码已启动完成，可以使用右下角按钮重播。";

    if (!sequenceStarted) {
      replayBtn.style.display = "inline-flex";
    }
  }
}

/***********************
 * 6. 主流程：倒數 → 祝福文字 → 蛋糕 → 訊息 → 轉場 → 愛心
 ***********************/
function resetForReplay() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (micAudioCtx) {
    micAudioCtx.close();
    micAudioCtx = null;
  }

  particles = [];
  fireworks = [];
  smokePuffs = [];
  fireworksActive = false;
  fireworksIntensity = 0;
  matrixActive = true;
  candleBlown = false;
  typingDone = false;
  cursorVisible = true;

  messageTextEl.textContent = "";
  messageSection.style.opacity = "1";
  messageSection.style.clipPath = "inset(0 0 0 0)";
  replayBtn.style.display = "none";
}

function startSequence(initialSeconds) {
  resetForReplay();
  showSection(countdownSection);
  currentMode = "countdown";

  fireworksActive = false;
  fireworksIntensity = 0;

  let sec = initialSeconds > 0 ? initialSeconds : 10;
  currentNumber = sec;
  particles = shapeNumber(sec);

  countdownTimer = setInterval(() => {
    sec--;
    if (sec >= 0) {
      scatterCurrentText();
      currentNumber = sec;
      particles = particles.concat(shapeNumber(sec));
    }

    if (sec <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      setTimeout(startBigWordsPhase, 200);
    }
  }, 1000);
}

function startBigWordsPhase() {
  currentMode = "words";

  matrixActive = false;
  fireworksActive = true;
  fireworksIntensity = 3;

  let index = 0;

  function showNext() {
    if (index >= BIG_WORDS.length) {
      scatterCurrentText();
      setTimeout(startCakePhase, 1200);
      return;
    }
    scatterCurrentText();
    currentWord = BIG_WORDS[index];
    particles = particles.concat(shapeWord(currentWord));
    index++;
    setTimeout(showNext, 2600);  // 讀字時間拉長一點
  }

  showNext();
}

function startCakePhase() {
  currentMode = "cake";
  showSection(cakeSection);
  particles = shapeCake();
  candleBlown = false;
  smokePuffs = [];

  // 讓煙火繼續放
  fireworksActive = true;
  fireworksIntensity = 3;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        micStream = stream;
        micAudioCtx = new (window.AudioContext ||
          window.webkitAudioContext)();
        const source = micAudioCtx.createMediaStreamSource(stream);
        const analyser = micAudioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);

        function detectBlow() {
          if (candleBlown) return;
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);

          if (rms > 0.2) {
            doBlow();
          } else {
            requestAnimationFrame(detectBlow);
          }
        }

        detectBlow();

        setTimeout(() => {
          if (!candleBlown) doBlow();
        }, 5000);
      })
      .catch(() => {
        setTimeout(() => {
          if (!candleBlown) doBlow();
        }, 5000);
      });
  } else {
    setTimeout(() => {
      if (!candleBlown) doBlow();
    }, 5000);
  }
}

function doBlow() {
  candleBlown = true;
  spawnSmoke(); // 熄滅煙

  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (micAudioCtx) {
    micAudioCtx.close();
    micAudioCtx = null;
  }

  // 0.5 秒後蛋糕粒子才開始消散
  setTimeout(() => {
    scatterCurrentText();
  }, 1000);

  // 再晚一點點再進入訊息
  setTimeout(startMessagePhase, 2000);
}

/********* 訊息（打字 + 游標） *********/
function startMessagePhase() {
  currentMode = "message";
  showSection(messageSection);

  matrixActive = false;
  fireworksActive = false;
  fireworksIntensity = 0;
  fireworks = [];
  particles = [];

  messageSection.style.opacity = "1";
  messageSection.style.clipPath = "inset(0 0 0 0)";

  const text = MESSAGE_TEXT;
  let idx = 0;
  typingDone = false;
  cursorVisible = true;

  function renderText() {
    const visibleText = text.slice(0, idx);
    const cursorChar = typingDone ? "" : (cursorVisible ? "▋" : "");
    messageTextEl.textContent = visibleText + cursorChar;
  }

  const baseSpeed = 65;
  const punctuationSet = "，。？！、…\n";

  function typeNext() {
    if (idx <= text.length) {
      idx++;
      const ch = text.charAt(idx - 1);
      renderText();

      let delay = baseSpeed;
      if (punctuationSet.includes(ch)) {
        if (ch === "\n") delay = baseSpeed * 4;
        else if (ch === "…") delay = baseSpeed * 3;
        else delay = baseSpeed * 2.2;
      }

      typewriterTimer = setTimeout(typeNext, delay);
    } else {
      typingDone = true;
      renderText();
      if (cursorTimer) {
        clearInterval(cursorTimer);
        cursorTimer = null;
      }
      typewriterTimer = setTimeout(startMessageToHeartTransition, 1200);
    }
  }

  cursorTimer = setInterval(() => {
    if (typingDone) return;
    cursorVisible = !cursorVisible;
    renderText();
  }, 450);

  typeNext();
}

/********* 訊息 → 愛心 的「由下而上燃燒」轉場 *********/
function startMessageToHeartTransition() {
  currentMode = "transition";

  if (typewriterTimer) {
    clearTimeout(typewriterTimer);
    typewriterTimer = null;
  }
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
  typingDone = true;
  cursorVisible = false;

  // 由下往上燃燒的粒子
  particles = [];
  const width = effectsCanvas.width * 0.7;
  const left = effectsCanvas.width * 0.15;
  const bottom = effectsCanvas.height * 0.55;
  const heightRegion = effectsCanvas.height * 0.35;

  const count = Math.floor((width * heightRegion) / 9000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: left + Math.random() * width,
      y: bottom + Math.random() * heightRegion,
      baseX: 0,
      baseY: 0,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.8 - Math.random() * 1.0,
      alpha: 0.9,
      color: `rgba(255, ${120 + Math.random() * 80}, ${80 + Math.random() * 40}, 1)`,
      seed: Math.random() * Math.PI * 2,
      isText: false
    });
  }

  const duration = 1700;
  const start = performance.now();

  function step(now) {
    let t = (now - start) / duration;
    if (t > 1) t = 1;

    const percent = t * 100;
    messageSection.style.clipPath = `inset(0 0 ${percent}% 0)`; // bottom 往上
    messageSection.style.opacity = String(1 - t * 0.9);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      messageSection.style.opacity = "0";
      startHeartPhase();
    }
  }

  requestAnimationFrame(step);
}

function startHeartPhase() {
  currentMode = "heart";
  showSection(heartSection);

  fireworksActive = false;
  fireworksIntensity = 0;
  fireworks = [];
  matrixActive = true;

  particles = shapeHeart();
  replayBtn.style.display = "inline-flex";
}

/***********************
 * 7. 重播按鈕
 ***********************/
replayBtn.addEventListener("click", () => {
  sequenceStarted = true;  // 之後就不再進入偽裝模式
  startSequence(10);
});

/***********************
 * 8. 初始化 & RWD
 ***********************/
function resizeEffectsCanvas() {
  effectsCanvas.width = window.innerWidth;
  effectsCanvas.height = window.innerHeight;

  if (currentMode === "countdown" && currentNumber !== null) {
    particles = shapeNumber(currentNumber);
  } else if (currentMode === "words" && currentWord) {
    particles = shapeWord(currentWord);
  } else if (currentMode === "cake") {
    particles = shapeCake();
  } else if (currentMode === "heart") {
    particles = shapeHeart();
  }
}

window.addEventListener("load", () => {
  resizeMatrixCanvas();
  resizeEffectsCanvas();
  drawMatrix();
  drawEffects(0);
  updateTime();
  setInterval(updateTime, 1000);
});

window.addEventListener("resize", () => {
  resizeMatrixCanvas();
  resizeEffectsCanvas();
});


