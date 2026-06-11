function validatePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

function validateEmail(email) {
  const value = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

function validateName(name) {
  const value = String(name).trim();
  return value.length >= 2 && value.length <= 20 ? value : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 지원합니다." });
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error:
        "Supabase 환경변수가 설정되지 않았습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 Vercel에 추가하거나 supabase-config.js를 설정해 주세요.",
    });
  }

  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
    return res.status(500).json({
      error: "SUPABASE_URL 형식이 올바르지 않습니다. (예: https://xxxxx.supabase.co)",
    });
  }

  try {
    const { name, phone, email } = req.body || {};

    const validName = validateName(name);
    const validPhone = validatePhone(phone);
    const validEmail = validateEmail(email);

    if (!validName) {
      return res.status(400).json({ error: "이름을 2~20글자로 입력해 주세요." });
    }

    if (!validPhone) {
      return res.status(400).json({
        error: "올바른 휴대폰 번호를 입력해 주세요. (예: 01012345678)",
      });
    }

    if (!validEmail) {
      return res.status(400).json({ error: "올바른 이메일 주소를 입력해 주세요." });
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/signups`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: validName,
        phone: validPhone,
        email: validEmail,
      }),
    });

    const responseText = await insertRes.text();
    let responseData = null;

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = null;
      }
    }

    if (!insertRes.ok) {
      const message = String(
        responseData?.message || responseData?.error || responseData?.hint || responseText
      );

      if (/schema cache|does not exist|42P01|relation.*signups/i.test(message)) {
        return res.status(500).json({
          error:
            "Supabase에 signups 테이블이 없습니다. supabase/schema.sql을 SQL Editor에서 실행해 주세요.",
        });
      }

      if (/row-level security|RLS|42501|permission denied/i.test(message)) {
        return res.status(500).json({
          error:
            "Supabase 권한 오류입니다. schema.sql의 insert 정책을 적용했는지 확인해 주세요.",
        });
      }

      const isDuplicate =
        insertRes.status === 409 ||
        /duplicate|unique|23505/i.test(message);

      if (isDuplicate) {
        return res.status(409).json({
          error: "이미 가입된 전화번호 또는 이메일입니다.",
        });
      }

      return res.status(insertRes.status >= 400 ? insertRes.status : 502).json({
        error: message || "가입 정보 저장에 실패했습니다.",
      });
    }

    const row = Array.isArray(responseData) ? responseData[0] : responseData;

    return res.status(201).json({
      ok: true,
      id: row?.id ?? null,
      joinedAt: row?.created_at ?? new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "서버 오류가 발생했습니다.",
    });
  }
};
