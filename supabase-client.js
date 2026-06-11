function getSupabaseClientConfig() {
  const config = window.SUPABASE_CONFIG || {};
  const url = String(config.url || "").trim().replace(/\/$/, "");
  const anonKey = String(config.anonKey || "").trim();

  if (!url || !anonKey) return null;
  if (/your-project-ref|your-anon-key/i.test(url + anonKey)) return null;
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) return null;

  return { url, anonKey };
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

function parseSupabaseError(status, data, rawText) {
  const message = String(data?.message || data?.error || data?.hint || rawText || "");

  if (/DUPLICATE_USER|duplicate|unique|23505/i.test(message)) {
    return "이미 가입된 전화번호 또는 이메일입니다.";
  }

  if (/schema cache|does not exist|42P01|relation.*signups|42883|register_user|login_user/i.test(message)) {
    return "Supabase 함수가 없습니다. supabase/schema-auth.sql을 SQL Editor에서 실행해 주세요.";
  }

  if (/row-level security|RLS|42501|permission denied/i.test(message)) {
    return "Supabase 권한 오류입니다. supabase/fix-policy.sql을 실행해 주세요.";
  }

  if (/check constraint|23514/i.test(message)) {
    return "입력 형식이 올바르지 않습니다. 이름·전화번호·이메일을 다시 확인해 주세요.";
  }

  if (/Invalid API key|JWT|401|403/i.test(message) || status === 401 || status === 403) {
    return "Supabase API 키가 올바르지 않습니다. supabase-config.js를 확인해 주세요.";
  }

  return message || "요청에 실패했습니다.";
}

async function supabaseRpc(functionName, params) {
  const config = getSupabaseClientConfig();
  if (!config) {
    throw new Error("Supabase 설정이 필요합니다. supabase-config.js를 확인해 주세요.");
  }

  let res;

  try {
    res = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error("Supabase 서버에 연결할 수 없습니다.");
  }

  const { data, text } = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(parseSupabaseError(res.status, data, text));
  }

  return data;
}

window.getSupabaseClientConfig = getSupabaseClientConfig;
window.parseSupabaseError = parseSupabaseError;
window.supabaseRpc = supabaseRpc;
