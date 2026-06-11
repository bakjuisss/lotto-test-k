const SIGNUP_KEY = "lotto_ai_signup_done";
const SIGNUP_SKIP_KEY = "lotto_ai_signup_skipped";
const SIGNUP_DATA_KEY = "lotto_ai_signup_data";

const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const signupCloseBtn = document.getElementById("signup-close");
const signupSkipBtn = document.getElementById("signup-skip");
const signupSuccessEl = document.getElementById("signup-success");
const signupSubmitBtn = signupForm.querySelector(".btn-signup");
const signupDescEl = signupModal.querySelector(".modal-desc");
const DEFAULT_SIGNUP_DESC = signupDescEl.innerHTML;

let pendingAction = null;
let isRequiredSignup = false;

function getStoredSignupData() {
  try {
    return JSON.parse(localStorage.getItem(SIGNUP_DATA_KEY) || "null");
  } catch {
    return null;
  }
}

function isSignupCompleted() {
  if (localStorage.getItem(SIGNUP_KEY) !== "true") return false;

  const data = getStoredSignupData();
  return !!(data && data.name && data.phone && data.email);
}

function openSignupModal(options = {}) {
  const required = options.required === true;
  isRequiredSignup = required;

  if (!required) {
    const skippedAt = Number(localStorage.getItem(SIGNUP_SKIP_KEY) || 0);
    if (skippedAt && Date.now() - skippedAt < 24 * 60 * 60 * 1000) return;
  }

  if (isSignupCompleted()) return;

  signupForm.hidden = false;
  signupSuccessEl.hidden = true;
  signupSkipBtn.hidden = required;
  if (required) {
    signupDescEl.textContent =
      "추첨·AI 추천을 이용하려면 이름, 전화번호, 이메일을 입력해 주세요.";
  } else {
    signupDescEl.innerHTML = DEFAULT_SIGNUP_DESC;
  }

  signupModal.hidden = false;
  document.body.classList.add("modal-open");
  signupForm.querySelector("#signup-name").focus();
}

function closeSignupModal() {
  signupModal.hidden = true;
  document.body.classList.remove("modal-open");
  isRequiredSignup = false;
}

function cancelPendingSignup() {
  pendingAction = null;
}

function requireSignup(action) {
  if (isSignupCompleted()) {
    action();
    return;
  }

  pendingAction = action;
  openSignupModal({ required: true });
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setSubmitting(isSubmitting) {
  signupSubmitBtn.disabled = isSubmitting;
  signupSubmitBtn.textContent = isSubmitting ? "저장 중..." : "무료 가입하기";
}

async function saveSignupToSupabase(signupData) {
  const res = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: signupData.name,
      phone: signupData.phone,
      email: signupData.email,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "가입 정보 저장에 실패했습니다.");
  }

  return data;
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = signupForm.querySelector("#signup-name").value.trim();
  const phone = signupForm.querySelector("#signup-phone").value.trim();
  const email = signupForm.querySelector("#signup-email").value.trim();

  if (name.length < 2) {
    alert("이름을 2글자 이상 입력해 주세요.");
    return;
  }

  if (!validatePhone(phone)) {
    alert("올바른 휴대폰 번호를 입력해 주세요. (예: 01012345678)");
    return;
  }

  if (!validateEmail(email)) {
    alert("올바른 이메일 주소를 입력해 주세요.");
    return;
  }

  const signupData = {
    name,
    phone: phone.replace(/\D/g, ""),
    email,
    joinedAt: new Date().toISOString(),
  };

  setSubmitting(true);

  try {
    const result = await saveSignupToSupabase(signupData);

    if (result.joinedAt) {
      signupData.joinedAt = result.joinedAt;
    }

    localStorage.setItem(SIGNUP_KEY, "true");
    localStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(signupData));
    localStorage.removeItem(SIGNUP_SKIP_KEY);

    const nextAction = pendingAction;
    pendingAction = null;

    if (nextAction) {
      closeSignupModal();
      nextAction();
      return;
    }

    signupForm.hidden = true;
    signupSuccessEl.hidden = false;
    signupSuccessEl.querySelector("p").textContent =
      `${name}님, 가입이 완료되었습니다! 매주 AI 맞춤 번호를 보내 드릴게요.`;

    setTimeout(closeSignupModal, 2200);
  } catch (err) {
    alert(err.message || "가입 정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  } finally {
    setSubmitting(false);
  }
});

function handleSignupDismiss() {
  if (isRequiredSignup) {
    cancelPendingSignup();
    closeSignupModal();
    return;
  }

  localStorage.setItem(SIGNUP_SKIP_KEY, String(Date.now()));
  closeSignupModal();
}

signupCloseBtn.addEventListener("click", handleSignupDismiss);
signupSkipBtn.addEventListener("click", handleSignupDismiss);

signupModal.addEventListener("click", (e) => {
  if (e.target === signupModal) {
    handleSignupDismiss();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !signupModal.hidden) {
    handleSignupDismiss();
  }
});

window.showSignupModal = openSignupModal;
window.requireSignup = requireSignup;
window.isSignupCompleted = isSignupCompleted;
