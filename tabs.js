const tabNav = document.getElementById("tab-nav");
const tabButtons = tabNav ? [...tabNav.querySelectorAll(".tab-btn")] : [];
const tabPanels = [...document.querySelectorAll(".tab-panel")];

const TAB_SUBTITLES = {
  draw: "20대 청년이 추첨기를 때려 공을 하나씩 꺼냅니다",
  ai: "생년월일·운세·사주팔자로 AI 번호를 추천받으세요",
  history: "지금까지 추첨한 번호 기록을 확인합니다",
  reviews: "AI 추천으로 당첨한 분들의 후기입니다",
  winners: "역대 로또 1등 당첨번호를 조회합니다",
};

function switchTab(tabId) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.id === `tab-${tabId}`;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  const subtitle = document.querySelector(".subtitle");
  if (subtitle && TAB_SUBTITLES[tabId]) {
    subtitle.textContent = TAB_SUBTITLES[tabId];
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

window.switchTab = switchTab;
switchTab("draw");
