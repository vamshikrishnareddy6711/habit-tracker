const STORAGE_KEY = "momentum-habits-v1";
const colors = {
  coral: "#f2765d",
  teal: "#168a81",
  indigo: "#536dfe",
  amber: "#f2a93b",
};

const seedHabits = [
  {
    id: crypto.randomUUID(),
    name: "Morning stretch",
    goal: "10 minutes before coffee",
    category: "Health",
    color: "coral",
    completions: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Deep work block",
    goal: "One focused 60 minute session",
    category: "Focus",
    color: "indigo",
    completions: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Evening reset",
    goal: "Clear desk and prep tomorrow",
    category: "Home",
    color: "teal",
    completions: {},
    createdAt: new Date().toISOString(),
  },
];

let habits = loadHabits();
let activeFilter = "all";
let searchTerm = "";

const elements = {
  activeCount: document.querySelector("#activeCount"),
  bestStreak: document.querySelector("#bestStreak"),
  closeHabitForm: document.querySelector("#closeHabitForm"),
  dailyPercent: document.querySelector("#dailyPercent"),
  doneCount: document.querySelector("#doneCount"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  formMode: document.querySelector("#formMode"),
  habitColor: document.querySelector("#habitColor"),
  habitDialog: document.querySelector("#habitDialog"),
  habitForm: document.querySelector("#habitForm"),
  habitGoal: document.querySelector("#habitGoal"),
  habitId: document.querySelector("#habitId"),
  habitList: document.querySelector("#habitList"),
  habitName: document.querySelector("#habitName"),
  openHabitForm: document.querySelector("#openHabitForm"),
  ringValue: document.querySelector("#ringValue"),
  searchInput: document.querySelector("#searchInput"),
  todayLabel: document.querySelector("#todayLabel"),
  weekRate: document.querySelector("#weekRate"),
  weekStrip: document.querySelector("#weekStrip"),
};

function loadHabits() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const today = dateKey(new Date());
    seedHabits[0].completions[today] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedHabits));
    return seedHabits;
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getWeekDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}

function isCompleteToday(habit) {
  return Boolean(habit.completions[dateKey(new Date())]);
}

function calculateStreak(habit) {
  let streak = 0;
  let cursor = new Date();

  while (habit.completions[dateKey(cursor)]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function render() {
  const today = dateKey(new Date());
  const completedToday = habits.filter((habit) => habit.completions[today]).length;
  const dailyPercent = habits.length ? Math.round((completedToday / habits.length) * 100) : 0;
  const bestStreak = habits.reduce((best, habit) => Math.max(best, calculateStreak(habit)), 0);

  elements.todayLabel.textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
  elements.activeCount.textContent = habits.length;
  elements.doneCount.textContent = completedToday;
  elements.bestStreak.textContent = bestStreak;
  elements.dailyPercent.textContent = `${dailyPercent}%`;
  elements.ringValue.style.strokeDashoffset = String(314 - (314 * dailyPercent) / 100);

  renderWeek();
  renderHabits();
}

function renderWeek() {
  const days = getWeekDays();
  let possible = 0;
  let completed = 0;

  elements.weekStrip.innerHTML = days
    .map((day) => {
      const key = dateKey(day);
      const count = habits.filter((habit) => habit.completions[key]).length;
      const percent = habits.length ? Math.round((count / habits.length) * 100) : 0;
      possible += habits.length;
      completed += count;

      return `
        <article class="day-tile">
          <strong>${new Intl.DateTimeFormat("en", { weekday: "short" }).format(day)}</strong>
          <span>${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(day)}</span>
          <div class="day-bar" aria-label="${percent}% complete"><i style="width: ${percent}%"></i></div>
        </article>
      `;
    })
    .join("");

  elements.weekRate.textContent = possible ? `${Math.round((completed / possible) * 100)}%` : "0%";
}

function renderHabits() {
  const filteredHabits = habits.filter((habit) => {
    const matchesSearch = [habit.name, habit.goal, habit.category]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
    const done = isCompleteToday(habit);

    if (activeFilter === "done") return matchesSearch && done;
    if (activeFilter === "open") return matchesSearch && !done;
    return matchesSearch;
  });

  if (!filteredHabits.length) {
    elements.habitList.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>No habits found</h3>
          <p>Add a habit or adjust the current filter to bring your routines back into view.</p>
        </div>
      </div>
    `;
    return;
  }

  elements.habitList.innerHTML = filteredHabits
    .map((habit) => {
      const done = isCompleteToday(habit);
      const streak = calculateStreak(habit);
      const goal = habit.goal ? `<span>${escapeHtml(habit.goal)}</span>` : "";

      return `
        <article class="habit-card" style="--habit-color: ${colors[habit.color] || colors.coral}">
          <button class="habit-check ${done ? "done" : ""}" type="button" data-action="toggle" data-id="${habit.id}" aria-label="Toggle ${escapeHtml(habit.name)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10" /></svg>
          </button>
          <div class="habit-info">
            <h3>${escapeHtml(habit.name)}</h3>
            <p class="habit-meta">
              <span>${escapeHtml(habit.category)}</span>
              <span>${streak} day streak</span>
              ${goal}
            </p>
          </div>
          <div class="habit-actions">
            <button class="habit-action" type="button" data-action="edit" data-id="${habit.id}" aria-label="Edit ${escapeHtml(habit.name)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
            <button class="habit-action" type="button" data-action="delete" data-id="${habit.id}" aria-label="Delete ${escapeHtml(habit.name)}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function openForm(habit = null) {
  elements.habitForm.reset();
  elements.habitId.value = "";
  elements.formMode.textContent = "New habit";

  if (habit) {
    elements.formMode.textContent = "Edit habit";
    elements.habitId.value = habit.id;
    elements.habitName.value = habit.name;
    elements.habitGoal.value = habit.goal || "";
    elements.habitColor.value = habit.color;
    const category = elements.habitForm.querySelector(`[name="category"][value="${habit.category}"]`);
    if (category) category.checked = true;
  }

  elements.habitDialog.showModal();
  elements.habitName.focus();
}

function closeForm() {
  elements.habitDialog.close();
}

function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.habitForm);
  const id = elements.habitId.value;
  const payload = {
    name: elements.habitName.value.trim(),
    goal: elements.habitGoal.value.trim(),
    category: formData.get("category"),
    color: elements.habitColor.value,
  };

  if (!payload.name) return;

  if (id) {
    habits = habits.map((habit) => (habit.id === id ? { ...habit, ...payload } : habit));
  } else {
    habits = [
      {
        id: crypto.randomUUID(),
        completions: {},
        createdAt: new Date().toISOString(),
        ...payload,
      },
      ...habits,
    ];
  }

  saveHabits();
  closeForm();
  render();
}

function handleHabitAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const habit = habits.find((item) => item.id === button.dataset.id);
  if (!habit) return;

  if (button.dataset.action === "toggle") {
    const today = dateKey(new Date());
    habit.completions[today] = !habit.completions[today];
    if (!habit.completions[today]) delete habit.completions[today];
  }

  if (button.dataset.action === "edit") {
    openForm(habit);
    return;
  }

  if (button.dataset.action === "delete") {
    habits = habits.filter((item) => item.id !== habit.id);
  }

  saveHabits();
  render();
}

elements.openHabitForm.addEventListener("click", () => openForm());
elements.closeHabitForm.addEventListener("click", closeForm);
elements.habitForm.addEventListener("submit", handleSubmit);
elements.habitList.addEventListener("click", handleHabitAction);
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderHabits();
});

elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    elements.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderHabits();
  });
});

elements.habitDialog.addEventListener("click", (event) => {
  if (event.target === elements.habitDialog) closeForm();
});

render();
