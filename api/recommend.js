const MODEL = "gemini-2.5-flash-lite";

function getTodayKST() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildPrompt(birthdate, today, message) {
  const userNote = message ? `\n사용자 추가 질문: ${message}` : "";

  return `당신은 한국 로또 6/45 번호 추천 전문가입니다. 오락 목적의 추천이며 당첨을 보장하지 않습니다.

입력 정보:
- 생년월일: ${birthdate}
- 오늘 날짜(한국): ${today}

다음을 수행하세요:
1. 생년월일을 바탕으로 오늘(${today})의 운세를 간단히 분석하세요.
2. 생년월일을 바탕으로 오늘의 사주팔자 핵심 요소(일간/오행/흐름 등)를 요약하세요.
3. 위 내용과 오늘 날짜 에너지를 종합해 로또 번호 6개(1~45, 중복 없음, 오름차순)와 보너스 번호 1개(당첨 6개와 중복 불가)를 추천하세요.
4. 각 번호 또는 번호 조합을 선택한 이유를 구체적으로 설명하세요.
${userNote}

반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.
{
  "fortune_summary": "오늘의 운세 요약 (2~3문장)",
  "saju_summary": "오늘의 사주팔자 요약 (2~3문장)",
  "numbers": [6개의 정수],
  "bonus": 보너스 정수,
  "reasoning": "번호 추천 이유 상세 설명 (5~8문장, 번호별 근거 포함)"
}`;
}

function validateNumbers(numbers, bonus) {
  if (!Array.isArray(numbers) || numbers.length !== 6) {
    throw new Error("번호 6개가 올바르지 않습니다.");
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  const unique = new Set(sorted);

  if (unique.size !== 6) {
    throw new Error("번호에 중복이 있습니다.");
  }

  for (const n of sorted) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      throw new Error("번호는 1~45 사이 정수여야 합니다.");
    }
  }

  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || sorted.includes(bonus)) {
    throw new Error("보너스 번호가 올바르지 않습니다.");
  }

  return { numbers: sorted, bonus };
}

function parseGeminiError(status, geminiData) {
  const message = geminiData?.error?.message || "Gemini API 호출에 실패했습니다.";
  const isRateLimit =
    status === 429 ||
    /quota exceeded|rate limit|resource_exhausted/i.test(message);

  if (isRateLimit) {
    const match = message.match(/retry in ([\d.]+)s/i);
    const retryAfterSeconds = match ? Math.ceil(parseFloat(match[1])) : 60;

    return {
      status: 429,
      body: {
        error: `AI 무료 사용 한도(분당 20회)에 도달했습니다. 약 ${retryAfterSeconds}초 후에 다시 시도해 주세요.`,
        code: "RATE_LIMIT",
        retryAfterSeconds,
      },
    };
  }

  return {
    status: status >= 400 && status < 600 ? status : 502,
    body: { error: message, code: "API_ERROR" },
  };
}

function parseGeminiResponse(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("AI 응답을 파싱할 수 없습니다.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel Settings → Environment Variables에서 추가해 주세요.",
    });
  }

  try {
    const { birthdate, message = "" } = req.body || {};

    if (!birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
      return res.status(400).json({ error: "올바른 생년월일(YYYY-MM-DD)이 필요합니다." });
    }

    const today = getTodayKST();
    const prompt = buildPrompt(birthdate, today, String(message).slice(0, 500));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                fortune_summary: { type: "string" },
                saju_summary: { type: "string" },
                numbers: {
                  type: "array",
                  items: { type: "integer" },
                },
                bonus: { type: "integer" },
                reasoning: { type: "string" },
              },
              required: ["fortune_summary", "saju_summary", "numbers", "bonus", "reasoning"],
            },
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      const parsedError = parseGeminiError(geminiRes.status, geminiData);
      return res.status(parsedError.status).json(parsedError.body);
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "AI 응답이 비어 있습니다." });
    }

    const parsed = parseGeminiResponse(text);
    const { numbers, bonus } = validateNumbers(parsed.numbers, parsed.bonus);

    return res.status(200).json({
      birthdate,
      today,
      fortune_summary: parsed.fortune_summary,
      saju_summary: parsed.saju_summary,
      numbers,
      bonus,
      reasoning: parsed.reasoning,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "서버 오류가 발생했습니다.",
    });
  }
};
