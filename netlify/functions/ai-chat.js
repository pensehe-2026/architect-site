const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!GEMINI_API_KEY) {
    return json(503, { error: "GEMINI_API_KEY is not configured" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const question = String(payload.question || "").trim();
  const context = String(payload.context || "").slice(0, 18000);

  if (!question) {
    return json(400, { error: "Question is required" });
  }

  const systemPrompt = [
    "你是何中揚建築師事務所網站的法規與服務導覽助理。",
    "請使用繁體中文回答，語氣專業、清楚、簡潔。",
    "你只能根據提供的網站資料、法規摘要、建管實務摘要與最新消息回答。",
    "如果資料不足，請明確說明需要由事務所進一步確認，不要編造法條、日期、費用或審查結果。",
    "涉及建築法規、申請流程或補助資格時，請給出可行的下一步，並提醒正式判斷仍須依主管機關最新公告與專業人員審查。",
  ].join("\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\n網站資料如下：\n${context}\n\n使用者問題：${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 900,
    },
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(response.status, {
        error: result.error?.message || "Gemini request failed",
      });
    }

    const answer =
      result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    return json(200, { answer });
  } catch (error) {
    return json(500, { error: error.message || "AI request failed" });
  }
};
