const MIN = 1;
const MAX = 45;
const COUNT = 6;
const DRUM_SHAKE_MS = 820;
const DRUM_BALL_COUNT = 26;

const drumEl = document.getElementById("drum");
const drumInnerEl = document.getElementById("drum-inner");
const flyingBallEl = document.getElementById("flying-ball");
const resultSlotsEl = document.getElementById("result-slots");
const bonusAreaEl = document.getElementById("bonus-area");
const bonusSlotEl = document.getElementById("bonus-slot");
const drawStatusEl = document.getElementById("draw-status");
const drawBtn = document.getElementById("draw-btn");
const birthdateEl = document.getElementById("birthdate");
const birthdateHintEl = document.getElementById("birthdate-hint");
const birthdateErrorEl = document.getElementById("birthdate-error");
const setCountEl = document.getElementById("set-count");
const includeBonusEl = document.getElementById("include-bonus");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");
const clearHistoryBtn = document.getElementById("clear-history");

let isDrawing = false;
let slotElements = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBallColor(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

function pickUnique(count, exclude = []) {
  const pool = [];
  for (let i = MIN; i <= MAX; i++) {
    if (!exclude.includes(i)) pool.push(i);
  }

  const result = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result.sort((a, b) => a - b);
}

function createBall(num, extraClass = "", size = "normal") {
  const ball = document.createElement("span");
  ball.className = `ball ${size} ${getBallColor(num)} ${extraClass}`.trim();
  ball.textContent = num;
  return ball;
}

function formatPrize(amount, winners) {
  if (!amount) return "1등 미당첨";

  let text;
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    text = `${eok >= 10 ? Math.round(eok) : eok.toFixed(1).replace(/\.0$/, "")}억원`;
  } else if (amount >= 10000) {
    text = `${Math.round(amount / 10000).toLocaleString()}만원`;
  } else {
    text = `${amount.toLocaleString()}원`;
  }

  return winners > 0 ? `${text} · ${winners}명` : text;
}

function formatNumbers(numbers, bonus) {
  const main = numbers.join(", ");
  return bonus !== null ? `${main} + ${bonus}` : main;
}

function formatBirthdate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

function parseBirthdateInput(raw) {
  const value = String(raw).trim();
  if (!value) return null;

  const digitsOnly = value.replace(/\D/g, "");

  if (/^\d{8}$/.test(digitsOnly)) {
    const y = digitsOnly.slice(0, 4);
    const m = digitsOnly.slice(4, 6);
    const d = digitsOnly.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  const match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, "0");
    const d = match[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return null;
}

function validateBirthdate() {
  const raw = birthdateEl.value;

  if (!raw.trim()) {
    return { valid: false, message: "생년월일을 입력해 주세요.", birthdate: null };
  }

  const normalized = parseBirthdateInput(raw);
  if (!normalized) {
    return {
      valid: false,
      message: "19960504 또는 1996-05-04 형식으로 입력해 주세요.",
      birthdate: null,
    };
  }

  const [y, m, d] = normalized.split("-").map(Number);
  const birth = new Date(y, m - 1, d);

  if (
    Number.isNaN(birth.getTime()) ||
    birth.getFullYear() !== y ||
    birth.getMonth() !== m - 1 ||
    birth.getDate() !== d
  ) {
    return { valid: false, message: "존재하지 않는 날짜입니다.", birthdate: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  birth.setHours(0, 0, 0, 0);

  if (birth > today) {
    return { valid: false, message: "오늘 이후 날짜는 입력할 수 없습니다.", birthdate: null };
  }

  const minDate = new Date(1900, 0, 1);
  if (birth < minDate) {
    return { valid: false, message: "1900년 1월 1일 이후 날짜만 입력할 수 있습니다.", birthdate: null };
  }

  return { valid: true, message: "", birthdate: normalized };
}

function updateBirthdateState() {
  const result = validateBirthdate();

  if (!birthdateEl.value.trim()) {
    birthdateHintEl.textContent = "8자리(19960504) 또는 하이픈 형식(1996-05-04)으로 입력해 주세요.";
    birthdateHintEl.classList.remove("valid");
    birthdateErrorEl.hidden = true;
    drawBtn.disabled = true;
    return null;
  }

  if (!result.valid) {
    birthdateHintEl.textContent = "";
    birthdateErrorEl.textContent = result.message;
    birthdateErrorEl.hidden = false;
    drawBtn.disabled = true;
    return null;
  }

  birthdateErrorEl.hidden = true;
  birthdateHintEl.textContent = `${formatBirthdate(result.birthdate)}생 · 추첨 가능`;
  birthdateHintEl.classList.add("valid");
  drawBtn.disabled = isDrawing;
  return result.birthdate;
}

function randomDrumNumber() {
  return MIN + Math.floor(Math.random() * (MAX - MIN + 1));
}

function placeBallInDrum(ball) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 18 + Math.random() * 32;
  const x = 50 + Math.cos(angle) * radius * 0.38;
  const y = 50 + Math.sin(angle) * radius * 0.38;
  const tx = (2 + Math.random() * 7).toFixed(1);
  const ty = (2 + Math.random() * 7).toFixed(1);
  const rot = (4 + Math.random() * 14).toFixed(1);
  const depth = (0.82 + Math.random() * 0.28).toFixed(2);

  ball.style.left = `${x}%`;
  ball.style.top = `${y}%`;
  ball.style.setProperty("--tx", `${tx}px`);
  ball.style.setProperty("--ty", `${ty}px`);
  ball.style.setProperty("--rot", `${rot}deg`);
  ball.style.setProperty("--depth", depth);
  ball.style.setProperty("--dur", `${2.2 + Math.random() * 2.4}s`);
  ball.style.setProperty("--delay", `${Math.random() * 2.5}s`);
}

function initDrumBalls() {
  drumInnerEl.innerHTML = "";
  const used = new Set();

  for (let i = 0; i < DRUM_BALL_COUNT; i++) {
    let num = randomDrumNumber();
    while (used.size < MAX && used.has(num)) {
      num = randomDrumNumber();
    }
    used.add(num);

    const ball = createBall(num, "drum-ball", "tiny");
    placeBallInDrum(ball);
    drumInnerEl.appendChild(ball);
  }
}

function setDrumTumble(active) {
  drumInnerEl.classList.toggle("tumbling", active);
  drumEl.classList.toggle("active-draw", active);
}

function scatterDrumBalls() {
  drumInnerEl.querySelectorAll(".drum-ball").forEach((ball) => {
    placeBallInDrum(ball);
  });
}

function initResultSlots() {
  resultSlotsEl.innerHTML = "";
  slotElements = [];
  for (let i = 0; i < COUNT; i++) {
    const slot = document.createElement("div");
    slot.className = "result-slot";
    slot.setAttribute("aria-label", `${i + 1}번째 번호`);
    resultSlotsEl.appendChild(slot);
    slotElements.push(slot);
  }
}

function resetMachine() {
  initResultSlots();
  bonusAreaEl.hidden = true;
  bonusSlotEl.innerHTML = "";
  flyingBallEl.hidden = true;
  flyingBallEl.className = "flying-ball";
  drumEl.classList.remove("shaking", "spinning", "active-draw");
  drumInnerEl.classList.remove("tumbling");
}

function getRelativeCenter(el, container) {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: elRect.left - containerRect.left + elRect.width / 2,
    y: elRect.top - containerRect.top + elRect.height / 2,
  };
}

async function ejectBall(num, targetSlot, size = "normal") {
  const stage = document.querySelector(".machine-stage");
  const chuteExit = document.querySelector(".chute-exit");

  setDrumTumble(true);
  drumEl.classList.add("shaking");
  scatterDrumBalls();
  await delay(DRUM_SHAKE_MS);
  drumEl.classList.remove("shaking");
  await delay(120);
  setDrumTumble(false);

  const start = getRelativeCenter(chuteExit, stage);
  const end = getRelativeCenter(targetSlot, stage);
  const ballSize = size === "bonus" ? 40 : 52;
  const spring = "cubic-bezier(0.32, 0.72, 0, 1)";

  flyingBallEl.textContent = num;
  flyingBallEl.className = `flying-ball ball ${size} ${getBallColor(num)}`;
  flyingBallEl.hidden = false;
  flyingBallEl.style.width = `${ballSize}px`;
  flyingBallEl.style.height = `${ballSize}px`;
  flyingBallEl.style.fontSize = size === "bonus" ? "1rem" : "1.25rem";
  flyingBallEl.style.left = `${start.x - ballSize / 2}px`;
  flyingBallEl.style.top = `${start.y - ballSize / 2}px`;
  flyingBallEl.style.transform = "scale(0.35) translateY(8px)";
  flyingBallEl.style.opacity = "0";
  flyingBallEl.style.filter = "blur(2px)";

  await delay(40);

  flyingBallEl.style.transition =
    `left 0.62s ${spring}, top 0.62s ${spring}, transform 0.62s ${spring}, opacity 0.28s ease, filter 0.45s ease`;
  flyingBallEl.style.transform = "scale(1) translateY(0)";
  flyingBallEl.style.opacity = "1";
  flyingBallEl.style.filter = "blur(0)";
  flyingBallEl.style.left = `${end.x - ballSize / 2}px`;
  flyingBallEl.style.top = `${end.y - ballSize / 2}px`;

  await delay(640);

  flyingBallEl.hidden = true;
  flyingBallEl.style.transition = "";
  flyingBallEl.style.filter = "";
  targetSlot.innerHTML = "";
  targetSlot.appendChild(createBall(num, "landed", size));
  targetSlot.classList.add("filled");
}

async function machineDraw(numbers, bonus, birthdate) {
  resetMachine();
  drawStatusEl.textContent = `${formatBirthdate(birthdate)}생 님, 추첨기 가동 중...`;
  setDrumTumble(true);
  drumEl.classList.add("active-draw");
  scatterDrumBalls();
  await delay(420);

  for (let i = 0; i < numbers.length; i++) {
    drawStatusEl.textContent = `${i + 1}번째 공을 꺼내는 중...`;
    await ejectBall(numbers[i], slotElements[i]);
    if (i < numbers.length - 1) {
      setDrumTumble(true);
      await delay(160);
    }
  }

  if (bonus !== null) {
    drawStatusEl.textContent = "보너스 공을 꺼내는 중...";
    bonusAreaEl.hidden = false;
    await delay(250);
    await ejectBall(bonus, bonusSlotEl, "bonus");
  }

  setDrumTumble(false);
  drumEl.classList.remove("active-draw");
  drawStatusEl.textContent = "추첨이 완료되었습니다!";
}

function updateHistoryEmptyState() {
  const hasItems = historyList.children.length > 0;
  if (historyEmptyEl) historyEmptyEl.hidden = hasItems;
  if (clearHistoryBtn) clearHistoryBtn.hidden = !hasItems;
}

function addHistoryEntry(numbers, bonus, birthdate) {
  const li = document.createElement("li");
  li.className = "history-item";

  const ballsWrap = document.createElement("div");
  ballsWrap.className = "history-balls";
  numbers.forEach((n) => ballsWrap.appendChild(createBall(n, "", "small")));

  if (bonus !== null) {
    const plus = document.createElement("span");
    plus.textContent = "+";
    plus.className = "plus";
    ballsWrap.appendChild(plus);
    ballsWrap.appendChild(createBall(bonus, "", "small"));
  }

  const birthMeta = document.createElement("span");
  birthMeta.className = "history-birthdate";
  birthMeta.textContent = `${formatBirthdate(birthdate)}생`;

  const meta = document.createElement("span");
  meta.className = "history-meta";
  meta.textContent = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "복사";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(formatNumbers(numbers, bonus));
    copyBtn.textContent = "완료!";
    setTimeout(() => { copyBtn.textContent = "복사"; }, 1500);
  });

  const info = document.createElement("div");
  info.className = "history-info";
  info.appendChild(birthMeta);
  info.appendChild(meta);

  const right = document.createElement("div");
  right.className = "history-right";
  right.appendChild(info);
  right.appendChild(copyBtn);

  li.appendChild(ballsWrap);
  li.appendChild(right);
  historyList.prepend(li);
  updateHistoryEmptyState();

  if (typeof window.switchTab === "function") {
    window.switchTab("history");
  }
}

async function drawOnce(birthdate, showAnimation = true) {
  const numbers = pickUnique(COUNT);
  let bonus = null;

  if (includeBonusEl.checked) {
    const [b] = pickUnique(1, numbers);
    bonus = b;
  }

  if (showAnimation) {
    await machineDraw(numbers, bonus, birthdate);
    await delay(300);
  } else {
    resetMachine();
    numbers.forEach((n, i) => {
      slotElements[i].appendChild(createBall(n, "landed"));
      slotElements[i].classList.add("filled");
    });
    if (bonus !== null) {
      bonusAreaEl.hidden = false;
      bonusSlotEl.appendChild(createBall(bonus, "landed", "bonus"));
    }
  }

  addHistoryEntry(numbers, bonus, birthdate);
  return { numbers, bonus };
}

async function performDraw() {
  if (isDrawing) return;

  const birthdate = updateBirthdateState();
  if (!birthdate) return;

  isDrawing = true;
  drawBtn.disabled = true;
  drawBtn.textContent = "추첨 중...";

  const sets = parseInt(setCountEl.value, 10);

  for (let i = 0; i < sets; i++) {
    await drawOnce(birthdate, i === 0);
    if (i < sets - 1) {
      drawStatusEl.textContent = "다음 세트 준비 중...";
      await delay(500);
    }
  }

  isDrawing = false;
  drawBtn.textContent = "번호 추첨하기";
  updateBirthdateState();
}

function handleDraw() {
  if (isDrawing) return;

  const birthdate = updateBirthdateState();
  if (!birthdate) return;

  if (typeof window.requireAuth === "function") {
    window.requireAuth(performDraw);
    return;
  }

  performDraw();
}

drawBtn.addEventListener("click", handleDraw);
birthdateEl.addEventListener("input", updateBirthdateState);
birthdateEl.addEventListener("change", updateBirthdateState);
birthdateEl.addEventListener("blur", () => {
  const result = validateBirthdate();
  if (result.valid) {
    birthdateEl.value = result.birthdate;
    updateBirthdateState();
  }
});

clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  updateHistoryEmptyState();
});

initDrumBalls();
initResultSlots();
updateBirthdateState();
updateHistoryEmptyState();

// --- 역대 1등 당첨번호 ---
const winnersListEl = document.getElementById("winners-list");
const winnersCountEl = document.getElementById("winners-count");
const drawSearchEl = document.getElementById("draw-search");
const numberFilterEl = document.getElementById("number-filter");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfoEl = document.getElementById("page-info");

const PAGE_SIZE = 20;
let currentPage = 1;
let filteredWinners = [];

const allWinners = (window.LOTTO_WINNERS || []).slice().sort((a, b) => b.draw_no - a.draw_no);

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}.${m}.${d}`;
}

function applyWinnerFilters() {
  const drawQuery = drawSearchEl.value.trim();
  const numQuery = numberFilterEl.value.trim();

  filteredWinners = allWinners.filter((item) => {
    if (drawQuery && item.draw_no !== parseInt(drawQuery, 10)) return false;
    if (numQuery) {
      const num = parseInt(numQuery, 10);
      if (num < 1 || num > 45) return false;
      if (!item.numbers.includes(num) && item.bonus_no !== num) return false;
    }
    return true;
  });

  currentPage = 1;
  renderWinners();
}

function renderWinners() {
  const total = filteredWinners.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const latestDraw = allWinners.length > 0 ? allWinners[0].draw_no : 0;
  winnersCountEl.textContent = total > 0
    ? `총 ${total.toLocaleString()}회 (1~${latestDraw}회)`
    : "검색 결과 없음";

  winnersListEl.innerHTML = "";

  if (total === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "조건에 맞는 당첨번호가 없습니다.";
    winnersListEl.appendChild(empty);
  } else {
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredWinners.slice(start, start + PAGE_SIZE);

    pageItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "winner-item";

      const meta = document.createElement("div");
      meta.className = "winner-meta";
      meta.innerHTML = `
        <div class="winner-draw">${item.draw_no}회</div>
        <div class="winner-date">${formatDate(item.date)}</div>
        <div class="winner-prize">${formatPrize(item.first_prize, item.first_winners)}</div>
      `;

      const ballsWrap = document.createElement("div");
      ballsWrap.className = "winner-balls";
      item.numbers.forEach((n) => ballsWrap.appendChild(createBall(n, "", "small")));

      const plus = document.createElement("span");
      plus.className = "plus";
      plus.textContent = "+";
      ballsWrap.appendChild(plus);
      ballsWrap.appendChild(createBall(item.bonus_no, "", "small"));

      li.appendChild(meta);
      li.appendChild(ballsWrap);
      winnersListEl.appendChild(li);
    });
  }

  pageInfoEl.textContent = `${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages || total === 0;
}

drawSearchEl.addEventListener("input", applyWinnerFilters);
numberFilterEl.addEventListener("input", applyWinnerFilters);

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderWinners();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredWinners.length / PAGE_SIZE);
  if (currentPage < totalPages) {
    currentPage++;
    renderWinners();
  }
});

filteredWinners = allWinners;
renderWinners();
