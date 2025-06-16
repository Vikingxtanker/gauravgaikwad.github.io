const container = document.getElementById('container');
const text = document.getElementById('text');
const pointerContainer = document.querySelector('.pointer-container');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');

let breatheInterval;
let isPaused = false;

function startBreathing() {
  clearInterval(breatheInterval);
  isPaused = false;

  // Start rotation
  pointerContainer.classList.add('rotate');

  animate();
  breatheInterval = setInterval(animate, 12000);
}

function animate() {
  text.innerText = 'Breathe In';
  container.className = 'container grow';
  
  setTimeout(() => {
    text.innerText = 'Hold';
  }, 4000);

  setTimeout(() => {
    text.innerText = 'Breathe Out';
    container.className = 'container shrink';
  }, 8000);
}

function pauseBreathing() {
  if (isPaused) return;
  isPaused = true;

  // Pause rotation
  pointerContainer.style.animationPlayState = 'paused';
  clearInterval(breatheInterval);
}

function stopBreathing() {
  pauseBreathing();

  // Stop rotation
  pointerContainer.classList.remove('rotate');
  
  container.className = 'container';
  text.innerText = '';
}

startBtn.addEventListener('click', startBreathing);
pauseBtn.addEventListener('click', pauseBreathing);
stopBtn.addEventListener('click', stopBreathing);
