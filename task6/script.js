'use strict';

/* =====================================================================
   1. КОНСТАНТЫ
   Параметры поля и скорости. Вынесены отдельно, чтобы не было
   «магических чисел» в коде и их было легко поменять.
   ===================================================================== */

const CELL_SIZE = 20;       // размер одной клетки в пикселях
const GRID_SIZE = 20;       // поле 20×20 клеток (20 * 20px = 400px — размер canvas)
const MOVE_INTERVAL = 150;  // moveInterval: змейка делает шаг раз в 150 мс

// Направления движения: смещение по x и y за один шаг.
// Ось y в canvas направлена вниз, поэтому «вверх» — это y: -1.
const DIRECTIONS = {
  ArrowUp:    { x: 0,  y: -1 },
  ArrowDown:  { x: 0,  y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1,  y: 0 },
};

/* =====================================================================
   2. ЭЛЕМЕНТЫ СТРАНИЦЫ
   Находим их один раз при загрузке, а не при каждом кадре.
   ===================================================================== */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');           // 2D-контекст — через него рисуем
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');     // окно «Игра окончена»
const finalScoreEl = document.getElementById('final-score'); // итоговый счёт в окне
const restartBtn = document.getElementById('restart-btn');   // кнопка «Начать заново»

/* =====================================================================
   3. СОСТОЯНИЕ ИГРЫ
   Всё, что меняется во время игры, хранится в одном объекте state.
   Функции update() меняют state, а draw() только читает его и рисует.
   Конкретные значения заполняет resetGame().
   ===================================================================== */

const state = {
  snake: [],          // массив сегментов {x, y} в клетках; snake[0] — голова
  direction: null,    // текущее направление, в котором змейка реально движется
  nextDirection: null,// направление, выбранное игроком; применяется на следующем шаге
  apple: null,        // координаты яблока {x, y}
  score: 0,           // счёт
  gameOver: false,    // флаг конца игры
  lastMoveTime: 0,    // lastMoveTime: момент времени (мс) последнего шага змейки
};

// Номер текущего запроса requestAnimationFrame.
// Нужен, чтобы при необходимости остановить цикл через cancelAnimationFrame.
let animationId = null;

/* =====================================================================
   4. ПОДГОТОВКА НОВОЙ ИГРЫ
   ===================================================================== */

// resetGame() — возвращает состояние к началу игры.
function resetGame() {
  // Змейка из 3 сегментов в центре поля, голова смотрит вправо
  state.snake = [
    { x: 10, y: 10 }, // голова
    { x: 9,  y: 10 },
    { x: 8,  y: 10 }, // хвост
  ];
  state.direction = DIRECTIONS.ArrowRight;
  state.nextDirection = DIRECTIONS.ArrowRight;
  state.score = 0;
  state.gameOver = false;
  // performance.now() — то же «время», что приходит в колбэк requestAnimationFrame
  state.lastMoveTime = performance.now();

  spawnApple();       // кладём первое яблоко
  updateScore();      // показываем 0 в HTML
}

// spawnApple() — ставит яблоко в случайную СВОБОДНУЮ клетку (не на змейку).
function spawnApple() {
  // Собираем список всех клеток, которые не заняты змейкой
  const freeCells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // some() вернёт true, если хотя бы один сегмент стоит в клетке (x, y)
      const isBusy = state.snake.some((part) => part.x === x && part.y === y);
      if (!isBusy) {
        freeCells.push({ x, y });
      }
    }
  }

  // Если свободных клеток нет — змейка заняла всё поле, игра закончена (победа)
  if (freeCells.length === 0) {
    state.apple = null;
    state.gameOver = true;
    return;
  }

  // Выбираем случайную клетку из свободных: так яблоко гарантированно
  // не окажется на змейке, и не нужен цикл «генерируй, пока не повезёт»
  const index = Math.floor(Math.random() * freeCells.length);
  state.apple = freeCells[index];
}

// updateScore() — выводит счёт в HTML-элемент рядом с полем
function updateScore() {
  scoreEl.textContent = state.score;
}

/* =====================================================================
   5. ЛОГИКА (update) — меняет состояние, ничего не рисует
   ===================================================================== */

// moveSnake() — сдвигает змейку на одну клетку в текущем направлении.
function moveSnake() {
  const head = state.snake[0];
  // Новая голова — клетка рядом со старой головой по направлению движения
  const newHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y,
  };

  // Добавляем новую голову в начало массива
  state.snake.unshift(newHead);

  // Проверяем, съела ли змейка яблоко
  const ateApple = state.apple && newHead.x === state.apple.x && newHead.y === state.apple.y;

  if (ateApple) {
    // Хвост НЕ удаляем — так змейка становится длиннее на 1 сегмент
    state.score += 1;
    updateScore();
    spawnApple();
  } else {
    // Обычный шаг: удаляем последний сегмент, длина не меняется
    state.snake.pop();
  }
}

// checkCollision() — true, если голова врезалась в стену или в свой хвост.
function checkCollision() {
  const head = state.snake[0];

  // Столкновение со стеной: голова вышла за пределы 0..GRID_SIZE-1
  const hitWall = head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;

  // Столкновение с собой: голова совпала с любым другим сегментом.
  // slice(1) — все сегменты, кроме самой головы.
  const hitSelf = state.snake
    .slice(1)
    .some((part) => part.x === head.x && part.y === head.y);

  return hitWall || hitSelf;
}

// update() — один шаг игры
function update() {
  // Применяем направление, выбранное игроком с прошлого шага
  state.direction = state.nextDirection;

  moveSnake();

  // После шага проверяем столкновения
  if (checkCollision()) {
    state.gameOver = true;
  }
}

/* =====================================================================
   6. ОТРИСОВКА (draw) — только рисует текущее состояние
   ===================================================================== */

// drawCell() — закрашивает одну клетку сетки (переводим клетки в пиксели)
function drawCell(cell, color) {
  ctx.fillStyle = color;
  // -1 по ширине и высоте даёт тонкий зазор между сегментами
  ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
}

function draw() {
  // 1) Очищаем всё поле, иначе останутся следы прошлых кадров
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2) Яблоко — красный круг в центре своей клетки
  if (state.apple) {
    const centerX = state.apple.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = state.apple.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(centerX, centerY, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) Змейка: голова ярче, тело темнее
  state.snake.forEach((part, index) => {
    drawCell(part, index === 0 ? '#8be38b' : '#4caf50');
  });
}

/* =====================================================================
   7. ИГРОВОЙ ЦИКЛ — только requestAnimationFrame
   Браузер вызывает gameLoop примерно 60 раз в секунду и передаёт
   timestamp — время в миллисекундах. Рисуем каждый кадр, а змейку
   двигаем, только если с прошлого шага прошло не меньше MOVE_INTERVAL.
   Так скорость змейки не зависит от частоты кадров монитора.
   ===================================================================== */

function gameLoop(timestamp) {
  // Прошло ли 150 мс с последнего шага?
  if (timestamp - state.lastMoveTime >= MOVE_INTERVAL) {
    state.lastMoveTime = timestamp;
    update();
  }

  draw();

  // Если игра закончилась — больше не просим новый кадр, цикл останавливается,
  // и показываем окно с итоговым счётом
  if (state.gameOver) {
    animationId = null;
    showGameOver();
    return;
  }

  // Просим браузер вызвать gameLoop перед следующей перерисовкой
  animationId = requestAnimationFrame(gameLoop);
}

// startGame() — сбрасывает состояние и запускает цикл.
// Используется и для первого запуска, и для рестарта.
function startGame() {
  // Защита от двух циклов одновременно: если предыдущий цикл ещё
  // запланирован (animationId не null), отменяем его перед запуском нового.
  // Без этого каждый рестарт добавлял бы ещё один gameLoop, и змейка
  // ускорялась бы (update вызывался бы из нескольких циклов).
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  resetGame();
  hideGameOver();
  draw();
  animationId = requestAnimationFrame(gameLoop);
}

/* =====================================================================
   8. ОКНО «ИГРА ОКОНЧЕНА» И РЕСТАРТ
   ===================================================================== */

// showGameOver() — показывает окно и записывает в него итоговый счёт
function showGameOver() {
  finalScoreEl.textContent = state.score;
  gameOverEl.hidden = false;
  restartBtn.focus(); // фокус на кнопку — можно перезапустить клавишей Enter
}

// hideGameOver() — прячет окно при новой игре
function hideGameOver() {
  gameOverEl.hidden = true;
}

// Кнопка «Начать заново» запускает новую игру без перезагрузки страницы
restartBtn.addEventListener('click', startGame);

/* =====================================================================
   9. УПРАВЛЕНИЕ С КЛАВИАТУРЫ
   ===================================================================== */

document.addEventListener('keydown', (event) => {
  const newDirection = DIRECTIONS[event.key];

  // Нажата не стрелка — ничего не делаем
  if (!newDirection) return;

  // Стрелки по умолчанию прокручивают страницу — отменяем это
  event.preventDefault();

  if (state.gameOver) return;

  // Разворот на 180° игнорируем: противоположное направление — это
  // когда сумма векторов равна нулю (например, вправо {1,0} + влево {-1,0}).
  // Сравниваем именно с state.direction (реальным направлением движения),
  // а не с nextDirection: иначе быстрое «вверх, затем влево» при движении
  // вправо развернуло бы змейку в саму себя за один шаг.
  const isOpposite =
    newDirection.x + state.direction.x === 0 &&
    newDirection.y + state.direction.y === 0;

  if (!isOpposite) {
    state.nextDirection = newDirection;
  }
});

/* =====================================================================
   10. ЗАПУСК
   ===================================================================== */

startGame();
