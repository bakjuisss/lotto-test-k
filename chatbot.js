const chatMessagesEl = document.getElementById("chat-messages");
const chatInputEl = document.getElementById("chat-input");
const chatRecommendBtn = document.getElementById("chat-recommend-btn");

let isChatLoading = false;

function scrollChatToBottom() {
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function addChatMessage(role, html, extraClass = "") {
  const div = document.createElement("div");
  div.className = `chat-message ${role} ${extraClass}`.trim();
  div.innerHTML = html;
  chatMessagesEl.appendChild(div);
  scrollChatToBottom();
  return div;
}

function addWelcomeMessage() {
  addChatMessage(
    "bot",
    `<p>안녕하세요! 생년월일을 입력한 뒤 <strong>운세 기반 번호 추천</strong>을 누르면, 오늘의 운세와 사주팔자를 바탕으로 로또 번호와 추천 이유를 알려드립니다.</p>`
  );
}

function renderRecommendationBalls(numbers, bonus) {
  const wrap = document.createElement("div");
  wrap.className = "chat-balls";
  numbers.forEach((n) => wrap.appendChild(createBall(n, "", "small")));

  const plus = document.createElement("span");
  plus.className = "plus";
  plus.textContent = "+";
  wrap.appendChild(plus);
  wrap.appendChild(createBall(bonus, "", "small"));
  return wrap.outerHTML;
}

function showRecommendedNumbers(numbers, bonus) {
  if (typeof resetMachine !== "function") return;

  resetMachine();
  numbers.forEach((n, i) => {
    if (slotElements[i]) {
      slotElements[i].appendChild(createBall(n, "landed"));
      slotElements[i].classList.add("filled");
    }
  });
  bonusAreaEl.hidden = false;
  bonusSlotEl.innerHTML = "";
  bonusSlotEl.appendChild(createBall(bonus, "landed", "bonus"));
  bonusSlotEl.classList.add("filled");
  drawStatusEl.textContent = "AI 추천 번호가 적용되었습니다.";
}

async function requestRecommendation() {
  if (isChatLoading) return;

  const birthdate = typeof updateBirthdateState === "function" ? updateBirthdateState() : null;
  if (!birthdate) {
    addChatMessage("bot", "<p>먼저 생년월일을 올바르게 입력해 주세요.</p>", "error");
    return;
  }

  const message = chatInputEl.value.trim();
  if (message) {
    addChatMessage("user", `<p>${escapeHtml(message)}</p>`);
    chatInputEl.value = "";
  }

  isChatLoading = true;
  chatRecommendBtn.disabled = true;
  chatRecommendBtn.textContent = "분석 중...";

  const loadingEl = addChatMessage(
    "bot",
    `<p>${formatBirthdate(birthdate)}생 님의 운세와 사주를 분석하고 있습니다...</p>`,
    "loading"
  );

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthdate, message }),
    });

    const data = await res.json();
    loadingEl.remove();

    if (!res.ok) {
      addChatMessage("bot", `<p>${escapeHtml(data.error || "추천 요청에 실패했습니다.")}</p>`, "error");
      return;
    }

    const ballsHtml = renderRecommendationBalls(data.numbers, data.bonus);
    addChatMessage(
      "bot",
      `
        <p class="chat-label">오늘의 운세</p>
        <p>${escapeHtml(data.fortune_summary)}</p>
        <p class="chat-label">오늘의 사주팔자</p>
        <p>${escapeHtml(data.saju_summary)}</p>
        <p class="chat-label">추천 번호</p>
        ${ballsHtml}
        <p class="chat-label">추천 이유</p>
        <p>${escapeHtml(data.reasoning)}</p>
        <button type="button" class="btn-apply" data-apply="true">추천 번호 추첨기에 적용</button>
      `
    );

    const applyBtn = chatMessagesEl.querySelector('[data-apply="true"]:last-of-type');
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        showRecommendedNumbers(data.numbers, data.bonus);
        applyBtn.textContent = "적용 완료!";
        applyBtn.disabled = true;
      });
    }
  } catch {
    loadingEl.remove();
    addChatMessage(
      "bot",
      "<p>서버에 연결할 수 없습니다. Vercel에 배포된 사이트에서 API가 동작하는지 확인해 주세요.</p>",
      "error"
    );
  } finally {
    isChatLoading = false;
    chatRecommendBtn.disabled = false;
    chatRecommendBtn.textContent = "운세 기반 번호 추천";
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

chatRecommendBtn.addEventListener("click", requestRecommendation);

chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    requestRecommendation();
  }
});

addWelcomeMessage();
