import {
  getRemainingStudents,
  makeClass,
  normalizeState,
  parseStudentNames,
  reconcileStudents,
  secureRandomInt,
} from "./core.js";

const STORAGE_KEY = "random-class-caller:v1";

const elements = {
  breadcrumbClassName: document.querySelector("#breadcrumbClassName"),
  classDialog: document.querySelector("#classDialog"),
  classDialogEyebrow: document.querySelector("#classDialogEyebrow"),
  classDialogTitle: document.querySelector("#classDialogTitle"),
  classForm: document.querySelector("#classForm"),
  classInput: document.querySelector("#classInput"),
  classInputError: document.querySelector("#classInputError"),
  classList: document.querySelector("#classList"),
  classMeta: document.querySelector("#classMeta"),
  className: document.querySelector("#className"),
  classSubmitButton: document.querySelector("#classSubmitButton"),
  classTotal: document.querySelector("#classTotal"),
  classView: document.querySelector("#classView"),
  createClassSidebar: document.querySelector("#createClassSidebar"),
  createClassTop: document.querySelector("#createClassTop"),
  createFirstClass: document.querySelector("#createFirstClass"),
  deleteClass: document.querySelector("#deleteClass"),
  drawButton: document.querySelector("#drawButton"),
  drawHint: document.querySelector("#drawHint"),
  drawStage: document.querySelector("#drawStage"),
  emptyView: document.querySelector("#emptyView"),
  historyCount: document.querySelector("#historyCount"),
  historyEmpty: document.querySelector("#historyEmpty"),
  historyList: document.querySelector("#historyList"),
  liveStatus: document.querySelector("#liveStatus"),
  manageRoster: document.querySelector("#manageRoster"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  progressTrack: document.querySelector("#progressTrack"),
  renameClass: document.querySelector("#renameClass"),
  resetRound: document.querySelector("#resetRound"),
  resultCaption: document.querySelector("#resultCaption"),
  resultName: document.querySelector("#resultName"),
  rosterDialog: document.querySelector("#rosterDialog"),
  rosterDialogTitle: document.querySelector("#rosterDialogTitle"),
  rosterForm: document.querySelector("#rosterForm"),
  rosterInput: document.querySelector("#rosterInput"),
  rosterPreviewCount: document.querySelector("#rosterPreviewCount"),
  stageKicker: document.querySelector("#stageKicker"),
  storageStatus: document.querySelector("#storageStatus"),
  toast: document.querySelector("#toast"),
};

let state = loadState();
let classDialogMode = "create";
let toastTimer = null;
let revealTimer = null;
let ui = {
  drawing: false,
  drawingClassId: null,
  animationFrame: null,
};

function createEmptyState() {
  return {
    version: 1,
    classes: [],
    activeClassId: null,
    updatedAt: "",
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : createEmptyState();
  } catch (error) {
    console.warn("Unable to load saved classes.", error);
    return createEmptyState();
  }
}

function saveState() {
  state.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    elements.storageStatus.textContent = "本机自动保存";
  } catch (error) {
    console.warn("Unable to save classes.", error);
    elements.storageStatus.textContent = "保存失败";
    showToast("浏览器未能保存数据，请检查隐私或存储设置。");
  }
}

function getActiveClass() {
  return state.classes.find((classItem) => classItem.id === state.activeClassId) ?? null;
}

function getLastDrawnStudent(classItem) {
  const lastId = classItem.drawnIds.at(-1);
  return classItem.students.find((student) => student.id === lastId) ?? null;
}

function formatClassMeta(classItem) {
  const total = classItem.students.length;
  const drawn = classItem.drawnIds.length;
  const remaining = getRemainingStudents(classItem).length;

  if (total === 0) {
    return "尚未录入同学名单";
  }

  return `${total} 名同学 · 本轮已抽 ${drawn} 人 · 剩余 ${remaining} 人`;
}

function render() {
  renderClassList();
  renderMainView();
}

function renderClassList() {
  elements.classList.replaceChildren();
  elements.classTotal.textContent = `${state.classes.length} 个班级`;

  for (const classItem of state.classes) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const icon = document.createElement("span");
    const copy = document.createElement("span");
    const name = document.createElement("span");
    const meta = document.createElement("span");
    const count = document.createElement("span");
    const drawn = classItem.drawnIds.length;

    button.type = "button";
    button.className = `class-folder${classItem.id === state.activeClassId ? " is-active" : ""}`;
    button.setAttribute("aria-current", classItem.id === state.activeClassId ? "page" : "false");
    button.dataset.classId = classItem.id;
    button.addEventListener("click", () => selectClass(classItem.id));

    icon.className = "folder-icon";
    icon.setAttribute("aria-hidden", "true");

    copy.className = "folder-copy";
    name.className = "folder-name";
    name.textContent = classItem.name;
    meta.className = "folder-meta";
    meta.textContent =
      classItem.students.length === 0
        ? "待录入名单"
        : `${classItem.students.length} 名同学 · 已抽 ${drawn}`;

    count.className = "folder-count";
    count.textContent = String(classItem.students.length);

    copy.append(name, meta);
    button.append(icon, copy, count);
    item.append(button);
    elements.classList.append(item);
  }
}

function renderMainView() {
  const activeClass = getActiveClass();

  if (!activeClass) {
    elements.emptyView.hidden = false;
    elements.classView.hidden = true;
    return;
  }

  elements.emptyView.hidden = true;
  elements.classView.hidden = false;
  renderClassView(activeClass);
}

function renderClassView(classItem) {
  const remaining = getRemainingStudents(classItem);
  const total = classItem.students.length;
  const drawn = classItem.drawnIds.length;
  const completed = total > 0 && remaining.length === 0;
  const progress = total === 0 ? 0 : Math.round((drawn / total) * 100);
  const lastStudent = getLastDrawnStudent(classItem);

  elements.breadcrumbClassName.textContent = classItem.name;
  elements.className.textContent = classItem.name;
  elements.classMeta.textContent = formatClassMeta(classItem);
  elements.progressText.textContent = `${drawn} / ${total}`;
  elements.progressBar.style.width = `${progress}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(progress));
  elements.historyCount.textContent = `${drawn} 人`;

  if (ui.drawing && ui.drawingClassId === classItem.id) {
    elements.stageKicker.textContent = "DRAWING";
    elements.resultCaption.textContent = "正在从未抽名单中随机选择";
    elements.drawButton.textContent = "抽取中…";
    elements.drawButton.disabled = true;
  } else if (completed) {
    elements.stageKicker.textContent = "ROUND COMPLETE";
    elements.resultName.textContent = lastStudent?.name ?? "本轮完成";
    elements.resultCaption.textContent = "全班同学均已抽完，重新开始即可再次抽取";
    elements.drawButton.textContent = "本轮已抽完";
    elements.drawButton.disabled = true;
  } else if (lastStudent) {
    elements.stageKicker.textContent = "CURRENT RESULT";
    elements.resultName.textContent = lastStudent.name;
    elements.resultCaption.textContent = "本轮已抽到该同学，不会再次出现";
    elements.drawButton.textContent = "继续点名";
    elements.drawButton.disabled = false;
  } else if (total > 0) {
    elements.stageKicker.textContent = "READY";
    elements.resultName.textContent = "等待点名";
    elements.resultCaption.textContent = "点击下方按钮开始";
    elements.drawButton.textContent = "开始点名";
    elements.drawButton.disabled = false;
  } else {
    elements.stageKicker.textContent = "NEED ROSTER";
    elements.resultName.textContent = "先录入名单";
    elements.resultCaption.textContent = "保存同学姓名后即可开始点名";
    elements.drawButton.textContent = "请先录入名单";
    elements.drawButton.disabled = true;
  }

  elements.resetRound.disabled = drawn === 0 || ui.drawing;
  elements.manageRoster.textContent = total > 0 ? "录入 / 编辑名单" : "录入班级名单";

  if (total === 0) {
    elements.drawHint.textContent = "先录入名单，保存后系统会自动建立不放回式抽取池。";
  } else if (completed) {
    elements.drawHint.textContent = "本轮已完成。点击“重新抽一轮”后，全班同学会重新进入抽取池。";
  } else {
    elements.drawHint.textContent = "每位同学每次只会被抽中一次；抽中后会自动移出本轮名单。";
  }

  renderHistory(classItem);
}

function renderHistory(classItem) {
  const studentsById = new Map(classItem.students.map((student) => [student.id, student]));
  const drawnStudents = classItem.drawnIds
    .map((id) => studentsById.get(id))
    .filter(Boolean);

  elements.historyList.replaceChildren();
  elements.historyEmpty.hidden = drawnStudents.length > 0;
  elements.historyList.hidden = drawnStudents.length === 0;

  for (const [index, student] of [...drawnStudents].reverse().entries()) {
    const item = document.createElement("li");
    const order = document.createElement("span");
    const name = document.createElement("span");
    const originalOrder = drawnStudents.length - index;

    item.className = "history-item";
    order.className = "history-index";
    order.textContent = String(originalOrder).padStart(2, "0");
    name.className = "history-name";
    name.textContent = student.name;

    item.append(order, name);
    elements.historyList.append(item);
  }
}

function selectClass(classId) {
  if (classId === state.activeClassId) {
    return;
  }

  cancelDrawing();
  state.activeClassId = classId;
  saveState();
  render();
}

function openClassDialog(mode) {
  const activeClass = getActiveClass();
  classDialogMode = mode;
  elements.classInputError.textContent = "";

  if (mode === "rename" && activeClass) {
    elements.classDialogEyebrow.textContent = "RENAME FOLDER";
    elements.classDialogTitle.textContent = "重命名班级";
    elements.classSubmitButton.textContent = "保存名称";
    elements.classInput.value = activeClass.name;
  } else {
    elements.classDialogEyebrow.textContent = "NEW FOLDER";
    elements.classDialogTitle.textContent = "新建班级";
    elements.classSubmitButton.textContent = "创建班级";
    elements.classInput.value = "";
  }

  elements.classDialog.showModal();
  requestAnimationFrame(() => {
    elements.classInput.focus();
    elements.classInput.select();
  });
}

function submitClassForm(event) {
  event.preventDefault();
  const name = elements.classInput.value.trim();

  if (!name) {
    elements.classInputError.textContent = "请输入班级名称。";
    elements.classInput.focus();
    return;
  }

  const duplicate = state.classes.some(
    (classItem) =>
      classItem.name === name &&
      !(classDialogMode === "rename" && classItem.id === state.activeClassId),
  );

  if (duplicate) {
    elements.classInputError.textContent = "已有同名班级，请换一个名称。";
    elements.classInput.focus();
    return;
  }

  if (classDialogMode === "rename") {
    const activeClass = getActiveClass();

    if (!activeClass) {
      elements.classDialog.close();
      return;
    }

    activeClass.name = name;
    activeClass.updatedAt = new Date().toISOString();
    showToast("班级名称已更新。");
  } else {
    const classItem = makeClass(name);
    state.classes.push(classItem);
    state.activeClassId = classItem.id;
    showToast("班级文件夹已创建。");
  }

  elements.classDialog.close();
  saveState();
  render();
}

function openRosterDialog() {
  const activeClass = getActiveClass();

  if (!activeClass) {
    return;
  }

  elements.rosterDialogTitle.textContent = `${activeClass.name} · 班级名单`;
  elements.rosterInput.value = activeClass.students.map((student) => student.name).join("\n");
  updateRosterPreview();
  elements.rosterDialog.showModal();
  requestAnimationFrame(() => elements.rosterInput.focus());
}

function updateRosterPreview() {
  const count = parseStudentNames(elements.rosterInput.value).length;
  elements.rosterPreviewCount.textContent = `${count} 名同学`;
}

function submitRoster(event) {
  event.preventDefault();
  const activeClass = getActiveClass();

  if (!activeClass) {
    elements.rosterDialog.close();
    return;
  }

  const names = parseStudentNames(elements.rosterInput.value);

  if (names.length === 0 && activeClass.students.length > 0) {
    const shouldClear = window.confirm("确定清空这个班级的全部同学名单吗？");

    if (!shouldClear) {
      return;
    }
  }

  cancelDrawing();
  activeClass.students = reconcileStudents(activeClass.students, names);
  const validIds = new Set(activeClass.students.map((student) => student.id));
  activeClass.drawnIds = activeClass.drawnIds.filter((id) => validIds.has(id));
  activeClass.updatedAt = new Date().toISOString();

  elements.rosterDialog.close();
  saveState();
  render();
  showToast(names.length > 0 ? `已保存 ${names.length} 名同学。` : "班级名单已清空。");
}

function startDraw() {
  const activeClass = getActiveClass();

  if (!activeClass || ui.drawing) {
    return;
  }

  const remaining = getRemainingStudents(activeClass);

  if (remaining.length === 0) {
    showToast("本轮已经抽完，请先重新抽一轮。");
    return;
  }

  clearRevealState();
  ui.drawing = true;
  ui.drawingClassId = activeClass.id;
  elements.drawStage.classList.add("is-drawing");
  elements.drawStage.classList.remove("is-revealing");
  renderClassView(activeClass);

  const startTime = performance.now();
  const duration = 1050 + secureRandomInt(360);

  const animate = (now) => {
    const classStillActive = getActiveClass()?.id === activeClass.id;

    if (!ui.drawing || !classStillActive) {
      return;
    }

    const elapsed = now - startTime;

    if (elapsed < duration) {
      const currentPool = getRemainingStudents(activeClass);
      const candidate = currentPool[secureRandomInt(currentPool.length)];
      elements.resultName.textContent = candidate.name;
      elements.resultCaption.textContent = "正在高速随机选择…";
      ui.animationFrame = requestAnimationFrame(animate);
      return;
    }

    finishDraw(activeClass.id);
  };

  ui.animationFrame = requestAnimationFrame(animate);
}

function finishDraw(classId) {
  const activeClass = getActiveClass();

  if (!activeClass || activeClass.id !== classId) {
    cancelDrawing();
    return;
  }

  const remaining = getRemainingStudents(activeClass);

  if (remaining.length === 0) {
    cancelDrawing();
    renderClassView(activeClass);
    return;
  }

  const selected = remaining[secureRandomInt(remaining.length)];
  activeClass.drawnIds.push(selected.id);
  activeClass.updatedAt = new Date().toISOString();
  ui.drawing = false;
  ui.drawingClassId = null;
  ui.animationFrame = null;

  saveState();
  render();

  elements.drawStage.classList.remove("is-drawing");
  elements.drawStage.classList.add("is-revealing");
  elements.liveStatus.textContent = `本次抽到 ${selected.name}`;
  showRevealTimer();
}

function resetRound() {
  const activeClass = getActiveClass();

  if (!activeClass || activeClass.drawnIds.length === 0) {
    return;
  }

  const shouldReset = window.confirm("重新抽一轮后，本轮记录会被清空，所有同学重新进入抽取池。");

  if (!shouldReset) {
    return;
  }

  cancelDrawing();
  activeClass.drawnIds = [];
  activeClass.updatedAt = new Date().toISOString();
  saveState();
  render();
  showToast("已重新开始一轮。");
}

function deleteActiveClass() {
  const activeClass = getActiveClass();

  if (!activeClass) {
    return;
  }

  const confirmed = window.confirm(
    `确定删除“${activeClass.name}”吗？该班级的名单和点名记录会一起删除。`,
  );

  if (!confirmed) {
    return;
  }

  cancelDrawing();
  state.classes = state.classes.filter((classItem) => classItem.id !== activeClass.id);
  state.activeClassId = state.classes[0]?.id ?? null;
  saveState();
  render();
  showToast("班级已删除。");
}

function cancelDrawing() {
  if (ui.animationFrame !== null) {
    cancelAnimationFrame(ui.animationFrame);
  }

  ui.drawing = false;
  ui.drawingClassId = null;
  ui.animationFrame = null;
  elements.drawStage.classList.remove("is-drawing");
}

function clearRevealState() {
  if (revealTimer !== null) {
    clearTimeout(revealTimer);
    revealTimer = null;
  }

  elements.drawStage.classList.remove("is-revealing");
}

function showRevealTimer() {
  if (revealTimer !== null) {
    clearTimeout(revealTimer);
  }

  revealTimer = window.setTimeout(() => {
    elements.drawStage.classList.remove("is-revealing");
    revealTimer = null;
  }, 900);
}

function showToast(message) {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
  }

  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    toastTimer = null;
  }, 2400);
}

function closeDialogById(dialogId) {
  const dialog = document.getElementById(dialogId);

  if (dialog?.open) {
    dialog.close();
  }
}

function bindEvents() {
  elements.createClassTop.addEventListener("click", () => openClassDialog("create"));
  elements.createClassSidebar.addEventListener("click", () => openClassDialog("create"));
  elements.createFirstClass.addEventListener("click", () => openClassDialog("create"));
  elements.renameClass.addEventListener("click", () => openClassDialog("rename"));
  elements.deleteClass.addEventListener("click", deleteActiveClass);
  elements.manageRoster.addEventListener("click", openRosterDialog);
  elements.drawButton.addEventListener("click", startDraw);
  elements.resetRound.addEventListener("click", resetRound);
  elements.classForm.addEventListener("submit", submitClassForm);
  elements.rosterForm.addEventListener("submit", submitRoster);
  elements.rosterInput.addEventListener("input", updateRosterPreview);
  elements.classInput.addEventListener("input", () => {
    elements.classInputError.textContent = "";
  });

  for (const button of document.querySelectorAll("[data-close-dialog]")) {
    button.addEventListener("click", () => closeDialogById(button.dataset.closeDialog));
  }

  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    state = loadState();
    cancelDrawing();
    render();
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Service worker registration failed.", error);
  });
}

bindEvents();
render();
registerServiceWorker();
