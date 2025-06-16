let isRunning = false;
let timeoutId = null;
let animationFrameId = null;

let phases = [
  { text: "Breathe in", className: "grow", duration: 4000 },
  { text: "Hold", className: "grow", duration: 4000 },
  { text: "Breathe out", className: "shrink", duration: 4000 }
];

let currentStep = 0;
let stepStartTime = 0;
let stepRemaining = phases[currentStep].duration;

const BASE_RADIUS = 125;
const OFFSET = 20;
const SCALE_GROW = 1.2;

const TOTAL_CYCLE_DURATION = 12000;

const text = document.getElementById("text");
const container = document.getElementById("container");
const glow = container.querySelector(".glow-circle");

const pointer = document.querySelector(".pointer");
const pointerRotator = document.querySelector(".pointer-rotator");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

let cycleStartTime = 0;
let rotationOffset = 0; // total ms of rotation elapsed before pause

// --- Rotation logic ---
function setPointerRadius(scale) {
  const distance = BASE_RADIUS * scale + OFFSET;
  pointer.style.top = `-${distance}px`;
}

function updatePointerRotation() {
  if (!isRunning) return;

  const now = performance.now();
  const elapsed = now - cycleStartTime + rotationOffset;
  const progress = (elapsed % TOTAL_CYCLE_DURATION) / TOTAL_CYCLE_DURATION;
  const angle = progress * 360;

  pointerRotator.style.transform = `rotate(${angle}deg)`;

  animationFrameId = requestAnimationFrame(updatePointerRotation);
}

// --- Breathing control ---
function startBreathing() {
  if (isRunning) return;

  isRunning = true;
  currentStep = 0;
  stepRemaining = phases[currentStep].duration;

  container.classList.add("active");
  glow.style.animationPlayState = "running";
  container.style.animationPlayState = "running";

  setPointerRadius(SCALE_GROW);

  rotationOffset = 0;
  cycleStartTime = performance.now();
  updatePointerRotation();

  performStep();
}

function performStep() {
  if (!isRunning) return;

  const phase = phases[currentStep];
  text.textContent = phase.text;

  container.classList.remove("grow", "shrink");
  container.classList.add(phase.className);

  container.style.animationPlayState = "running";
  glow.style.animationPlayState = "running";

  setPointerRadius(SCALE_GROW); // Always fixed outer orbit

  stepStartTime = performance.now();

  timeoutId = setTimeout(() => {
    currentStep = (currentStep + 1) % phases.length;
    stepRemaining = phases[currentStep].duration;
    performStep();
  }, stepRemaining);
}

function pauseBreathing() {
  if (!isRunning) return;

  // Stop phase timer
  clearTimeout(timeoutId);
  timeoutId = null;

  // Capture how much time has passed in this cycle
  const now = performance.now();
  rotationOffset += now - cycleStartTime;

  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;

  const elapsed = now - stepStartTime;
  stepRemaining -= elapsed;

  container.style.animationPlayState = "paused";
  glow.style.animationPlayState = "paused";

  text.textContent = "Paused";
  isRunning = false;

  pauseBtn.textContent = "Resume";
  pauseBtn.onclick = resumeBreathing;
}

function resumeBreathing() {
  if (isRunning) return;

  isRunning = true;

  const phase = phases[currentStep];
  text.textContent = phase.text;

  container.classList.remove("grow", "shrink");
  container.classList.add(phase.className);

  container.style.animationPlayState = "running";
  glow.style.animationPlayState = "running";

  setPointerRadius(SCALE_GROW);

  stepStartTime = performance.now();

  timeoutId = setTimeout(() => {
    currentStep = (currentStep + 1) % phases.length;
    stepRemaining = phases[currentStep].duration;
    performStep();
  }, stepRemaining);

  // Resume rotation from where it left off
  cycleStartTime = performance.now();
  updatePointerRotation();

  pauseBtn.textContent = "Pause";
  pauseBtn.onclick = pauseBreathing;
}

function stopBreathing() {
  clearTimeout(timeoutId);
  cancelAnimationFrame(animationFrameId);

  timeoutId = null;
  animationFrameId = null;
  isRunning = false;

  text.textContent = "Click Start";

  container.classList.remove("grow", "shrink", "active");
  container.style.animationPlayState = "running";
  glow.style.animationPlayState = "running";

  pointerRotator.style.transform = "rotate(0deg)";
  setPointerRadius(SCALE_GROW);

  rotationOffset = 0;

  pauseBtn.textContent = "Pause";
  pauseBtn.onclick = pauseBreathing;
}

startBtn.onclick = startBreathing;
pauseBtn.onclick = pauseBreathing;
stopBtn.onclick = stopBreathing;
