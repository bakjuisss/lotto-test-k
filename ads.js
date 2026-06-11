function getAdsConfig() {
  const config = window.ADS_CONFIG || {};
  const publisherId = String(config.publisherId || "").trim();
  const leftSlot = String(config.leftSlot || "").trim();
  const rightSlot = String(config.rightSlot || "").trim();

  if (!publisherId || !publisherId.startsWith("ca-pub-")) return null;
  if (!leftSlot && !rightSlot) return null;

  return { publisherId, leftSlot, rightSlot };
}

function showAdPlaceholder(sidebarEl, label) {
  if (!sidebarEl || sidebarEl.querySelector(".ad-placeholder")) return;

  const placeholder = document.createElement("div");
  placeholder.className = "ad-placeholder";
  placeholder.innerHTML = `
    <p class="ad-placeholder-title">Google 광고</p>
    <p class="ad-placeholder-desc">${label}</p>
    <p class="ad-placeholder-hint">ads-config.js에<br>AdSense ID를 설정하세요</p>
  `;
  sidebarEl.querySelector(".ad-slot")?.appendChild(placeholder);
}

function configureAdUnit(unitEl, slotId, publisherId) {
  if (!unitEl || !slotId) return false;

  unitEl.setAttribute("data-ad-client", publisherId);
  unitEl.setAttribute("data-ad-slot", slotId);
  unitEl.style.display = "block";
  unitEl.style.width = "160px";
  unitEl.style.height = "600px";
  return true;
}

function loadAdSenseScript(publisherId) {
  return new Promise((resolve, reject) => {
    if (window.adsbygoogle) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-adsense="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("AdSense script load failed")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.adsense = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("AdSense script load failed"));
    document.head.appendChild(script);
  });
}

function pushAdUnits() {
  document.querySelectorAll("ins.adsbygoogle[data-ad-slot]").forEach(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore duplicate push */
    }
  });
}

async function initAds() {
  const config = getAdsConfig();
  const leftSidebar = document.getElementById("ad-sidebar-left");
  const rightSidebar = document.getElementById("ad-sidebar-right");
  const leftUnit = document.getElementById("ad-unit-left");
  const rightUnit = document.getElementById("ad-unit-right");

  if (!config) {
    showAdPlaceholder(leftSidebar, "좌측 배너");
    showAdPlaceholder(rightSidebar, "우측 배너");
    return;
  }

  const hasLeft = configureAdUnit(leftUnit, config.leftSlot, config.publisherId);
  const hasRight = configureAdUnit(rightUnit, config.rightSlot, config.publisherId);

  if (!hasLeft) showAdPlaceholder(leftSidebar, "좌측 배너");
  if (!hasRight) showAdPlaceholder(rightSidebar, "우측 배너");

  try {
    await loadAdSenseScript(config.publisherId);
    pushAdUnits();
  } catch {
    showAdPlaceholder(leftSidebar, "좌측 배너");
    showAdPlaceholder(rightSidebar, "우측 배너");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAds);
} else {
  initAds();
}
