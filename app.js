const MIN = 1;
const MAX = 45;
const COUNT = 6;
const DRUM_SHAKE_MS = 650;

const drumEl = document.getElementById("drum");
const drumInnerEl = document.getElementById("drum-inner");
const flyingBallEl = document.getElementById("flying-ball");
const resultSlotsEl = document.getElementById("result-slots");
const bonusAreaEl = document.getElementById("bonus-area");
const bonusSlotEl = document.getElementById("bonus-slot");
const drawStatusEl = document.getElementById("draw-status");
const drawBtn = document.getElementById("draw-btn");
const setCountEl = document.getElementById("set-count");
const includeBonusEl = document.getElementById("include-bonus");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
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

function initDrumBalls() {
  drumInnerEl.innerHTML = "";
  for (let i = MIN; i <= MAX; i++) {
    const ball = createBall(i, "drum-ball", "tiny");
    const angle = Math.random() * Math.PI * 2;
    const radius = 28 + Math.random() * 42;
    const x = 50 + Math.cos(angle) * radius * 0.35;
    const y = 50 + Math.sin(angle) * radius * 0.35;
    ball.style.left = `${x}%`;
    ball.style.top = `${y}%`;
    ball.style.animationDelay = `${Math.random() * 2}s`;
    ball.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    drumInnerEl.appendChild(ball);
  }
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
  drumEl.classList.remove("shaking", "spinning");
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

  drumEl.classList.add("shaking");
  await delay(DRUM_SHAKE_MS);
  drumEl.classList.remove("shaking");
  drumEl.classList.add("spinning");
  await delay(200);
  drumEl.classList.remove("spinning");

  const start = getRelativeCenter(chuteExit, stage);
  const end = getRelativeCenter(targetSlot, stage);
  const ballSize = size === "bonus" ? 40 : 52;

  flyingBallEl.textContent = num;
  flyingBallEl.className = `flying-ball ball ${size} ${getBallColor(num)}`;
  flyingBallEl.hidden = false;
  flyingBallEl.style.width = `${ballSize}px`;
  flyingBallEl.style.height = `${ballSize}px`;
  flyingBallEl.style.fontSize = size === "bonus" ? "1rem" : "1.25rem";
  flyingBallEl.style.left = `${start.x - ballSize / 2}px`;
  flyingBallEl.style.top = `${start.y - ballSize / 2}px`;
  flyingBallEl.style.transform = "scale(0.3)";
  flyingBallEl.style.opacity = "0";

  await delay(50);

  flyingBallEl.style.transition = "left 0.55s cubic-bezier(0.4, 0, 0.2, 1), top 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s";
  flyingBallEl.style.transform = "scale(1)";
  flyingBallEl.style.opacity = "1";
  flyingBallEl.style.left = `${end.x - ballSize / 2}px`;
  flyingBallEl.style.top = `${end.y - ballSize / 2}px`;

  await delay(580);

  flyingBallEl.hidden = true;
  flyingBallEl.style.transition = "";
  targetSlot.innerHTML = "";
  targetSlot.appendChild(createBall(num, "landed", size));
  targetSlot.classList.add("filled");
}

async function machineDraw(numbers, bonus) {
  resetMachine();
  drawStatusEl.textContent = "추첨기 가동 중...";
  await delay(300);

  for (let i = 0; i < numbers.length; i++) {
    drawStatusEl.textContent = `${i + 1}번째 공을 꺼내는 중...`;
    await ejectBall(numbers[i], slotElements[i]);
    await delay(180);
  }

  if (bonus !== null) {
    drawStatusEl.textContent = "보너스 공을 꺼내는 중...";
    bonusAreaEl.hidden = false;
    await delay(250);
    await ejectBall(bonus, bonusSlotEl, "bonus");
  }

  drawStatusEl.textContent = "추첨이 완료되었습니다!";
}

function addHistoryEntry(numbers, bonus) {
  historySection.hidden = false;

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

  const right = document.createElement("div");
  right.className = "history-right";
  right.appendChild(meta);
  right.appendChild(copyBtn);

  li.appendChild(ballsWrap);
  li.appendChild(right);
  historyList.prepend(li);
}

async function drawOnce(showAnimation = true) {
  const numbers = pickUnique(COUNT);
  let bonus = null;

  if (includeBonusEl.checked) {
    const [b] = pickUnique(1, numbers);
    bonus = b;
  }

  if (showAnimation) {
    await machineDraw(numbers, bonus);
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

  addHistoryEntry(numbers, bonus);
  return { numbers, bonus };
}

async function handleDraw() {
  if (isDrawing) return;
  isDrawing = true;
  drawBtn.disabled = true;
  drawBtn.textContent = "추첨 중...";

  const sets = parseInt(setCountEl.value, 10);

  for (let i = 0; i < sets; i++) {
    await drawOnce(i === 0);
    if (i < sets - 1) {
      drawStatusEl.textContent = "다음 세트 준비 중...";
      await delay(500);
    }
  }

  isDrawing = false;
  drawBtn.disabled = false;
  drawBtn.textContent = "번호 추첨하기";
}

drawBtn.addEventListener("click", handleDraw);

clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  historySection.hidden = true;
});

initDrumBalls();
initResultSlots();

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
