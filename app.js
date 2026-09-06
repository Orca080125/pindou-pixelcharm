const actions = {
  attention: { name: '立正', hint: '抬头、挺胸、双脚并拢', key: '1', icon: '◆', still: [0, 0] },
  atEase: { name: '跨立', hint: '左脚跨出，双手背后', key: '2', icon: '✦', still: [1, 0] },
  left: { name: '向左转', hint: '左脚跟与右脚前掌为轴，转体靠脚', key: '←', icon: '←' },
  right: { name: '向右转', hint: '右脚跟与左脚前掌为轴，转体靠脚', key: '→', icon: '→' },
  march: { name: '齐步走', hint: '左右腿交替，摆臂自然', key: '5', icon: '♟' },
  goose: { name: '正步走', hint: '左右腿交替，绷直腿部，脚尖下压', key: '6', icon: '★' },
};

const soundFiles = {
  attention: 'audio/attention.wav',
  atEase: 'audio/at-ease.wav',
  left: 'audio/turn-left.wav',
  right: 'audio/turn-right.wav',
  march: 'audio/march.wav',
  goose: 'audio/goose.wav',
  trainingEnd: 'audio/training-end.wav',
};

const sounds = Object.fromEntries(Object.entries(soundFiles).map(([id, path]) => {
  const audio = new Audio(path);
  audio.preload = 'auto';
  audio.playsInline = true;
  return [id, audio];
}));

const ids = Object.keys(actions);
const keys = { '1': 'attention', '2': 'atEase', ArrowLeft: 'left', ArrowRight: 'right', '5': 'march', '6': 'goose' };
const lionLayers = [document.querySelector('#lion-a'), document.querySelector('#lion-b')];
const stack = document.querySelector('#lion-stack');
const nameEl = document.querySelector('#action-name');
const enEl = document.querySelector('#action-en');
const hintEl = document.querySelector('#action-hint');

let current = 'attention';
let frame = 0;
let animationTimer = null;
let activeLayer = 0;
let transitionGeneration = 0;
let gameTimer = null;
let activeAudio = null;
let game = false;
let target = null;
let score = 0;
let streak = 0;
let time = 30;

function playSound(id) {
  const audio = sounds[id];
  if (!audio) return;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  activeAudio = audio;
  audio.currentTime = 0;
  const started = audio.play();
  if (started) started.catch(() => flash('请点击右上角扬声器启用声音', 'bad', 1800));
}

function stopAnimation() {
  clearInterval(animationTimer);
  animationTimer = null;
  frame = 0;
}

function configureLion(lion) {
  lion.className = 'lion is-hidden';
  lion.style.transform = '';

  if (current === 'attention' || current === 'atEase') {
    lion.classList.add('still');
    const [x, y] = actions[current].still;
    lion.style.backgroundPosition = `${x / 3 * 100}% ${y * 100}%`;
  } else if (current === 'left' || current === 'right') {
    if (frame === 0) {
      lion.classList.add('still');
      lion.style.backgroundPosition = '0% 0%';
    } else {
      lion.classList.add('turn');
      lion.style.backgroundPosition = `${frame / 3 * 100}% ${current === 'left' ? 100 : 0}%`;
    }
  } else if (current === 'march') {
    lion.classList.add('march');
    if (frame >= 2) lion.classList.add('opposite');
    lion.style.backgroundPosition = `${(frame % 2) * 100}% 0%`;
  } else {
    lion.classList.add('goose');
    lion.style.backgroundPosition = `${(frame % 2) * 100}% ${Math.floor(frame / 2) * 100}%`;
  }
}

function draw(animate = false) {
  const action = actions[current];
  nameEl.textContent = action.name;
  enEl.textContent = current.toUpperCase();
  hintEl.textContent = action.hint;
  document.querySelectorAll('.action').forEach((button) => button.classList.toggle('selected', button.dataset.id === current));
  stack.className = 'lion-stack';
  if (current === 'left' || current === 'right') stack.classList.add('turn-stack');
  if (current === 'march') stack.classList.add('march-stack');
  if (current === 'goose') stack.classList.add('goose-stack');

  const generation = ++transitionGeneration;
  if (!animate) {
    configureLion(lionLayers[activeLayer]);
    lionLayers[activeLayer].classList.remove('is-hidden');
    lionLayers[1 - activeLayer].classList.add('is-hidden');
    return;
  }

  const previous = lionLayers[activeLayer];
  const nextLayer = 1 - activeLayer;
  const next = lionLayers[nextLayer];
  configureLion(next);
  void next.offsetWidth;
  requestAnimationFrame(() => {
    if (generation !== transitionGeneration) return;
    previous.classList.add('is-hidden');
    next.classList.remove('is-hidden');
    activeLayer = nextLayer;
  });
}

function act(id) {
  current = id;
  stopAnimation();
  draw(true);
  if (id === 'left' || id === 'right') {
    animationTimer = setInterval(() => {
      if (frame >= 3) {
        clearInterval(animationTimer);
        return;
      }
      frame++;
      draw(true);
    }, 175);
  } else if (id === 'march' || id === 'goose') {
    animationTimer = setInterval(() => {
      frame = (frame + 1) % 4;
      draw(true);
    }, id === 'march' ? 230 : 260);
  }

  if (game && target) {
    if (id === target) {
      score += 100 + streak * 20;
      streak++;
      flash('指令正确  +100', 'ok');
      nextTarget();
    } else {
      streak = 0;
      flash('再看清口令', 'bad');
    }
    updateMetrics();
  }
}

function flash(text, type, duration = 480) {
  const element = document.querySelector('#result');
  element.textContent = text;
  element.className = `result show ${type}`;
  setTimeout(() => { element.className = 'result'; }, duration);
}

function nextTarget() {
  const pool = ids.filter((id) => id !== target);
  target = pool[Math.floor(Math.random() * pool.length)];
  document.querySelector('#target').textContent = `${actions[target].name}！`;
  playSound(target);
}

function updateMetrics() {
  document.querySelector('#time').textContent = `${time}s`;
  document.querySelector('#score').textContent = score;
  document.querySelector('#streak').textContent = `${streak}x`;
}

function startGame() {
  clearInterval(gameTimer);
  game = true;
  score = 0;
  streak = 0;
  time = 30;
  document.querySelector('#challenge-idle').hidden = true;
  document.querySelector('#challenge-running').hidden = false;
  document.querySelector('#start').textContent = '▶ 重新开始';
  updateMetrics();
  nextTarget();
  gameTimer = setInterval(() => {
    time--;
    updateMetrics();
    if (time <= 0) {
      clearInterval(gameTimer);
      game = false;
      target = null;
      playSound('trainingEnd');
      document.querySelector('#challenge-idle').innerHTML = `训练结束<br>本次得分：${score}`;
      document.querySelector('#challenge-idle').hidden = false;
      document.querySelector('#challenge-running').hidden = true;
      document.querySelector('#start').textContent = '▶ 再来一次';
    }
  }, 1000);
}

document.querySelector('#buttons').innerHTML = ids.map((id) => `<button class="action" data-id="${id}"><span>${actions[id].icon}</span><b>${actions[id].name}</b><kbd>${actions[id].key}</kbd></button>`).join('');
document.querySelector('#buttons').addEventListener('click', (event) => {
  const button = event.target.closest('.action');
  if (button) act(button.dataset.id);
});
document.querySelector('#speak').onclick = () => playSound(current);
document.querySelector('#reset').onclick = () => act('attention');
document.querySelector('#start').onclick = startGame;
document.querySelector('#target').onclick = () => target && playSound(target);
window.addEventListener('keydown', (event) => {
  if (keys[event.key]) {
    event.preventDefault();
    act(keys[event.key]);
  }
});
draw();
