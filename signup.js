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

function getSupabaseClientConfig() {
  const config = window.SUPABASE_CONFIG || {};
  const url = String(config.url || "").trim().replace(/\/$/, "");
  const anonKey = String(config.anonKey || "").trim();

  if (!url || !anonKey) return null;
  if (/your-project-ref|your-anon-key/i.test(url + anonKey)) return null;
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) return null;

  return { url, anonKey };
}

function parseSupabaseError(status, data, rawText) {
  const message = String(data?.message || data?.error || data?.hint || rawText || "");

  if (/schema cache|does not exist|42P01|relation.*signups/i.test(message)) {
    return "Supabase에 signups 테이블이 없습니다. supabase/schema.sql을 SQL Editor에서 실행해 주세요.";
  }

  if (/row-level security|RLS|42501|permission denied/i.test(message)) {
    return "Supabase 권한 오류입니다. schema.sql의 insert 정책을 적용했는지 확인해 주세요.";
  }

  if (status === 409 || /duplicate|unique|23505/i.test(message)) {
    return "이미 가입된 전화번호 또는 이메일입니다.";
  }

  if (/check constraint|23514/i.test(message)) {
    return "입력 형식이 올바르지 않습니다. 이름·전화번호·이메일을 다시 확인해 주세요.";
  }

  if (/Invalid API key|JWT|401|403/i.test(message) || status === 401 || status === 403) {
    return "Supabase API 키가 올바르지 않습니다. supabase-config.js의 anon key를 확인해 주세요.";
  }

  return message || "가입 정보 저장에 실패했습니다.";
}

async function parseResponseBody(res) {
  const text = await res.text();
  if (!text) return { data: null, text: "" };

  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
}

async function saveSignupViaSupabase(signupData, config) {
  let res;

  try {
    res = await fetch(`${config.url}/rest/v1/signups`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: signupData.name,
        phone: signupData.phone,
        email: signupData.email,
      }),
    });
  } catch {
    throw new Error(
      "Supabase 서버에 연결할 수 없습니다. supabase-config.js의 URL을 확인해 주세요."
    );
  }

  const { data, text } = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(parseSupabaseError(res.status, data, text));
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    ok: true,
    id: row?.id ?? null,
    joinedAt: row?.created_at ?? new Date().toISOString(),
  };
}

async function saveSignupViaApi(signupData) {
  let res;

  try {
    res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: signupData.name,
        phone: signupData.phone,
        email: signupData.email,
      }),
    });
  } catch {
    throw new Error(
      "서버에 연결할 수 없습니다. GitHub Pages에서는 supabase-config.js 설정이 필요합니다."
    );
  }

  const { data, text } = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(data?.error || parseSupabaseError(res.status, data, text));
  }

  return data;
}

async function saveSignupToSupabase(signupData) {
  const config = getSupabaseClientConfig();

  if (config) {
    return saveSignupViaSupabase(signupData, config);
  }

  return saveSignupViaApi(signupData);
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
      "Supabase 설정이 필요합니다.\n\n1. supabase-config.example.js를 supabase-config.js로 복사\n2. Supabase URL과 anon key 입력\n3. supabase/schema.sql을 Supabase SQL Editor에서 실행"
    );
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
