const storageKey = "home-rhythm-pages-v1";

const icons = {
  bathroom: '<svg viewBox="0 0 48 48"><path d="M12 24h24v11a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V24Z"></path><path d="M10 24h28M18 24V13a6 6 0 0 1 12 0v2"></path><path d="M30 15h7M20 40v4M32 40v4"></path></svg>',
  litter: '<svg viewBox="0 0 48 48"><path d="M10 20h24l4 20H14L10 20Z"></path><path d="M13 20c2-5 5-8 11-8s9 3 11 8"></path><path d="M18 30h14M20 35h10"></path></svg>',
  garage: '<svg viewBox="0 0 48 48"><path d="M8 22 24 10l16 12v18H8V22Z"></path><path d="M16 40V25h16v15M16 30h16M16 35h16"></path></svg>',
  yard: '<svg viewBox="0 0 48 48"><path d="M24 39c0-12 5-22 17-27-1 13-7 21-17 27Z"></path><path d="M24 39C23 27 17 18 7 14c0 12 6 20 17 25Z"></path><path d="M24 39V19"></path></svg>',
  kitchen: '<svg viewBox="0 0 48 48"><path d="M14 11v27M22 11v27M30 12c5 5 5 14 0 19v7"></path><path d="M10 38h26"></path></svg>',
  cats: '<svg viewBox="0 0 48 48"><path d="M16 28c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7Z"></path><path d="M32 28c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7Z"></path><path d="M13 24c-2-6 1-12 5-15l4 7M35 24c2-6-1-12-5-15l-4 7"></path></svg>',
  utility: '<svg viewBox="0 0 48 48"><path d="M14 10h20v28H14z"></path><path d="M19 16h10M19 22h10M19 30h6"></path><path d="M34 18h5M34 30h5"></path></svg>',
  laundry: '<svg viewBox="0 0 48 48"><path d="M14 8h20v32H14z"></path><circle cx="24" cy="27" r="8"></circle><path d="M19 14h2M26 14h3"></path></svg>',
  upstairs: '<svg viewBox="0 0 48 48"><path d="M11 37h26M14 33h20M17 29h17M20 25h14M23 21h11M26 17h8"></path></svg>',
  exterior: '<svg viewBox="0 0 48 48"><path d="M8 28c7-9 13-9 20 0s9 9 12 5"></path><path d="M10 39h28M16 14h16M24 8v22"></path></svg>'
};

const seedTasks = [
  { id: "bathrooms", title: "Clean bathrooms", owner: "Shared rhythm", zone: "Bathrooms", status: "worth doing soon", bucket: "soon", section: "now", icon: "bathroom", cadence: "weekly", day: "Saturday", handled: false },
  { id: "litter-deep", title: "Deep clean litter boxes", owner: "Usually partner", zone: "Cats", status: "needs attention", bucket: "soon", section: "now", icon: "litter", cadence: "monthly", day: "Sunday", handled: false },
  { id: "garage", title: "Garage reset", owner: "Shared rhythm", zone: "Garage", status: "can wait", bucket: "wait", section: "upcoming", icon: "garage", cadence: "quarterly", day: "Saturday", handled: false },
  { id: "yard", title: "Yard cleanup", owner: "Usually partner", zone: "Yard", status: "can wait", bucket: "wait", section: "upcoming", icon: "yard", cadence: "quarterly", day: "Sunday", handled: false },
  { id: "kitchen", title: "Kitchen reset", owner: "Usually you", zone: "Kitchen", status: "handled recently", bucket: "handled", section: "handled", icon: "kitchen", cadence: "daily", day: "flexible", handled: true },
  { id: "water", title: "Refresh cat water", owner: "Shared rhythm", zone: "Cats", status: "handled recently", bucket: "handled", section: "handled", icon: "cats", cadence: "daily", day: "flexible", handled: true },
  { id: "hvac", title: "Check HVAC filter", owner: "Usually you", zone: "Utility", status: "worth doing soon", bucket: "soon", section: "now", icon: "utility", cadence: "monthly", day: "Friday", handled: false },
  { id: "laundry", title: "Wash bedding and throws", owner: "Usually partner", zone: "Laundry", status: "steady", bucket: "upcoming", section: "upcoming", icon: "laundry", cadence: "weekly", day: "Wednesday", handled: false }
];

const ownerOptions = ["Shared rhythm", "Usually you", "Usually partner", "Rotating"];
const zones = [
  { name: "Kitchen", note: "Handled recently", icon: "kitchen", pulse: 82 },
  { name: "Cats", note: "One item slipping", icon: "cats", pulse: 56 },
  { name: "Bathrooms", note: "Worth doing soon", icon: "bathroom", pulse: 62 },
  { name: "Laundry", note: "Steady rhythm", icon: "laundry", pulse: 76 },
  { name: "Garage", note: "Can wait", icon: "garage", pulse: 72 },
  { name: "Yard", note: "Can wait", icon: "yard", pulse: 70 },
  { name: "Upstairs", note: "Steady rhythm", icon: "upstairs", pulse: 84 },
  { name: "Utility", note: "Filter check soon", icon: "utility", pulse: 64 }
];

const rhythmItems = [
  { title: "Cats need a little attention", text: "Deep litter care is the one pet-care item worth surfacing soon.", color: "var(--rust)" },
  { title: "Kitchen is steady", text: "Daily resets have been handled recently, so nothing extra needs to surface.", color: "var(--green)" },
  { title: "Outdoor care can wait", text: "Garage and yard work belong in a flexible weekend window.", color: "var(--gold)" }
];

let state = loadState();
let activeTaskFilter = "now";
let selectedTaskId = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored?.tasks?.length) {
      return { tasks: stored.tasks.map(normalizeTask) };
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
  return { tasks: seedTasks };
}

function normalizeTask(task) {
  const placement = placementForStatus(task.status || "steady");
  return {
    ...task,
    day: task.day || "flexible",
    icon: task.icon || iconForZone(task.zone || "Kitchen"),
    handled: task.status === "handled recently" ? true : Boolean(task.handled),
    section: task.section || placement.section,
    bucket: task.bucket === "wait" && task.status === "steady" ? "upcoming" : task.bucket || placement.bucket
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function renderIcon(name) {
  return icons[name] || icons.kitchen;
}

function statusClass(status) {
  return status === "needs attention" ? "attention" : "";
}

function taskTimingDefaults(timing) {
  if (timing === "now") {
    return { status: "worth doing soon", bucket: "soon", section: "now" };
  }
  if (timing === "wait") {
    return { status: "can wait", bucket: "wait", section: "upcoming" };
  }
  return { status: "steady", bucket: "upcoming", section: "upcoming" };
}

function placementForStatus(status) {
  if (status === "handled recently") {
    return { handled: true, bucket: "handled", section: "handled" };
  }
  if (status === "can wait") {
    return { handled: false, bucket: "wait", section: "upcoming" };
  }
  if (status === "steady") {
    return { handled: false, bucket: "upcoming", section: "upcoming" };
  }
  return { handled: false, bucket: "soon", section: "now" };
}

function iconForZone(zone) {
  const key = String(zone).toLowerCase();
  if (key.includes("bath")) return "bathroom";
  if (key.includes("cat")) return "cats";
  if (key.includes("garage")) return "garage";
  if (key.includes("yard")) return "yard";
  if (key.includes("laundry")) return "laundry";
  if (key.includes("upstairs")) return "upstairs";
  if (key.includes("utility")) return "utility";
  if (key.includes("exterior")) return "exterior";
  return "kitchen";
}

function updateTask(id, updates) {
  state.tasks = state.tasks.map((task) => task.id === id ? normalizeTask({ ...task, ...updates }) : task);
  saveState();
  render();
}

function openEditor(taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;
  selectedTaskId = taskId;
  document.querySelector("#chore-form").hidden = true;
  document.querySelector("#editor-title").textContent = task.title;
  document.querySelector("#editor-status").value = task.status;
  document.querySelector("#editor-owner").value = task.owner;
  document.querySelector("#editor-day").value = task.day || "flexible";
  document.querySelector("#editor-zone").value = task.zone;
  document.querySelector("#editor-cadence").value = task.cadence;
  document.querySelector("#chore-editor").hidden = false;
  document.querySelector("#chore-editor").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeEditor() {
  selectedTaskId = null;
  document.querySelector("#chore-editor").hidden = true;
}

function taskRow(task, compact = false, manage = false) {
  const row = document.createElement(manage ? "article" : "button");
  if (!manage) row.type = "button";
  row.className = compact ? "compact-row" : `task-row ${task.handled ? "is-handled" : ""} ${manage ? "is-manageable" : ""}`;
  row.innerHTML = compact
    ? `
      <span class="task-icon">${renderIcon(task.icon)}</span>
      <span>
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.owner)}</p>
      </span>
      <span class="chevron">›</span>
    `
    : `
      <span class="task-icon">${renderIcon(task.icon)}</span>
      <span class="task-content">
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.owner)} · ${escapeHtml(task.cadence)}</p>
        <span class="chip-row">
          <span class="chip">${escapeHtml(task.zone)}</span>
          <span class="chip">${task.day === "flexible" ? "Flexible" : escapeHtml(task.day || "Flexible")}</span>
        </span>
      </span>
      <span class="task-controls">
        <span class="status-chip ${statusClass(task.status)}">${escapeHtml(task.status)}</span>
        ${manage ? `
          <span class="edit-hint">Open</span>
        ` : ""}
      </span>
    `;

  row.addEventListener("click", () => {
    if (!manage) setActiveTab("tasks");
    openEditor(task.id);
  });

  return row;
}

function renderHomeLists() {
  const soon = document.querySelector('[data-task-list="soon"]');
  const wait = document.querySelector('[data-task-list="wait"]');
  soon.replaceChildren();
  wait.replaceChildren();

  state.tasks
    .filter((task) => task.bucket === "soon" && !task.handled)
    .slice(0, 2)
    .forEach((task) => soon.append(taskRow(task)));

  state.tasks
    .filter((task) => task.bucket === "wait" && !task.handled)
    .slice(0, 3)
    .forEach((task) => wait.append(taskRow(task, true)));
}

function renderTasks() {
  const groups = document.querySelector("#task-groups");
  groups.replaceChildren();

  const sections = {
    now: ["Now", (task) => task.section === "now" && !task.handled],
    upcoming: ["Upcoming", (task) => task.bucket === "upcoming" && !task.handled],
    wait: ["Can Wait", (task) => task.bucket === "wait" && !task.handled],
    handled: ["Handled", (task) => task.handled]
  };

  const [label, predicate] = sections[activeTaskFilter];
  const items = state.tasks.filter(predicate);
  const group = document.createElement("section");
  group.className = "task-group";
  group.innerHTML = `<h3>${label}</h3>`;
  const card = document.createElement("div");
  card.className = "stacked-card task-list";
  items.forEach((task) => card.append(taskRow(task, false, true)));
  if (!items.length) {
    card.innerHTML = `<div class="insight-row"><span class="dot"></span><span><h3>Quiet here</h3><p>Nothing needs to surface in this section right now.</p></span></div>`;
  }
  group.append(card);
  groups.append(group);
}

function renderZones() {
  const grid = document.querySelector("#zone-grid");
  grid.replaceChildren();
  zones.forEach((zone) => {
    const card = document.createElement("article");
    card.className = "zone-card";
    card.innerHTML = `
      <span class="zone-icon">${renderIcon(zone.icon)}</span>
      <h3>${zone.name}</h3>
      <p>${zone.note}</p>
      <div class="zone-meter" aria-hidden="true"><span style="width: ${zone.pulse}%"></span></div>
    `;
    grid.append(card);
  });
}

function renderRhythm() {
  const list = document.querySelector("#rhythm-list");
  list.replaceChildren();
  rhythmItems.forEach((item) => {
    const row = document.createElement("article");
    row.className = "insight-row";
    row.innerHTML = `
      <span class="dot" style="background: ${item.color}"></span>
      <span><h3>${item.title}</h3><p>${item.text}</p></span>
    `;
    list.append(row);
  });
}

function renderCalendar() {
  const calendar = document.querySelector("#week-calendar");
  calendar.replaceChildren();
  getSevenDayWindow().forEach((day) => {
    const dayTasks = state.tasks.filter((task) => taskMatchesCalendarDay(task, day.name));
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-heading">
        <span>${escapeHtml(day.label)}</span>
        <strong>${escapeHtml(day.dateLabel)}</strong>
      </div>
      <div class="day-task-list">
        ${dayTasks.length ? dayTasks.map((task) => `
          <button class="calendar-task" type="button" data-open-task="${escapeHtml(task.id)}">
            <span>${escapeHtml(task.title)}</span>
            <small>${escapeHtml(task.owner)} · ${escapeHtml(task.status)}</small>
          </button>
        `).join("") : `<p class="quiet-day">Nothing planned here.</p>`}
      </div>
    `;
    card.querySelectorAll("[data-open-task]").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveTab("tasks");
        openEditor(button.dataset.openTask);
      });
    });
    calendar.append(card);
  });
}

function getSevenDayWindow() {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
  const shortFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return {
      name: formatter.format(date),
      label: index === 0 ? "Today" : shortFormatter.format(date),
      dateLabel: dateFormatter.format(date)
    };
  });
}

function taskMatchesCalendarDay(task, dayName) {
  if (task.handled) return false;
  if (task.cadence === "daily") return true;
  return task.day === dayName;
}

function setActiveTab(tab, updateHash = true) {
  const knownTabs = ["home", "tasks", "house", "rhythm", "calendar"];
  const nextTab = knownTabs.includes(tab) ? tab : "home";
  document.querySelectorAll(".bottom-nav button").forEach((candidate) => {
    candidate.classList.toggle("is-active", candidate.dataset.tab === nextTab);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `tab-${nextTab}`);
  });
  if (updateHash) history.replaceState(null, "", `#${nextTab}`);
}

function render() {
  renderHomeLists();
  renderTasks();
  renderZones();
  renderRhythm();
  renderCalendar();
}

document.querySelectorAll(".bottom-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => {
    activeTaskFilter = button.dataset.filter;
    document.querySelectorAll(".segmented button").forEach((candidate) => candidate.classList.toggle("is-selected", candidate === button));
    renderTasks();
  });
});

document.querySelector("#reset-tasks").addEventListener("click", () => {
  state = { tasks: seedTasks };
  saveState();
  render();
});

document.querySelector("#show-add-chore").addEventListener("click", () => {
  const form = document.querySelector("#chore-form");
  closeEditor();
  form.hidden = false;
  document.querySelector("#chore-title").focus();
});

document.querySelector("#cancel-add-chore").addEventListener("click", () => {
  const form = document.querySelector("#chore-form");
  form.reset();
  form.hidden = true;
});

document.querySelector("#chore-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const title = String(data.get("title") || "").trim();
  if (!title) return;

  const owner = String(data.get("owner") || "Shared rhythm");
  const zone = String(data.get("zone") || "Kitchen");
  const cadence = String(data.get("cadence") || "weekly");
  const day = String(data.get("day") || "flexible");
  const timing = String(data.get("timing") || "upcoming");
  const timingDefaults = taskTimingDefaults(timing);

  state.tasks = [
    {
      id: `task-${Date.now()}`,
      title,
      owner,
      zone,
      cadence,
      day,
      icon: iconForZone(zone),
      handled: false,
      ...timingDefaults
    },
    ...state.tasks
  ];

  activeTaskFilter = timing === "now" ? "now" : timing === "wait" ? "wait" : "upcoming";
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.filter === activeTaskFilter);
  });
  form.reset();
  form.hidden = true;
  saveState();
  render();
});

document.querySelector("#close-editor").addEventListener("click", closeEditor);

document.querySelector("#chore-editor").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedTaskId) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const status = String(data.get("status") || "steady");
  const zone = String(data.get("zone") || "Kitchen");
  updateTask(selectedTaskId, {
    status,
    owner: String(data.get("owner") || "Shared rhythm"),
    day: String(data.get("day") || "flexible"),
    zone,
    cadence: String(data.get("cadence") || "weekly"),
    icon: iconForZone(zone),
    ...placementForStatus(status)
  });
  closeEditor();
});

document.querySelector("#editor-delete").addEventListener("click", () => {
  if (!selectedTaskId) return;
  state.tasks = state.tasks.filter((candidate) => candidate.id !== selectedTaskId);
  saveState();
  closeEditor();
  render();
});

render();
setActiveTab(location.hash.replace("#", "") || "home", false);
