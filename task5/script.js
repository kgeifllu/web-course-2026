// Состояние игры хранится здесь, а не угадывается через CSS-классы
const state = {
  sequence: [],       // полная последовательность раунда, например [2, 0, 3]
  playerStep: 0,       // на каком шаге последовательности сейчас игрок
  isShowingSequence: false, // true, пока компьютер показывает — клики игнорируются
  isGameActive: false
};

const pads = [
  document.getElementById('pad-0'),
  document.getElementById('pad-1'),
  document.getElementById('pad-2'),
  document.getElementById('pad-3')
];

const startBtn = document.getElementById('start-btn');
const levelCount = document.getElementById('level-count');
const message = document.getElementById('message');

// Обёртка над setTimeout в виде Promise — позволяет писать показ последовательности
// через async/await вместо вложенных колбэков, и таймер гарантированно завершается сам
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Подсвечивает одну кнопку на время, затем убирает подсветку
async function flashPad(index) {
  pads[index].classList.add('active');
  await wait(400);
  pads[index].classList.remove('active');
  await wait(200);
}

// Добавляет один случайный шаг к последовательности
function addRandomStep() {
  const randomIndex = Math.floor(Math.random() * 4);
  state.sequence.push(randomIndex);
}

// Показывает всю текущую последовательность по очереди, с паузами
async function playSequence() {
  state.isShowingSequence = true;
  setPadsDisabled(true);

  for (const index of state.sequence) {
    await flashPad(index);
  }

  state.isShowingSequence = false;
  state.playerStep = 0;
  setPadsDisabled(false);
}

// Включает/выключает кликабельность кнопок
function setPadsDisabled(disabled) {
  pads.forEach(pad => {
    pad.disabled = disabled;
  });
}

// Проверяет шаг игрока и решает, что делать дальше
function handlePlayerClick(index) {
  if (state.isShowingSequence || !state.isGameActive) {
    return;
  }

  const expected = state.sequence[state.playerStep];

  if (index !== expected) {
    endGame();
    return;
  }

  state.playerStep++;

  if (state.playerStep === state.sequence.length) {
    // Игрок верно повторил весь раунд — переходим к следующему
    levelCount.textContent = state.sequence.length;
    message.textContent = 'Верно! Следующий раунд...';
    nextRound();
  }
}

// Запускает следующий раунд: добавляет шаг и снова показывает всю последовательность
async function nextRound() {
  addRandomStep();
  await wait(600);
  message.textContent = '';
  await playSequence();
}

// Завершение игры при ошибке
function endGame() {
  state.isGameActive = false;
  const reachedLevel = state.sequence.length - 1;
  message.textContent = `Вы дошли до уровня ${reachedLevel}.`;
  setPadsDisabled(true);
  startBtn.disabled = false;
}

// Запуск новой игры
async function startGame() {
  state.sequence = [];
  state.playerStep = 0;
  state.isGameActive = true;
  levelCount.textContent = '0';
  message.textContent = 'Смотри внимательно...';
  startBtn.disabled = true;

  await nextRound();
}

// Обработчики событий
startBtn.addEventListener('click', startGame);

pads.forEach(pad => {
  pad.addEventListener('click', () => {
    const index = Number(pad.dataset.index);
    handlePlayerClick(index);
  });
});
