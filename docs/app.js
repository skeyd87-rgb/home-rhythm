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
const zoneOptions = ["Kitchen", "Bathrooms", "Cats", "Laundry", "Upstairs", "Downstairs", "Garage", "Yard", "Utility", "Exterior"];

let state = loadState();
let activeTaskFilter = "now";
let selectedTaskId = null;
let selectedZone = "Cats";

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

function statusWeight(status) {
  if (status === "needs attention") return 15;
  if (status === "worth doing soon") return 45;
  if (status === "steady") return 72;
  if (status === "can wait") return 82;
  return 92;
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
  const detail = document.querySelector("#zone-detail");
  const summaries = buildZoneSummaries();
  const activeSummary = summaries.find((zone) => zone.name === selectedZone) || summaries.find((zone) => zone.count) || summaries[0];
  selectedZone = activeSummary.name;
  document.querySelector("#house-summary").textContent = `${state.tasks.length} chores across ${summaries.filter((zone) => zone.count).length} zones`;
  grid.replaceChildren();

  summaries.forEach((zone) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `zone-card ${zone.name === selectedZone ? "is-selected" : ""}`;
    card.innerHTML = `
      <span class="zone-icon">${renderIcon(zone.icon)}</span>
      <h3>${zone.name}</h3>
      <p>${zone.note}</p>
      <span class="zone-count">${zone.count} ${zone.count === 1 ? "chore" : "chores"}</span>
      <div class="zone-meter" aria-hidden="true"><span style="width: ${zone.pulse}%"></span></div>
    `;
    card.addEventListener("click", () => {
      selectedZone = zone.name;
      renderZones();
    });
    grid.append(card);
  });

  const zoneTasks = state.tasks.filter((task) => task.zone === selectedZone);
  detail.innerHTML = `
    <div class="section-heading">
      <h2>${escapeHtml(selectedZone)}</h2>
      <span class="quiet-label">${escapeHtml(activeSummary.note)}</span>
    </div>
    <div class="stacked-card task-list"></div>
  `;
  const list = detail.querySelector(".task-list");
  if (zoneTasks.length) {
    zoneTasks.forEach((task) => list.append(taskRow(task, false, true)));
  } else {
    list.innerHTML = `<div class="insight-row"><span class="dot"></span><span><h3>Quiet here</h3><p>No chores are assigned to this zone yet.</p></span></div>`;
  }
}

function renderRhythm() {
  const list = document.querySelector("#rhythm-list");
  const metrics = document.querySelector("#rhythm-metrics");
  const rhythm = buildRhythmSummary();
  document.querySelector("#rhythm-summary").textContent = `${rhythm.activeCount} active · ${rhythm.handledCount} handled`;
  document.querySelector("#rhythm-title").textContent = rhythm.title;
  document.querySelector("#rhythm-copy").textContent = rhythm.copy;
  metrics.replaceChildren();
  rhythm.metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "metric-card";
    card.innerHTML = `<span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><p>${escapeHtml(metric.note)}</p>`;
    metrics.append(card);
  });

  list.replaceChildren();
  rhythm.items.forEach((item) => {
    const row = document.createElement("article");
    row.className = "insight-row";
    row.innerHTML = `
      <span class="dot" style="background: ${item.color}"></span>
      <span><h3>${item.title}</h3><p>${item.text}</p></span>
    `;
    list.append(row);
  });
}

function buildZoneSummaries() {
  const zonesInUse = [...new Set([...zoneOptions, ...state.tasks.map((task) => task.zone)])];
  return zonesInUse.map((name) => {
    const tasks = state.tasks.filter((task) => task.zone === name);
    const active = tasks.filter((task) => !task.handled);
    const needsAttention = active.filter((task) => task.status === "needs attention").length;
    const soon = active.filter((task) => task.status === "worth doing soon").length;
    const handled = tasks.filter((task) => task.handled).length;
    const pulseTasks = active.length ? active : tasks;
    const average = pulseTasks.length
      ? Math.round(pulseTasks.reduce((total, task) => total + statusWeight(task.status), 0) / pulseTasks.length)
      : 0;
    let note = "Steady rhythm";
    if (!tasks.length) note = "No chores yet";
    else if (needsAttention) note = `${needsAttention} ${needsAttention === 1 ? "item" : "items"} needs attention`;
    else if (soon) note = `${soon} worth doing soon`;
    else if (handled === tasks.length) note = "Handled recently";
    else if (active.every((task) => task.status === "can wait")) note = "Can wait";
    return {
      name,
      note,
      icon: iconForZone(name),
      count: tasks.length,
      pulse: average
    };
  });
}

function buildRhythmSummary() {
  const activeTasks = state.tasks.filter((task) => !task.handled);
  const handledTasks = state.tasks.filter((task) => task.handled);
  const needsAttention = activeTasks.filter((task) => task.status === "needs attention");
  const soon = activeTasks.filter((task) => task.status === "worth doing soon");
  const canWait = activeTasks.filter((task) => task.status === "can wait");
  const ownerCounts = ownerOptions.map((owner) => ({
    owner,
    count: activeTasks.filter((task) => task.owner === owner).length
  })).filter((item) => item.count);
  const carriedOwner = ownerCounts.slice().sort((a, b) => b.count - a.count)[0];
  const slippingZones = buildZoneSummaries()
    .filter((zone) => zone.count && zone.pulse < 60)
    .sort((a, b) => a.pulse - b.pulse);

  let title = "Load feels balanced";
  let copy = "The house is mostly steady. Everything else can wait.";
  if (needsAttention.length) {
    title = `${needsAttention.length} ${needsAttention.length === 1 ? "thing needs" : "things need"} attention`;
    copy = `${needsAttention.slice(0, 2).map((task) => task.title).join(" and ")} ${needsAttention.length === 1 ? "is" : "are"} worth surfacing first.`;
  } else if (soon.length) {
    title = `${soon.length} worth doing soon`;
    copy = "A few chores are ready to surface, but the rest of the house can wait.";
  }

  const items = [];
  if (slippingZones.length) {
    items.push({
      title: `${slippingZones[0].name} is slipping`,
      text: `${slippingZones[0].note}. Open the House tab to see the chores in that zone.`,
      color: "var(--rust)"
    });
  } else {
    items.push({
      title: "No zone is shouting",
      text: "The active zones are either steady or can wait.",
      color: "var(--green)"
    });
  }

  if (carriedOwner && carriedOwner.count >= 3) {
    items.push({
      title: `${carriedOwner.owner} has more recurring items lately`,
      text: "This is a soft signal, not a scoreboard. Consider moving one chore to shared rhythm if it feels useful.",
      color: "var(--gold)"
    });
  } else {
    items.push({
      title: "Load feels balanced",
      text: "No owner has a noticeably heavier active list right now.",
      color: "var(--green)"
    });
  }

  const nextPlanned = activeTasks.filter((task) => task.day && task.day !== "flexible").length;
  items.push({
    title: `${nextPlanned} chores have a planned day`,
    text: nextPlanned ? "The weekly calendar can now reflect your actual rhythm." : "Add days to chores when you want them to appear on the calendar.",
    color: "var(--green)"
  });

  return {
    title,
    copy,
    activeCount: activeTasks.length,
    handledCount: handledTasks.length,
    metrics: [
      { label: "Needs attention", value: String(needsAttention.length), note: "Surface first" },
      { label: "Worth doing soon", value: String(soon.length), note: "Gentle priority" },
      { label: "Can wait", value: String(canWait.length), note: "No rush" }
    ],
    items
  };
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

document.querySelector("#review-rhythm").addEventListener("click", () => {
  activeTaskFilter = "now";
  document.querySelectorAll(".segmented button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.filter === activeTaskFilter);
  });
  setActiveTab("tasks");
  renderTasks();
});

render();
setActiveTab(location.hash.replace("#", "") || "home", false);
