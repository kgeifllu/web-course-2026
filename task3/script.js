// Массив задач — единственный источник правды. Всё, что видно на экране,
// перерисовывается из него функцией render().
let tasks = [];
let nextId = 1;
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

// Ссылки на элементы DOM, с которыми будем работать
const input = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const emptyWarning = document.getElementById('empty-warning');
const taskList = document.getElementById('task-list');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const filterButtons = document.querySelectorAll('.filter-btn');

// Добавление новой задачи
function addTask() {
  const text = input.value.trim();

  if (text === '') {
    emptyWarning.classList.remove('hidden');
    return;
  }

  emptyWarning.classList.add('hidden');

  tasks.push({
    id: nextId,
    text: text,
    completed: false
  });
  nextId++;

  input.value = '';
  render();
}

// Переключение статуса "выполнено"
function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  render();
}

// Удаление задачи
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  render();
}

// Возвращает задачи, соответствующие текущему фильтру
function getFilteredTasks() {
  if (currentFilter === 'active') {
    return tasks.filter(task => !task.completed);
  }
  if (currentFilter === 'completed') {
    return tasks.filter(task => task.completed);
  }
  return tasks;
}

// Создаёт один DOM-элемент <li> для задачи
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => toggleTask(task.id));

  const span = document.createElement('span');
  span.className = 'task-text';
  span.textContent = task.text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

// Главная функция отрисовки — вызывается после любого изменения данных
function render() {
  // Очищаем список и заполняем заново на основе отфильтрованных задач
  taskList.innerHTML = '';
  const filtered = getFilteredTasks();
  
  if (filtered.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'empty-list';
    emptyMsg.textContent = 'Задач нет — самое время отдохнуть.';
    taskList.appendChild(emptyMsg);
  }
  
  filtered.forEach(task => {
    taskList.appendChild(createTaskElement(task));
  });

  // Обновляем счётчики
  const activeCount = tasks.filter(task => !task.completed).length;
  const completedCount = tasks.filter(task => task.completed).length;
  countActive.textContent = activeCount;
  countCompleted.textContent = completedCount;
}

// Обработчики событий — только через addEventListener, без onclick в HTML
addBtn.addEventListener('click', addTask);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// Первая отрисовка при загрузке страницы
render();
