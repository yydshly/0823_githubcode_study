declare global {
  interface Window {
    __FRIDGE_TONIGHT__?: {
      snapshot: () => FridgeSnapshot;
      reset: () => FridgeSnapshot;
    };
  }
}

type IngredientId = "tomato" | "spinach" | "tofu" | "mushroom" | "milk" | "eggs";

type Ingredient = {
  id: IngredientId;
  name: string;
  expiry: number;
  date: string;
  color: string;
};

type Menu = {
  id: string;
  title: string;
  description: string;
  missing: string[];
  required: IngredientId[];
};

type FridgeSnapshot = {
  ready: boolean;
  revision: string;
  selected: IngredientId[];
  selectedNames: string[];
  selectionCount: number;
  eligible: boolean;
  menuId: string;
  menuTitle: string;
  missingItems: string[];
  timelineMarks: number;
  saved: boolean;
  renderer: "dom-css-inline-svg";
  reducedMotion: boolean;
  horizontalOverflow: boolean;
};

export {};

const STORAGE_KEY = "kage-fridge-tonight-v1";
const MIN_SELECTION = 2;
const MAX_SELECTION = 4;
const SVG_NS = "http://www.w3.org/2000/svg";

const ingredients: Ingredient[] = [
  { id: "tomato", name: "番茄", expiry: 1, date: "09.03", color: "#ed6047" },
  { id: "spinach", name: "菠菜", expiry: 1, date: "09.03", color: "#3b6d47" },
  { id: "tofu", name: "豆腐", expiry: 2, date: "09.04", color: "#d09b58" },
  { id: "mushroom", name: "香菇", expiry: 2, date: "09.04", color: "#7b503a" },
  { id: "milk", name: "鲜奶", expiry: 3, date: "09.05", color: "#3975c7" },
  { id: "eggs", name: "鸡蛋", expiry: 4, date: "09.06", color: "#d69213" },
];

const menus: Menu[] = [
  {
    id: "tomato-egg-rice",
    title: "番茄滑蛋盖饭",
    description: "先把最早到期的番茄炒软，再让鸡蛋把酸甜汤汁收进今晚这一碗。",
    missing: ["米饭", "小葱"],
    required: ["tomato", "eggs"],
  },
  {
    id: "mushroom-tofu",
    title: "菌菇烧豆腐",
    description: "香菇先煸出香气，豆腐随后入锅，让两样同批到期的食材在一只浅锅里完成。",
    missing: ["小葱", "生抽"],
    required: ["tofu", "mushroom"],
  },
  {
    id: "spinach-omelette",
    title: "菠菜厚蛋卷",
    description: "把菠菜切细拌进蛋液，做成一份可以直接端上桌的柔软厚蛋卷。",
    missing: ["黑胡椒"],
    required: ["spinach", "eggs"],
  },
  {
    id: "milk-steamed-egg",
    title: "奶香蒸蛋",
    description: "鲜奶与蛋液慢慢蒸成柔软的一碗，适合把今晚收得简单、温和。",
    missing: ["小葱"],
    required: ["milk", "eggs"],
  },
  {
    id: "tomato-tofu-soup",
    title: "番茄豆腐暖汤",
    description: "番茄先煮出汤底，再放进豆腐，小锅就能完成独居晚餐的主体。",
    missing: ["生姜", "米饭"],
    required: ["tomato", "tofu"],
  },
  {
    id: "greens-mushroom-noodles",
    title: "菌菇青蔬拌面",
    description: "香菇与菠菜分次下锅，保留各自口感，再和热面一起拌匀。",
    missing: ["面条"],
    required: ["spinach", "mushroom"],
  },
];

const ingredientById = new Map(ingredients.map((item) => [item.id, item]));
const selected = new Set<IngredientId>();
let activeMenu: Menu | null = null;
let saved = false;
let restored = false;
let limitTimer = 0;

const html = document.documentElement;
const root = document.querySelector<HTMLElement>("[data-fridge-root]");
const ingredientButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-fridge-ingredient]"));
const selectionTicket = document.querySelector<HTMLElement>(".selection-ticket");
const selectionStatus = document.querySelector<HTMLElement>("#selection-status");
const selectionDetail = document.querySelector<HTMLElement>("#selection-detail");
const timelineEmpty = document.querySelector<SVGTextElement>("#timeline-empty");
const timelineMarks = document.querySelector<SVGGElement>("#freshness-marks");
const freshnessChartDesc = document.querySelector<SVGDescElement>("#freshness-chart-desc");
const result = document.querySelector<HTMLElement>("[data-fridge-result]");
const menuKicker = document.querySelector<HTMLElement>("#menu-kicker");
const menuTitle = document.querySelector<HTMLElement>("#menu-title");
const menuDescription = document.querySelector<HTMLElement>("#menu-description");
const chosenItems = document.querySelector<HTMLUListElement>("#chosen-items");
const missingItems = document.querySelector<HTMLUListElement>("#missing-items");
const priorityNote = document.querySelector<HTMLElement>("#priority-note");
const saveNote = document.querySelector<HTMLElement>("#save-note");
const saveButton = document.querySelector<HTMLButtonElement>("#save-plan");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-plan");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revision = new URLSearchParams(window.location.search).get("revision") || "r143-direct";

function orderedSelection(): Ingredient[] {
  return ingredients.filter((item) => selected.has(item.id));
}

function makeList(target: HTMLUListElement | null, values: string[], fallback: string) {
  if (!target) return;
  target.replaceChildren();
  const rows = values.length ? values : [fallback];
  rows.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    target.append(item);
  });
}

function chooseMenu(items: Ingredient[]): Menu | null {
  if (items.length < MIN_SELECTION) return null;
  const ids = new Set(items.map((item) => item.id));
  const matched = menus.find((menu) => menu.required.every((id) => ids.has(id)));
  if (matched) return matched;

  return {
    id: "fridge-skillet",
    title: "今晚清冰箱煎饼",
    description: "把已选食材切成适口大小，用一只平底锅把它们收进同一份热晚餐。",
    missing: ["面粉", "黑胡椒"],
    required: items.slice(0, 2).map((item) => item.id),
  };
}

function setText(element: HTMLElement | null, value: string) {
  if (element) element.textContent = value;
}

function clearLimitNotice() {
  if (limitTimer) window.clearTimeout(limitTimer);
  limitTimer = 0;
  if (selectionTicket) selectionTicket.dataset.limit = "false";
}

function showLimitNotice() {
  clearLimitNotice();
  if (selectionTicket) selectionTicket.dataset.limit = "true";
  setText(selectionStatus, "今晚最多选 4 样。先撤回一种，再换别的。 ");
  setText(selectionDetail, "4 / 4 已选 · 已有食材不会被静默替换");
  limitTimer = window.setTimeout(() => {
    limitTimer = 0;
    if (selectionTicket) selectionTicket.dataset.limit = "false";
    renderStatus();
  }, reducedMotion ? 900 : 1800);
}

function renderButtons() {
  ingredientButtons.forEach((button) => {
    const id = button.dataset.fridgeIngredient as IngredientId;
    const isSelected = selected.has(id);
    button.setAttribute("aria-pressed", String(isSelected));
    button.dataset.selected = String(isSelected);
    const magnet = button.querySelector<HTMLElement>(".ingredient__magnet");
    if (magnet) magnet.textContent = isSelected ? "✓" : "+";
  });
}

function renderStatus() {
  const count = selected.size;
  if (count < MIN_SELECTION) {
    const remaining = MIN_SELECTION - count;
    setText(selectionStatus, `还差 ${remaining} 样，才能组成今晚。`);
    setText(selectionDetail, `${count} / ${MAX_SELECTION} 已选 · 再点一次即可撤回`);
    return;
  }

  if (count < MAX_SELECTION) {
    setText(selectionStatus, "今晚的组合已经成立，还可以再加。 ");
    setText(selectionDetail, `${count} / ${MAX_SELECTION} 已选 · 菜单与补买已同步`);
    return;
  }

  setText(selectionStatus, "四样刚好，今晚已经排好。 ");
  setText(selectionDetail, `${count} / ${MAX_SELECTION} 已选 · 点任一食材即可撤回`);
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string>) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function renderTimeline(items: Ingredient[]) {
  if (!timelineMarks) return;
  timelineMarks.replaceChildren();
  if (timelineEmpty) {
    timelineEmpty.hidden = items.length > 0;
    timelineEmpty.style.display = items.length > 0 ? "none" : "";
  }

  const occupancy = new Map<number, number>();
  const totals = new Map<number, number>();
  items.forEach((item) => totals.set(item.expiry, (totals.get(item.expiry) || 0) + 1));
  items.forEach((item) => {
    const lane = occupancy.get(item.expiry) || 0;
    occupancy.set(item.expiry, lane + 1);
    const peers = totals.get(item.expiry) || 1;
    const offset = peers === 1 ? 0 : lane === 0 ? -24 : 24;
    const x = 91 + (item.expiry / 4) * 818 + offset;
    const labelY = lane ? 94 : 60;
    const group = svgElement("g", {
      class: "freshness-mark",
      style: `color:${item.color};animation-delay:${lane * 70}ms`,
      "data-fridge-timeline-item": item.id,
      "aria-label": `${item.name}，演示剩余 ${item.expiry} 天`,
    });
    const line = svgElement("line", { x1: String(x), y1: String(labelY + 20), x2: String(x), y2: "150" });
    const circle = svgElement("circle", { cx: String(x), cy: "150", r: "11" });
    const days = svgElement("text", { class: "freshness-days", x: String(x), y: String(labelY) });
    days.textContent = `${item.expiry}d`;
    const name = svgElement("text", { x: String(x), y: String(labelY + 18) });
    name.textContent = item.name;
    group.append(line, circle, days, name);
    timelineMarks.append(group);
  });

  if (freshnessChartDesc) {
    freshnessChartDesc.textContent = items.length
      ? `${items.map((item) => `${item.name}剩余${item.expiry}天`).join("，")}。日期和天数均为概念演示。`
      : "选择食材后，每样食材会按演示剩余天数出现在今天到四天后的时间线上。";
  }
}

function renderMenu(items: Ingredient[]) {
  activeMenu = chooseMenu(items);
  makeList(chosenItems, items.map((item) => `${item.name} · ${item.date}`), "尚未选择");

  if (!activeMenu) {
    const remaining = Math.max(0, MIN_SELECTION - items.length);
    setText(menuKicker, "还没有组成晚餐");
    if (menuTitle) menuTitle.innerHTML = `再选 ${remaining} 样，<br />今晚就有答案。`;
    setText(menuDescription, "优先从最早到期的食材开始。菜单会使用同一选择状态生成并即时撤回。");
    makeList(missingItems, [], "完成选择后生成补买清单");
    setText(priorityNote, items.length ? `今晚优先：${items[0].name} · 演示剩余 ${items[0].expiry} 天` : "今晚优先：等待选择");
    return;
  }

  const requiredIds = new Set(activeMenu.required);
  const extras = items.filter((item) => !requiredIds.has(item.id));
  const extraCopy = extras.length
    ? `另外把${extras.map((item) => item.name).join("、")}作为配菜同桌使用，不留在冰箱里。`
    : "两样食材都进入这份晚餐，不留下孤零零的边角。";
  setText(menuKicker, `用掉 ${items.length} 样 · 概念菜单`);
  setText(menuTitle, activeMenu.title);
  setText(menuDescription, `${activeMenu.description}${extraCopy}`);
  makeList(missingItems, activeMenu.missing, "无需额外补买");
  const first = [...items].sort((a, b) => a.expiry - b.expiry)[0];
  setText(priorityNote, `今晚优先：${first.name} · 演示剩余 ${first.expiry} 天`);
}

function renderSaveState(eligible: boolean) {
  if (saveButton) {
    saveButton.disabled = !eligible;
    saveButton.dataset.saved = String(saved);
    const label = saveButton.querySelector<HTMLElement>("span");
    if (label) label.textContent = saved ? "今晚清单已保存" : "保存今晚清单";
  }

  if (saved) {
    setText(saveNote, restored ? "已从这台设备恢复今晚清单" : "已保存到这台设备 · 可随时撤回重选");
  } else if (eligible) {
    setText(saveNote, "菜单已成立，确认后保存到这台设备");
  } else {
    setText(saveNote, "清单尚未保存");
  }
}

function updateDatasets(eligible: boolean) {
  const state = saved ? "saved" : eligible ? "eligible" : selected.size ? "active" : "initial";
  html.dataset.fridgeReady = "true";
  html.dataset.fridgeSaved = String(saved);
  html.dataset.fridgeSelectionCount = String(selected.size);
  if (root) {
    root.dataset.fridgeReady = "true";
    root.dataset.fridgeSaved = String(saved);
    root.dataset.fridgeSelectionCount = String(selected.size);
    root.dataset.fridgeEligible = String(eligible);
    root.dataset.fridgeState = state;
    root.dataset.fridgeMenu = activeMenu?.id || "none";
    root.dataset.fridgeTimelineCount = String(selected.size);
  }
  if (result) result.dataset.fridgeMenu = activeMenu?.id || "none";
}

function render() {
  const items = orderedSelection();
  const eligible = items.length >= MIN_SELECTION && items.length <= MAX_SELECTION;
  renderButtons();
  renderStatus();
  renderTimeline(items);
  renderMenu(items);
  renderSaveState(eligible);
  updateDatasets(eligible);
  window.dispatchEvent(new CustomEvent("fridge-tonight:updated", { detail: snapshot() }));
}

function revokeSavedState() {
  if (!saved && !restored) return;
  saved = false;
  restored = false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable; the live interaction remains fully usable.
  }
}

function toggleIngredient(id: IngredientId) {
  if (selected.has(id)) {
    clearLimitNotice();
    selected.delete(id);
    revokeSavedState();
    render();
    return;
  }

  if (selected.size >= MAX_SELECTION) {
    showLimitNotice();
    return;
  }

  clearLimitNotice();
  selected.add(id);
  revokeSavedState();
  render();
}

function savePlan() {
  if (!activeMenu || selected.size < MIN_SELECTION || selected.size > MAX_SELECTION) return;
  const payload = {
    selected: orderedSelection().map((item) => item.id),
    menuId: activeMenu.id,
    savedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    setText(saveNote, "浏览器未允许本地保存；当前清单仍会保留到刷新前");
    return;
  }
  saved = true;
  restored = false;
  render();
}

function reset(): FridgeSnapshot {
  clearLimitNotice();
  selected.clear();
  saved = false;
  restored = false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The visible reset still succeeds when storage is unavailable.
  }
  render();
  ingredientButtons[0]?.focus({ preventScroll: true });
  return snapshot();
}

function restore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const payload = JSON.parse(raw) as { selected?: unknown };
    if (!Array.isArray(payload.selected)) return;
    const valid = payload.selected.filter(
      (id): id is IngredientId => typeof id === "string" && ingredientById.has(id as IngredientId),
    );
    if (valid.length < MIN_SELECTION || valid.length > MAX_SELECTION) return;
    valid.forEach((id) => selected.add(id));
    saved = true;
    restored = true;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore inaccessible storage and start from the readable base state.
    }
  }
}

function snapshot(): FridgeSnapshot {
  const items = orderedSelection();
  return {
    ready: html.dataset.fridgeReady === "true",
    revision,
    selected: items.map((item) => item.id),
    selectedNames: items.map((item) => item.name),
    selectionCount: items.length,
    eligible: items.length >= MIN_SELECTION && items.length <= MAX_SELECTION,
    menuId: activeMenu?.id || "none",
    menuTitle: activeMenu?.title || "",
    missingItems: activeMenu ? [...activeMenu.missing] : [],
    timelineMarks: timelineMarks?.childElementCount || 0,
    saved,
    renderer: "dom-css-inline-svg",
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}

ingredientButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.fridgeIngredient as IngredientId;
    if (ingredientById.has(id)) toggleIngredient(id);
  });
});

saveButton?.addEventListener("click", savePlan);
resetButton?.addEventListener("click", reset);

restore();
render();
window.__FRIDGE_TONIGHT__ = { snapshot, reset };
