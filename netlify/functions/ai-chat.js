const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(body),
});

const SCENARIO_GUIDES = [
  "01｜想認識事務所：回答事務所定位與服務整合能力，導到關於我們 about.html。",
  "02｜想看建築師理念：說明可閱讀建築師的話，導到關於我們 about.html#architectMessageTitle。",
  "03｜想看團隊：回答可看我們團隊，導到 about.html#teamTitle。",
  "04｜想看得獎紀錄：回答榮耀時刻含財訊雜誌整建維護團隊獎，導到 about.html#honorsTitle。",
  "05｜想看全部作品：回答作品集依類型整理，導到 projects.html。",
  "06｜想看近期作品：回答首頁近期作品輪播可先看代表案例，完整清單導到 projects.html。",
  "07｜想找熱銷建案：回答可至作品集的熱銷建案分類，導到 projects.html。",
  "08｜想找私人建案：回答可至作品集的私人建案分類，導到 projects.html。",
  "09｜想找商業建築：回答可至作品集的商業建築分類，導到 projects.html。",
  "10｜想找公共工程或宗教工程案例：回答可看公共工程分類，代表案例包含蒙恩堂，導到 projects.html。",
  "11｜想找幼兒園或教育建築：回答可看教育類建築分類，導到 projects.html。",
  "12｜想找工廠或農業產銷設施：回答可看工廠類建築分類，導到 projects.html。",
  "13｜想了解土地開發可行性：回答會先檢討基地條件、使用分區、容積與限制，導到 service.html?item=land-development。",
  "14｜想委託公共工程：回答可協助規畫、圖說整合、法規檢討與執行界面，導到 service.html?item=public-works。",
  "15｜想做建案規畫：回答可協助產品定位、量體、配置與法規整合，導到 service.html?item=housing-planning。",
  "16｜想問危老重建：回答需先確認建物資格、基地條件、同意比例與獎勵條件，導到 service.html?item=dangerous-old-building-renewal。",
  "17｜想問都市更新整建維護：回答可協助社區溝通、整建維護與改善方案，導到 service.html?item=urban-renewal-maintenance。",
  "18｜想問老屋延壽：回答適用 30 年以上合法建築物初步評估、住戶共識、結構安全與修繕項目，導到 service.html?item=old-house-life-extension。",
  "19｜想看老屋延壽最新消息：回答可看老屋延壽服務頁的最新消息，導到 service.html?item=old-house-life-extension#service-news，也可看 updates.html。",
  "20｜想找室內設計：回答由宇邑空間設計整合生活需求、材質、照明與施工細節，導到 service.html?item=interior-design。",
  "21｜想找工程承攬或施工整合：回答可協助施工管理、材料協調與品質控管，導到 service.html?item=construction-contracting。",
  "22｜想做建築物公共安全檢查：回答可協助公共安全檢查、缺失改善建議與申報流程，導到 service.html?item=public-safety-inspection。",
  "23｜想申請廣告物或招牌：回答可協助設置評估、圖說準備、申請流程與法規檢討，導到 service.html?item=signboard-application。",
  "24｜想辦變更使用或室內裝修許可：回答可協助變更使用執照、室內裝修許可、圖說與送審，導到 service.html?item=change-use-interior-permit。",
  "25｜想辦解除套繪、土地分割、法定空地分割或竣工圖說：回答屬其他業務，可協助代辦或確認流程，導到 service.html?item=other-services。",
  "26｜想查中央法規：回答可至內政部國土管理署法規公告整理頁，導到 nlma-regulations.html。",
  "27｜想查台中市地方法規：回答可至台中市建築管理與地方自治規定，導到 taichung-regulations.html。",
  "28｜想查建管實務手冊、補照流程、套繪圖例或面積計算表：回答可至建管實務子網站，導到 building-practice.html。",
  "29｜想下載表單或找官方入口：回答可用好用連結，建管便民服務 https://mcgbm.taichung.gov.tw/、158地籍圖資 https://lohas.taichung.gov.tw/lohas/、台中市都市發展局表單下載 https://www.ud.taichung.gov.tw/28928/29030/29036?PageSize=30。",
  "30｜想聯絡、詢價、預約諮詢或加入 LINE：回答可用 Email、電話、地址與 LINE，導到 index.html#contact；Email Hodesign2013@gmail.com，電話 04-22291885 / 04-35091168，LINE @976udzzw。",
];

const knownAnswer = (question) => {
  const compactQuestion = question.replace(/\s+/g, "");
  const asksForBuildingDrawings =
    /(竣工圖|竣工圖說|使用執照影本|建管圖說|圖說謄本|謄本)/.test(compactQuestion) &&
    /(申請|哪裡|表單|取得|調閱|領取|下載|怎麼辦|如何)/.test(compactQuestion);

  if (asksForBuildingDrawings) {
    return [
      "可以進入「表單－台中市都市發展局表單下載」搜尋相關申請表單。",
      "若不熟悉申請流程或應備文件，也可委託何中揚建築師事務所代為申請或協助確認。",
    ].join("\n");
  }

  return "";
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
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

  const fixedAnswer = knownAnswer(question);
  if (fixedAnswer) {
    return json(200, { answer: fixedAnswer });
  }

  if (!GEMINI_API_KEY) {
    return json(503, { error: "GEMINI_API_KEY is not configured" });
  }

  const systemPrompt = [
    "你是何中揚建築師事務所網站的法規與服務導覽助理。",
    "請使用繁體中文回答，語氣專業、清楚、簡潔。",
    "你只能根據提供的網站資料、法規摘要、建管實務摘要與最新消息回答。",
    "遇到可導覽的問題時，請給出最適合的網站頁面或外部入口，並在回答中保留可點擊的 URL。",
    "不要使用 Markdown 連結格式，例如不要寫 [作品集](projects.html)，請直接寫「作品集：projects.html」。",
    "回答要完整收尾，不要只列出一個連結就結束；可以用 2 到 4 句簡短說明再附頁面。",
    "如果使用者問題的關鍵詞出現在網站資料中，請視為已有可用資料，直接整理重點，不要回答查不到服務項目。",
    "使用者詢問竣工圖謄本、使用執照影本、建管圖說或申請表單時，優先引導至「表單－台中市都市發展局表單下載」搜尋，也可說明可委託何中揚建築師事務所代為申請。",
    "如果資料不足，請先列出目前能從資料判斷的方向，再明確說明哪些部分需要由事務所進一步確認。",
    "不要編造法條、日期、費用、補助金額或審查結果。",
    "涉及建築法規、申請流程或補助資格時，請用條列式回答：準備事項、流程重點、需要確認的風險、建議下一步。",
  ].join("\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\n網站使用情境與回答導引：\n${SCENARIO_GUIDES.join("\n")}\n\n網站資料如下：\n${context}\n\n使用者問題：${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1800,
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
