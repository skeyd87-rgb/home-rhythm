const STORAGE_KEY = "home-rhythm-v1";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const frequencyMeta = {
  daily: { label: "Daily", cadence: "Every day", days: 1 },
  weekly: { label: "Weekly", cadence: "Every 7 days", days: 7 },
  monthly: { label: "Monthly", cadence: "Every 30 days", days: 30 },
  quarterly: { label: "Quarterly", cadence: "Every 90 days", days: 90 },
  yearly: { label: "Yearly", cadence: "Every 365 days", days: 365 }
};

const starterTasks = [
  {
    id: "daily-litter",
    title: "Scoop litter boxes and sweep litter mats",
    frequency: "daily",
    owner: "Shared",
    zone: "Cat zones",
    notes: "Do upstairs and downstairs boxes before trash goes out.",
    petCare: true,
    lastCompleted: daysAgo(1)
  },
  {
    id: "daily-kitchen",
    title: "Kitchen reset",
    frequency: "daily",
    owner: "You",
    zone: "Kitchen",
    notes: "Counters, sink, dishwasher, and anything cats may have inspected.",
    petCare: false,
    lastCompleted: daysAgo(0)
  },
  {
    id: "daily-water",
    title: "Refresh cat water and wash one food station",
    frequency: "daily",
    owner: "Partner",
    zone: "Cat zones",
    notes: "Rotate through fountains, bowls, and feeding mats.",
    petCare: true,
    lastCompleted: daysAgo(1)
  },
  {
    id: "weekly-baths",
    title: "Clean bathrooms",
    frequency: "weekly",
    owner: "Shared",
    zone: "Bathrooms",
    notes: "Toilets, sinks, counters, mirrors, floors, towels.",
    petCare: false,
    lastCompleted: daysAgo(8)
  },
  {
    id: "weekly-floors",
    title: "Full-house floor pass",
    frequency: "weekly",
    owner: "You",
    zone: "Upstairs / downstairs",
    notes: "Vacuum stairs, rugs, couch edges, and cat hair collection corners.",
    petCare: true,
    lastCompleted: daysAgo(6)
  },
  {
    id: "weekly-bedding",
    title: "Change bedding and wash throws",
    frequency: "weekly",
    owner: "Partner",
    zone: "Bedrooms / living room",
    notes: "Include washable blankets where the cats nap.",
    petCare: true,
    lastCompleted: daysAgo(7)
  },
  {
    id: "monthly-litter-deep",
    title: "Deep clean litter boxes",
    frequency: "monthly",
    owner: "Shared",
    zone: "Cat zones",
    notes: "Empty, scrub, dry fully, refill, and check liners or mats.",
    petCare: true,
    lastCompleted: daysAgo(33)
  },
  {
    id: "monthly-filter",
    title: "Check HVAC filter and vents",
    frequency: "monthly",
    owner: "You",
    zone: "Utility",
    notes: "Four cats means this deserves a real monthly look.",
    petCare: true,
    lastCompleted: daysAgo(21)
  },
  {
    id: "monthly-appliances",
    title: "Clean appliances and fridge sweep",
    frequency: "monthly",
    owner: "Partner",
    zone: "Kitchen",
    notes: "Microwave, oven front, dishwasher edge, expired food, sticky shelves.",
    petCare: false,
    lastCompleted: daysAgo(28)
  },
  {
    id: "quarterly-garage",
    title: "Garage zone reset",
    frequency: "quarterly",
    owner: "Shared",
    zone: "Garage",
    notes: "Clear donation pile, sweep corners, inspect storage and tools.",
    petCare: false,
    lastCompleted: daysAgo(94)
  },
  {
    id: "quarterly-rugs",
    title: "Deep clean rugs and high-traffic upholstery",
    frequency: "quarterly",
    owner: "You",
    zone: "Common areas",
    notes: "Focus on cat hair, dander, and the main living-room seating.",
    petCare: true,
    lastCompleted: daysAgo(83)
  },
  {
    id: "quarterly-yard",
    title: "Seasonal yard and exterior walkaround",
    frequency: "quarterly",
    owner: "Partner",
    zone: "Front / back yard",
    notes: "Beds, hose bibs, patio, drainage spots, and outdoor storage.",
    petCare: false,
    lastCompleted: daysAgo(67)
  },
  {
    id: "yearly-safety",
    title: "Smoke, CO, and emergency kit check",
    frequency: "yearly",
    owner: "Shared",
    zone: "Whole house",
    notes: "Test devices, replace batteries, update pet emergency supplies.",
    petCare: true,
    lastCompleted: daysAgo(370)
  },
  {
    id: "yearly-hvac",
    title: "Schedule HVAC service",
    frequency: "yearly",
    owner: "Alex",
    zone: "Utility",
    notes: "Book before the first hot spell; mention high pet hair load.",
    petCare: true,
    lastCompleted: daysAgo(310)
  },
  {
    id: "yearly-gutters",
    title: "Gutters, exterior wash, and big garage purge",
    frequency: "yearly",
    owner: "Shared",
    zone: "Exterior / garage",
    notes: "Bundle outdoor maintenance into one planned weekend.",
    petCare: false,
    lastCompleted: daysAgo(395)
  }
];

let state = loadState();
let activeFrequency = "all";
let searchTerm = "";
let ownerFilter = "all";
let showCompleted = true;

const board = document.querySelector("#chore-board");
const groupTemplate = document.querySelector("#group-template");
const taskTemplate = document.querySelector("#task-template");
const dialog = document.querySelector("#task-dialog");
const form = document.querySelector("#task-form");

document.querySelector("#today-heading").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric"
}).format(new Date());

document.querySelectorAll(".nav-pill").forEach((button) => {
  button.addEventListener("click", () => {
    activeFrequency = button.dataset.filter;
    document.querySelectorAll(".nav-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill === button);
    });
    render();
  });
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

document.querySelector("#owner-filter").addEventListener("change", (event) => {
  ownerFilter = event.target.value;
  render();
});

document.querySelector("#show-completed").addEventListener("change", (event) => {
  showCompleted = event.target.checked;
  render();
});

document.querySelector("#open-add-task").addEventListener("click", () => {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
    dialog.classList.add("is-open");
  }
  form.elements.title.focus();
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  state = { tasks: cloneTasks(starterTasks) };
  saveState();
  render();
});

document.querySelector("#export-plan").addEventListener("click", () => {
  const text = buildExportText();
  navigator.clipboard?.writeText(text).then(() => toast("Plan copied to clipboard")).catch(() => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "home-rhythm-plan.txt";
    link.click();
    URL.revokeObjectURL(url);
  });
});

form.addEventListener("submit", (event) => {
  const submitterValue = event.submitter?.value;
  if (submitterValue === "cancel") {
    closeTaskDialog();
    return;
  }

  event.preventDefault();
  const data = new FormData(form);
  state.tasks.push({
    id: createId(),
    title: data.get("title").trim(),
    frequency: data.get("frequency"),
    owner: data.get("owner"),
    zone: data.get("zone").trim(),
    notes: data.get("notes").trim(),
    petCare: data.get("petCare") === "on",
    lastCompleted: null
  });
  saveState();
  form.reset();
  closeTaskDialog();
  render();
});

function render() {
  const tasks = filteredTasks();
  board.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No chores match these filters.";
    board.append(empty);
  }

  Object.keys(frequencyMeta).forEach((frequency) => {
    const groupTasks = tasks.filter((task) => task.frequency === frequency);
    if (!groupTasks.length) {
      return;
    }

    const group = groupTemplate.content.firstElementChild.cloneNode(true);
    group.querySelector("h3").textContent = frequencyMeta[frequency].label;
    group.querySelector(".group-count").textContent = `${groupTasks.length} item${groupTasks.length === 1 ? "" : "s"}`;
    group.querySelector(".group-cadence").textContent = frequencyMeta[frequency].cadence;

    const list = group.querySelector(".chore-list");
    groupTasks.sort(sortByUrgency).forEach((task) => list.append(renderTask(task)));
    board.append(group);
  });

  renderStats(tasks);
  renderBalance();
}

function renderTask(task) {
  const due = dueInfo(task);
  const card = taskTemplate.content.firstElementChild.cloneNode(true);
  card.classList.toggle("is-complete", due.status === "complete");
  card.querySelector("h4").textContent = task.title;
  card.querySelector(".task-notes").textContent = task.notes || "No notes yet.";

  const badge = card.querySelector(".status-badge");
  badge.className = `status-badge ${due.status}`;
  badge.textContent = due.label;

  const meta = card.querySelector(".task-meta");
  [
    task.owner,
    task.zone,
    task.petCare ? "Cat care" : null,
    task.lastCompleted ? `Last done ${formatRelative(task.lastCompleted)}` : "Never completed"
  ].filter(Boolean).forEach((text) => {
    const item = document.createElement("span");
    item.textContent = text;
    meta.append(item);
  });

  card.querySelector(".check-button").addEventListener("click", () => {
    task.lastCompleted = todayISO();
    saveState();
    render();
  });

  card.querySelector(".delete-task").addEventListener("click", () => {
    state.tasks = state.tasks.filter((candidate) => candidate.id !== task.id);
    saveState();
    render();
  });

  return card;
}

function renderStats(visibleTasks) {
  const allTasks = state.tasks;
  const dueTasks = allTasks.filter((task) => ["due", "overdue"].includes(dueInfo(task).status));
  const attentionTasks = allTasks.filter((task) => dueInfo(task).status === "overdue");

  document.querySelector("#due-count").textContent = dueTasks.length;
  document.querySelector("#cat-count").textContent = allTasks.filter((task) => task.petCare).length;
  document.querySelector("#outdoor-count").textContent = allTasks.filter((task) => /garage|yard|exterior|front|back/i.test(`${task.zone} ${task.title}`)).length;
  document.querySelector("#attention-count").textContent = attentionTasks.length;

  const completable = visibleTasks.filter((task) => dueInfo(task).status !== "scheduled");
  const complete = completable.filter((task) => dueInfo(task).status === "complete").length;
  const percent = completable.length ? Math.round((complete / completable.length) * 100) : 100;
  const ring = document.querySelector(".ring-progress");
  ring.style.strokeDashoffset = 320 - (320 * percent) / 100;
  document.querySelector("#progress-value").textContent = `${percent}%`;
}

function renderBalance() {
  const container = document.querySelector("#balance-bars");
  container.replaceChildren();
  const owners = ["You", "Partner", "Shared"];
  const counts = Object.fromEntries(owners.map((owner) => [owner, state.tasks.filter((task) => task.owner === owner).length]));
  const max = Math.max(...Object.values(counts), 1);

  owners.forEach((owner) => {
    const row = document.createElement("div");
    row.className = "balance-row";
    row.innerHTML = `
      <div><span>${owner}</span><span>${counts[owner]} items</span></div>
      <div class="bar"><span style="width: ${(counts[owner] / max) * 100}%"></span></div>
    `;
    container.append(row);
  });
}

function filteredTasks() {
  return state.tasks.filter((task) => {
    const due = dueInfo(task);
    const haystack = `${task.title} ${task.frequency} ${task.owner} ${task.zone} ${task.notes}`.toLowerCase();
    return (activeFrequency === "all" || task.frequency === activeFrequency)
      && (ownerFilter === "all" || task.owner === ownerFilter)
      && (showCompleted || due.status !== "complete")
      && (!searchTerm || haystack.includes(searchTerm));
  });
}

function dueInfo(task) {
  if (!task.lastCompleted) {
    return { status: "overdue", label: "Needs first pass", daysUntil: -999 };
  }

  const elapsed = daysBetween(task.lastCompleted, todayISO());
  const interval = frequencyMeta[task.frequency].days;

  if (elapsed === 0) {
    return { status: "complete", label: "Done today", daysUntil: interval };
  }

  if (elapsed >= interval) {
    const lateBy = elapsed - interval;
    return {
      status: lateBy > 0 ? "overdue" : "due",
      label: lateBy > 0 ? `${lateBy}d overdue` : "Due today",
      daysUntil: -lateBy
    };
  }

  return {
    status: "scheduled",
    label: `Due in ${interval - elapsed}d`,
    daysUntil: interval - elapsed
  };
}

function sortByUrgency(a, b) {
  return dueInfo(a).daysUntil - dueInfo(b).daysUntil || a.title.localeCompare(b.title);
}

function buildExportText() {
  const lines = ["Home Rhythm Chore Plan", `Exported ${new Date().toLocaleString()}`, ""];
  Object.keys(frequencyMeta).forEach((frequency) => {
    lines.push(frequencyMeta[frequency].label.toUpperCase());
    state.tasks
      .filter((task) => task.frequency === frequency)
      .sort(sortByUrgency)
      .forEach((task) => {
        const pet = task.petCare ? " | cat care" : "";
        lines.push(`- ${task.title} (${task.owner}, ${task.zone}${pet})`);
        if (task.notes) {
          lines.push(`  ${task.notes}`);
        }
      });
    lines.push("");
  });
  return lines.join("\n");
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.tasks?.length) {
      return stored;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { tasks: cloneTasks(starterTasks) };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function daysAgo(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startISO, endISO) {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  return Math.floor((end - start) / MS_PER_DAY);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatRelative(iso) {
  const days = daysBetween(iso, todayISO());
  if (days === 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return `${days} days ago`;
}

function toast(message) {
  const notice = document.createElement("div");
  notice.className = "empty-state";
  notice.style.position = "fixed";
  notice.style.right = "18px";
  notice.style.bottom = "18px";
  notice.style.zIndex = "10";
  notice.textContent = message;
  document.body.append(notice);
  setTimeout(() => notice.remove(), 1800);
}

function closeTaskDialog() {
  dialog.classList.remove("is-open");
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function cloneTasks(tasks) {
  if (typeof structuredClone === "function") {
    return structuredClone(tasks);
  }
  return JSON.parse(JSON.stringify(tasks));
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

render();
