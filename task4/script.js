// Состояние игры
let secretNumber = '';
let history = []; // { guess: '1234', bulls: 1, cows: 2 }
let attempts = 0;
let gameOver = false;

// Ссылки на DOM-элементы
const input = document.getElementById('guess-input');
const checkBtn = document.getElementById('check-btn');
const newGameBtn = document.getElementById('new-game-btn');
const errorMsg = document.getElementById('error-msg');
const winMsg = document.getElementById('win-msg');
const attemptsCount = document.getElementById('attempts-count');
const historyList = document.getElementById('history-list');

// Генерирует случайное 4-значное число с неповторяющимися цифрами (в виде строки)
function generateSecretNumber() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Перемешиваем массив цифр (алгоритм Фишера-Йейтса)
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  // Первая цифра не должна быть 0, чтобы число было "честным" 4-значным
  if (digits[0] === '0') {
    [digits[0], digits[1]] = [digits[1], digits[0]];
  }

  return digits.slice(0, 4).join('');
}

// Проверяет корректность ввода игрока. Возвращает строку с ошибкой или null, если всё в порядке
function validateGuess(guess) {
  if (!/^\d{4}$/.test(guess)) {
    return 'Нужно ввести ровно 4 цифры (без букв и символов).';
  }

  const uniqueDigits = new Set(guess.split(''));
  if (uniqueDigits.size !== 4) {
    return 'Все 4 цифры должны быть разными.';
  }

  return null;
}

// Считает быков (совпадение цифры и позиции) и коров (цифра есть, но не на своём месте)
function countBullsAndCows(secret, guess) {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows };
}

// Отрисовка истории попыток на основе массива history
function render() {
  historyList.innerHTML = '';

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const guessSpan = document.createElement('span');
    guessSpan.className = 'guess';
    guessSpan.textContent = entry.guess;

    const resultSpan = document.createElement('span');
    resultSpan.textContent = `${entry.bulls} ${declineBulls(entry.bulls)}, ${entry.cows} ${declineCows(entry.cows)}`;

    li.appendChild(guessSpan);
    li.appendChild(resultSpan);
    historyList.appendChild(li);
  });

  attemptsCount.textContent = attempts;
}

// Склонение слова "бык" под число
function declineBulls(n) {
  if (n === 1) return 'бык';
  if (n >= 2 && n <= 4) return 'быка';
  return 'быков';
}

// Склонение слова "корова" под число
function declineCows(n) {
  if (n === 1) return 'корова';
  if (n >= 2 && n <= 4) return 'коровы';
  return 'коров';
}

// Обработка одной попытки
function handleGuess() {
  if (gameOver) return;

  const guess = input.value.trim();
  const error = validateGuess(guess);

  if (error) {
    errorMsg.textContent = error;
    errorMsg.classList.remove('hidden');
    return;
  }

  errorMsg.classList.add('hidden');

  const { bulls, cows } = countBullsAndCows(secretNumber, guess);
  attempts++;
  history.push({ guess, bulls, cows });

  if (bulls === 4) {
    gameOver = true;
    winMsg.textContent = `Победа! Угадано за ${attempts} ${declineAttempts(attempts)}.`;
    winMsg.classList.remove('hidden');
    input.disabled = true;
    checkBtn.disabled = true;
  }

  input.value = '';
  render();
}

// Склонение слова "попытка" под число
function declineAttempts(n) {
  const lastDigit = n % 10;
  const lastTwo = n % 100;

  if (lastTwo >= 11 && lastTwo <= 14) return 'попыток';
  if (lastDigit === 1) return 'попытку';
  if (lastDigit >= 2 && lastDigit <= 4) return 'попытки';
  return 'попыток';
}

// Сброс игры
function startNewGame() {
  secretNumber = generateSecretNumber();
  history = [];
  attempts = 0;
  gameOver = false;

  input.value = '';
  input.disabled = false;
  checkBtn.disabled = false;
  errorMsg.classList.add('hidden');
  winMsg.classList.add('hidden');

  render();
}

// Обработчики событий
checkBtn.addEventListener('click', handleGuess);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleGuess();
  }
});

newGameBtn.addEventListener('click', startNewGame);

// Запуск игры при загрузке страницы
startNewGame();
