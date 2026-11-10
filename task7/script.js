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

  try {
    // Формируем адрес с параметрами пагинации, например ?_start=20&_limit=10
    const url = `${API_URL}?_start=${start}&_limit=${LIMIT}`;

    // await ждёт ответа сервера, не блокируя страницу
    const response = await fetch(url);

    // fetch НЕ выбрасывает ошибку на ответы 404/500 — проверяем вручную
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
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
   5. ОТРИСОВКА ИЗ МАССИВА
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
function renderPosts() {
  const postsToShow = state.posts;

  // DocumentFragment — «временный контейнер»: собираем все карточки в нём
  // и вставляем в страницу одной операцией (меньше перерисовок)
  const fragment = document.createDocumentFragment();
  postsToShow.forEach((post) => {
    fragment.append(createPostCard(post));
  });

  // replaceChildren() удаляет старые карточки и вставляет новые
  postsEl.replaceChildren(fragment);

  counterEl.textContent = `Загружено постов: ${state.posts.length}`;
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
   6. БЕСКОНЕЧНЫЙ СКРОЛЛ (IntersectionObserver)
   ===================================================================== */

// Наблюдатель вызывает колбэк, когда сторож входит в область видимости
// или выходит из неё. entries — массив записей по наблюдаемым элементам.
const observer = new IntersectionObserver(
  (entries) => {
    const entry = entries[0];
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

// Начинаем следить за сторожем. Сразу после observe() браузер вызывает
// колбэк с текущим состоянием — так загружается первая порция.
observer.observe(sentinelEl);
