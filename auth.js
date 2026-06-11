const SESSION_KEY = "lotto_user_session";

const authGuestEl = document.getElementById("auth-guest");
const authUserEl = document.getElementById("auth-user");
const authUserNameEl = document.getElementById("auth-user-name");
const authUserIdEl = document.getElementById("auth-user-id");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const loginCloseBtn = document.getElementById("login-close");
const loginSubmitBtn = loginForm?.querySelector(".btn-login");
const loginToSignupBtn = document.getElementById("login-to-signup");

let pendingAction = null;
let isRequiredLogin = false;

function normalizeUser(data) {
  const displayId =
    data.display_id ||
    `LT-${String(data.id || "")
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

  return {
    id: data.id,
    displayId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    joinedAt: data.created_at || data.joinedAt || new Date().toISOString(),
    loggedInAt: new Date().toISOString(),
  };
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function isLoggedIn() {
  const session = getSession();
  return !!(session && session.id && session.email && session.phone);
}

function setUserSession(userData) {
  const session = normalizeUser(userData);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  updateAuthBar();
  return session;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("lotto_ai_signup_done");
  localStorage.removeItem("lotto_ai_signup_data");
  updateAuthBar();
}

function updateAuthBar() {
  const session = getSession();

  if (session && session.id) {
    authGuestEl.hidden = true;
    authUserEl.hidden = false;
    authUserNameEl.textContent = `${session.name}님`;
    authUserIdEl.textContent = session.displayId;
  } else {
    authGuestEl.hidden = false;
    authUserEl.hidden = true;
  }
}

function openLoginModal(options = {}) {
  if (!loginModal || !loginForm) return;

  isRequiredLogin = options.required === true;

  if (isLoggedIn()) return;

  loginForm.reset();
  loginModal.hidden = false;
  document.body.classList.add("modal-open");
  loginForm.querySelector("#login-email")?.focus();
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.hidden = true;
  document.body.classList.remove("modal-open");
  isRequiredLogin = false;
}

function cancelPendingAuth() {
  pendingAction = null;
}

function completePendingAuth() {
  const nextAction = pendingAction;
  pendingAction = null;
  if (nextAction) nextAction();
}

function requireAuth(action) {
  if (isLoggedIn()) {
    action();
    return;
  }

  pendingAction = action;
  openLoginModal({ required: true });
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoginSubmitting(isSubmitting) {
  if (!loginSubmitBtn) return;
  loginSubmitBtn.disabled = isSubmitting;
  loginSubmitBtn.textContent = isSubmitting ? "로그인 중..." : "로그인";
}

async function loginWithCredentials(email, phone) {
  const data = await supabaseRpc("login_user", {
    p_email: email,
    p_phone: phone.replace(/\D/g, ""),
  });

  if (!data) {
    throw new Error("일치하는 회원 정보가 없습니다. 이메일·전화번호를 확인하거나 회원가입해 주세요.");
  }

  return setUserSession(data);
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginForm.querySelector("#login-email").value.trim();
  const phone = loginForm.querySelector("#login-phone").value.trim();

  if (!validateEmail(email)) {
    alert("올바른 이메일 주소를 입력해 주세요.");
    return;
  }

  if (!validatePhone(phone)) {
    alert("올바른 휴대폰 번호를 입력해 주세요. (예: 01012345678)");
    return;
  }

  setLoginSubmitting(true);

  try {
    const session = await loginWithCredentials(email, phone);
    const nextAction = pendingAction;
    pendingAction = null;
    closeLoginModal();

    if (nextAction) {
      nextAction();
      return;
    }

    alert(`${session.name}님, 로그인되었습니다. (${session.displayId})`);
  } catch (err) {
    alert(err.message || "로그인에 실패했습니다.");
  } finally {
    setLoginSubmitting(false);
  }
});

function handleLoginDismiss() {
  if (isRequiredLogin) {
    cancelPendingAuth();
    closeLoginModal();
    return;
  }

  closeLoginModal();
}

loginBtn?.addEventListener("click", () => openLoginModal());
logoutBtn?.addEventListener("click", () => {
  clearSession();
  cancelPendingAuth();
  alert("로그아웃되었습니다.");
});

loginCloseBtn?.addEventListener("click", handleLoginDismiss);

loginModal?.addEventListener("click", (e) => {
  if (e.target === loginModal) handleLoginDismiss();
});

loginToSignupBtn?.addEventListener("click", () => {
  closeLoginModal();
  if (typeof window.showSignupModal === "function") {
    window.showSignupModal({ required: isRequiredLogin });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && loginModal && !loginModal.hidden) {
    handleLoginDismiss();
  }
});

updateAuthBar();

window.getSession = getSession;
window.isLoggedIn = isLoggedIn;
window.setUserSession = setUserSession;
window.clearSession = clearSession;
window.requireAuth = requireAuth;
window.openLoginModal = openLoginModal;
window.completePendingAuth = completePendingAuth;
window.isSignupCompleted = isLoggedIn;
window.requireSignup = requireAuth;
