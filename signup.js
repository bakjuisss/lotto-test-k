const SIGNUP_KEY = "lotto_ai_signup_done";
const SIGNUP_SKIP_KEY = "lotto_ai_signup_skipped";

const signupModal = document.getElementById("signup-modal");
const signupForm = document.getElementById("signup-form");
const signupCloseBtn = document.getElementById("signup-close");
const signupSkipBtn = document.getElementById("signup-skip");
const signupSuccessEl = document.getElementById("signup-success");

function isSignupCompleted() {
  return localStorage.getItem(SIGNUP_KEY) === "true";
}

function shouldShowSignupModal() {
  if (isSignupCompleted()) return false;
  const skippedAt = Number(localStorage.getItem(SIGNUP_SKIP_KEY) || 0);
  if (skippedAt && Date.now() - skippedAt < 24 * 60 * 60 * 1000) return false;
  return true;
}

function openSignupModal() {
  if (!shouldShowSignupModal()) return;

  signupForm.hidden = false;
  signupSuccessEl.hidden = true;
  signupModal.hidden = false;
  document.body.classList.add("modal-open");
  signupForm.querySelector("#signup-name").focus();
}

function closeSignupModal() {
  signupModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

signupForm.addEventListener("submit", (e) => {
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

  localStorage.setItem(SIGNUP_KEY, "true");
  localStorage.setItem("lotto_ai_signup_data", JSON.stringify(signupData));
  localStorage.removeItem(SIGNUP_SKIP_KEY);

  signupForm.hidden = true;
  signupSuccessEl.hidden = false;
  signupSuccessEl.querySelector("p").textContent =
    `${name}님, 가입이 완료되었습니다! 매주 AI 맞춤 번호를 보내 드릴게요.`;

  setTimeout(closeSignupModal, 2200);
});

signupCloseBtn.addEventListener("click", () => {
  localStorage.setItem(SIGNUP_SKIP_KEY, String(Date.now()));
  closeSignupModal();
});

signupSkipBtn.addEventListener("click", () => {
  localStorage.setItem(SIGNUP_SKIP_KEY, String(Date.now()));
  closeSignupModal();
});

signupModal.addEventListener("click", (e) => {
  if (e.target === signupModal) {
    localStorage.setItem(SIGNUP_SKIP_KEY, String(Date.now()));
    closeSignupModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !signupModal.hidden) {
    localStorage.setItem(SIGNUP_SKIP_KEY, String(Date.now()));
    closeSignupModal();
  }
});

window.showSignupModal = openSignupModal;
