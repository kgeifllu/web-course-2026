'use strict';

/* =====================================================================
   1. КОНСТАНТЫ
   ===================================================================== */

const API_URL = 'https://jsonplaceholder.typicode.com/posts';
const LIMIT = 10;       // размер одной порции (параметр _limit)
const MAX_POSTS = 100;  // всего постов в API; после них загрузка прекращается

/* =====================================================================
   2. ЭЛЕМЕНТЫ СТРАНИЦЫ
   ===================================================================== */

const postsEl = document.getElementById('posts');       // контейнер карточек
const counterEl = document.getElementById('counter');   // «Показано N из M»
const loaderEl = document.getElementById('loader');     // «Загрузка…»
const endEl = document.getElementById('end');           // «Больше постов нет»
const sentinelEl = document.getElementById('sentinel'); // элемент-сторож внизу ленты
const searchInput = document.getElementById('search-input'); // поле поиска
const emptyEl = document.getElementById('empty');            // «ничего не найдено»
const errorEl = document.getElementById('error');            // блок ошибки
const errorTextEl = document.getElementById('error-text');   // текст ошибки
const retryBtn = document.getElementById('retry-btn');       // кнопка «Повторить»

const SEARCH_DELAY = 300; // задержка дебаунса поиска, мс

/* =====================================================================
   3. СОСТОЯНИЕ
   Все загруженные посты лежат в ОДНОМ массиве state.posts.
   Страница всегда рисуется из этого массива функцией renderPosts().
   ===================================================================== */

const state = {
  posts: [],                 // все загруженные посты
  isLoading: false,          // идёт ли сейчас запрос
  hasMore: true,             // есть ли ещё посты на сервере
  requestedStarts: new Set(),// значения _start, которые уже запрошены (или запрашиваются)
  searchQuery: '',           // текущий поисковый запрос (в нижнем регистре)
};

/* =====================================================================
   4. ЗАГРУЗКА ПОРЦИИ ПОСТОВ (async/await + try/catch)
   ===================================================================== */

async function loadPosts() {
  // Защита от повторной загрузки:
  // 1) если запрос уже идёт — второй не начинаем;
  // 2) если посты кончились — грузить нечего.
  if (state.isLoading || !state.hasMore) return;

  // _start — сколько постов пропустить. Это ровно количество уже загруженных.
  const start = state.posts.length;

  // 3) если порция с таким _start уже была запрошена — не запрашиваем её снова
  //    (иначе в массиве могли бы оказаться дубликаты одних и тех же постов)
  if (state.requestedStarts.has(start)) return;

  state.isLoading = true;
  state.requestedStarts.add(start);
  loaderEl.hidden = false; // показываем «Загрузка…»
  hideError();             // прячем прошлую ошибку, если была

  try {
    // Формируем адрес с параметрами пагинации, например ?_start=20&_limit=10
    const url = `${API_URL}?_start=${start}&_limit=${LIMIT}`;

    // await ждёт ответа сервера, не блокируя страницу
    const response = await fetch(url);

    // fetch НЕ выбрасывает ошибку на ответы 404/500 — проверяем вручную
    if (!response.ok) {
      // Создаём ошибку и запоминаем в ней код ответа, чтобы потом
      // показать пользователю понятное сообщение именно про сервер
      const httpError = new Error(`HTTP ${response.status}`);
      httpError.status = response.status;
      throw httpError;
    }

    // Разбираем тело ответа как JSON — получаем массив постов
    const newPosts = await response.json();

    // Добавляем новые посты в конец общего массива
    state.posts.push(...newPosts);

    // Если пришло меньше, чем просили, или набрали 100 — постов больше нет
    if (newPosts.length < LIMIT || state.posts.length >= MAX_POSTS) {
      state.hasMore = false;
    }

    renderPosts();
  } catch (error) {
    // Порцию не получили — убираем её из «запрошенных», чтобы можно было повторить
    state.requestedStarts.delete(start);
    console.error('Ошибка загрузки постов:', error);
    showError(getErrorMessage(error));
    // Выходим, не вызывая updateStatus(): иначе переподписка наблюдателя
    // сразу запустила бы новый запрос, и при отсутствии сети получился бы
    // бесконечный поток неудачных запросов. (finally всё равно выполнится.)
    return;
  } finally {
    // finally выполняется и при успехе, и при ошибке
    state.isLoading = false;
    loaderEl.hidden = true;
  }

  updateStatus();
}

/* =====================================================================
   5. ОШИБКИ — понятные сообщения для пользователя
   ===================================================================== */

// getErrorMessage() — превращает техническую ошибку в текст для человека
function getErrorMessage(error) {
  // Есть код ответа — значит, сервер ответил, но с ошибкой (!response.ok)
  if (error.status) {
    return `Сервер вернул ошибку (код ${error.status}). Попробуйте ещё раз чуть позже.`;
  }
  // Кода нет — запрос вообще не дошёл до сервера (нет сети, сервер недоступен).
  // В этом случае fetch сам выбрасывает TypeError.
  return 'Не удалось загрузить посты. Проверьте подключение к интернету и нажмите «Повторить».';
}

function showError(message) {
  errorTextEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

// Кнопка «Повторить» — заново запрашивает ту же порцию постов
// (её _start был удалён из requestedStarts в блоке catch)
retryBtn.addEventListener('click', () => {
  loadPosts();
});

/* =====================================================================
   6. ОТРИСОВКА ИЗ МАССИВА
   ===================================================================== */

// createPostCard() — создаёт DOM-элемент карточки для одного поста.
// Используем textContent, а не innerHTML: текст с сервера не будет
// интерпретирован как HTML (защита от XSS).
function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post';

  // Строка: номер поста и автор (userId)
  const meta = document.createElement('p');
  meta.className = 'post__meta';

  const idEl = document.createElement('span');
  idEl.textContent = `Пост #${post.id}`;

  const userEl = document.createElement('span');
  userEl.textContent = `Автор: userId ${post.userId}`;

  meta.append(idEl, userEl);

  // Заголовок поста
  const title = document.createElement('h2');
  title.className = 'post__title';
  title.textContent = post.title;

  // Текст поста
  const body = document.createElement('p');
  body.className = 'post__body';
  body.textContent = post.body;

  card.append(meta, title, body);
  return card;
}

// renderPosts() — полностью перерисовывает ленту из массива state.posts
// с учётом поискового запроса
function renderPosts() {
  // Фильтруем ТОЛЬКО уже загруженные посты, к серверу не обращаемся.
  // Оба значения в нижнем регистре — поиск без учёта регистра.
  // Пустая строка входит в любую строку, поэтому без запроса покажутся все.
  const postsToShow = state.posts.filter((post) =>
    post.title.toLowerCase().includes(state.searchQuery)
  );

  // DocumentFragment — «временный контейнер»: собираем все карточки в нём
  // и вставляем в страницу одной операцией (меньше перерисовок)
  const fragment = document.createDocumentFragment();
  postsToShow.forEach((post) => {
    fragment.append(createPostCard(post));
  });

  // replaceChildren() удаляет старые карточки и вставляет новые
  postsEl.replaceChildren(fragment);

  // «Ничего не найдено» — только если есть запрос и он ничего не дал
  emptyEl.hidden = !(state.searchQuery && postsToShow.length === 0);

  // Счётчик: при поиске показываем, сколько найдено из загруженных
  counterEl.textContent = state.searchQuery
    ? `Найдено: ${postsToShow.length} из ${state.posts.length} загруженных`
    : `Загружено постов: ${state.posts.length}`;
}

// updateStatus() — показывает «Больше постов нет» и отключает наблюдение,
// когда все посты загружены; иначе перепроверяет, виден ли сторож
function updateStatus() {
  if (!state.hasMore) {
    endEl.hidden = false;
    observer.disconnect(); // больше не следим за сторожем — грузить нечего
    return;
  }

  // Если после загрузки сторож всё ещё на экране (например, большой монитор
  // и 10 карточек не заполнили его), IntersectionObserver сам не сработает —
  // ведь состояние «виден» не изменилось. Переподписка заставляет его
  // сразу проверить сторож заново и при необходимости догрузить ещё.
  observer.unobserve(sentinelEl);
  observer.observe(sentinelEl);
}

/* =====================================================================
   7. БЕСКОНЕЧНЫЙ СКРОЛЛ (IntersectionObserver)
   ===================================================================== */

// Наблюдатель вызывает колбэк, когда сторож входит в область видимости
// или выходит из неё. entries — массив записей по наблюдаемым элементам.
const observer = new IntersectionObserver(
  (entries) => {
    const entry = entries[0];
    // Пока активен поиск, новые порции не грузим: отфильтрованная лента
    // короткая, сторож всё время на экране, и без этой проверки страница
    // молча догрузила бы все 100 постов. Поиск — только по уже загруженным.
    if (state.searchQuery) return;

    // isIntersecting — сторож сейчас виден на экране
    if (entry.isIntersecting) {
      loadPosts();
    }
  },
  {
    // rootMargin: начинать загрузку заранее, за 200px до конца ленты
    rootMargin: '0px 0px 200px 0px',
  }
);

/* =====================================================================
   8. ПОИСК С ДЕБАУНСОМ (setTimeout / clearTimeout)
   Дебаунс: фильтруем не на каждое нажатие клавиши, а только когда
   пользователь перестал печатать на 300 мс.
   ===================================================================== */

let searchTimer = null; // id отложенного вызова setTimeout

searchInput.addEventListener('input', () => {
  // Каждое новое нажатие отменяет предыдущий отложенный поиск...
  clearTimeout(searchTimer);

  // ...и планирует новый через 300 мс
  searchTimer = setTimeout(() => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    renderPosts();

    // Поиск очищен — снова включаем подгрузку: проверяем, не виден ли сторож
    if (!state.searchQuery && state.hasMore) {
      updateStatus();
    }
  }, SEARCH_DELAY);
});

/* =====================================================================
   9. ЗАПУСК
   ===================================================================== */

// Начинаем следить за сторожем. Сразу после observe() браузер вызывает
// колбэк с текущим состоянием — так загружается первая порция.
observer.observe(sentinelEl);
