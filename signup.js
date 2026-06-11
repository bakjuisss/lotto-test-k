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

function openSignupModal(options = {}) {
  const required = options.required === true;
  isRequiredSignup = required;

  if (typeof window.isLoggedIn === "function" && window.isLoggedIn()) return;

  signupForm.hidden = false;
  signupSuccessEl.hidden = true;
  signupSkipBtn.hidden = required;

  if (required) {
    signupDescEl.textContent =
      "회원가입 후 추첨·AI 추천을 이용할 수 있습니다. 이름, 전화번호, 이메일을 입력해 주세요.";
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

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setSubmitting(isSubmitting) {
  signupSubmitBtn.disabled = isSubmitting;
  signupSubmitBtn.textContent = isSubmitting ? "가입 중..." : "무료 가입하기";
}

async function registerUser(signupData) {
  return supabaseRpc("register_user", {
    p_name: signupData.name,
    p_phone: signupData.phone,
    p_email: signupData.email,
  });
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

  if (!getSupabaseClientConfig() && location.protocol === "file:") {
    alert(
      "Supabase 설정이 필요합니다.\n\n1. supabase-config.js 설정\n2. supabase/schema.sql 실행\n3. supabase/schema-auth.sql 실행"
    );
    return;
  }

  const signupData = {
    name,
    phone: phone.replace(/\D/g, ""),
    email,
  };

  setSubmitting(true);

  try {
    const result = await registerUser(signupData);
    const session = setUserSession(result);

    const nextAction = pendingAction;
    pendingAction = null;
    closeSignupModal();

    if (nextAction) {
      nextAction();
      return;
    }

    if (typeof window.completePendingAuth === "function") {
      window.completePendingAuth();
      return;
    }

    signupForm.hidden = true;
    signupSuccessEl.hidden = false;
    signupSuccessEl.querySelector("p").textContent =
      `${session.name}님, 가입이 완료되었습니다! 회원 ID: ${session.displayId}`;

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

  closeSignupModal();
}

signupCloseBtn.addEventListener("click", handleSignupDismiss);
signupSkipBtn.addEventListener("click", handleSignupDismiss);

signupModal.addEventListener("click", (e) => {
  if (e.target === signupModal) handleSignupDismiss();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !signupModal.hidden) handleSignupDismiss();
});

window.showSignupModal = openSignupModal;
