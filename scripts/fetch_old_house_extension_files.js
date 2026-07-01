const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "regulations", "old-house-life-extension");
const SITE_JSON = path.join(ROOT, "data", "site-content.json");
const SITE_JS = path.join(ROOT, "data", "site-content.js");
const BASE = "https://www.ud.taichung.gov.tw";

const selectedListItems = [
  {
    number: 1,
    title: "臺中市老宅延壽機能復新計畫公告1150624",
    date: "2026-06-25",
    url: `${BASE}/media/1429966/臺中市老宅延壽機能復新計畫公告.pdf`,
    summary: "臺中市老宅延壽機能復新計畫受理公告，作為本市申請與審查依據之一。",
  },
  {
    number: 3,
    title: "老宅延壽說明會簡報1150623",
    date: "2026-06-24",
    url: `${BASE}/media/1429415/老宅延壽說明會簡報1150623.pdf`,
  },
  {
    number: 4,
    title: "內政部老宅延壽問答集",
    date: "2026-06-24",
    url: `${BASE}/media/1429412/老宅延壽問答集11505.pdf`,
  },
  {
    number: 5,
    title: "老宅延壽機能復新計畫宣傳摺頁",
    date: "2026-06-24",
    url: `${BASE}/media/1429411/摺頁.pdf`,
  },
  {
    number: 7,
    title: "內政部老宅延壽計畫建築物修繕補助申請流程圖",
    date: "2026-06-24",
    url: `${BASE}/media/1429409/內政部老宅延壽計畫建築物修繕補助申請流程圖.pdf`,
  },
  {
    number: 8,
    title: "因應國際情勢強化老舊建築物修繕補助辦法",
    date: "2026-06-24",
    url: `${BASE}/media/1429400/因應國際情勢強化老舊建築物修繕補助辦法.pdf`,
  },
];

const directFileNames = {
  1: "official-01-taichung-old-house-extension-announcement.pdf",
  3: "official-03-briefing-1150623.pdf",
  4: "official-04-faq-11505.pdf",
  5: "official-05-brochure.pdf",
  7: "official-07-application-flow.pdf",
  8: "official-08-repair-subsidy-regulations.pdf",
};

const attachmentFileNames = {
  1: "official-02-01-apartment-repair-demand-form.pdf",
  2: "official-02-02-apartment-repair-demand-form.docx",
  3: "official-02-03-apartment-repair-demand-form.odt",
  4: "official-02-04-townhouse-repair-demand-form.pdf",
  5: "official-02-05-townhouse-repair-demand-form.odt",
  6: "official-02-06-townhouse-repair-demand-form.docx",
  7: "official-02-07-apartment-repair-plan-subsidy.pdf",
  8: "official-02-08-apartment-repair-plan-subsidy.docx",
  9: "official-02-09-apartment-repair-plan-subsidy.odt",
  10: "official-02-10-apartment-required-documents.pdf",
  11: "official-02-11-apartment-required-documents.docx",
  12: "official-02-12-apartment-required-documents.odt",
  13: "official-02-13-townhouse-repair-plan-subsidy.pdf",
  14: "official-02-14-townhouse-repair-plan-subsidy.odt",
  15: "official-02-15-townhouse-repair-plan-subsidy.docx",
  16: "official-02-16-townhouse-required-documents.pdf",
  17: "official-02-17-townhouse-required-documents.docx",
  18: "official-02-18-townhouse-required-documents.odt",
};

const requestText = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          requestText(new URL(res.headers.location, url).href).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.setEncoding("utf8");
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });

const download = (url, target) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const file = fs.createWriteStream(target);
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          file.close();
          fs.rmSync(target, { force: true });
          download(new URL(res.headers.location, url).href, target).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.rmSync(target, { force: true });
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (error) => {
        file.close();
        fs.rmSync(target, { force: true });
        reject(error);
      });
  });

const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const safeFileName = (url, prefix, fallbackTitle) => {
  const raw = decodeURIComponent(new URL(url).pathname.split("/").pop() || `${fallbackTitle}.pdf`);
  const ext = path.extname(raw) || ".pdf";
  const base = path.basename(raw, ext).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");
  return `${String(prefix).padStart(2, "0")}-${base}${ext}`;
};

const parsePostAttachments = (html) => {
  const results = [];
  const re = /<a\s+href="([^"]+)"[^>]*>([^<]+\.(?:pdf|docx|odt))<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const href = decode(match[1]);
    const title = decode(match[2]).trim();
    results.push({
      title,
      url: new URL(href, BASE).href,
    });
  }
  return results;
};

const upsertByTitle = (items, incoming) => {
  const existing = new Map(items.map((item, index) => [item.title, index]));
  for (const item of incoming) {
    if (existing.has(item.title)) {
      items[existing.get(item.title)] = { ...items[existing.get(item.title)], ...item };
    } else {
      items.push(item);
    }
  }
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const postHtml = await requestText(`${BASE}/3305212/post`);
  const postAttachments = parsePostAttachments(postHtml);

  const directResources = [];
  for (const item of selectedListItems) {
    const fileName = directFileNames[item.number] || safeFileName(item.url, item.number, item.title);
    const target = path.join(OUT_DIR, fileName);
    await download(item.url, target);
    directResources.push({
      title: `官方${item.number}｜${item.title}`,
      href: `assets/regulations/old-house-life-extension/${fileName}`,
    });
  }

  const attachmentResources = [];
  let attachmentIndex = 1;
  for (const item of postAttachments) {
    const fileName = attachmentFileNames[attachmentIndex] || safeFileName(item.url, `2-${attachmentIndex}`, item.title);
    const target = path.join(OUT_DIR, fileName);
    await download(item.url, target);
    attachmentResources.push({
      title: `官方2｜${item.title}`,
      href: `assets/regulations/old-house-life-extension/${fileName}`,
    });
    attachmentIndex += 1;
  }

  const site = JSON.parse(fs.readFileSync(SITE_JSON, "utf8"));
  const service = site.services.find((item) => item.slug === "old-house-life-extension");
  if (!service?.detail) throw new Error("old-house-life-extension service not found");

  const officialResources = [
    ...directResources.slice(0, 1),
    {
      title: "官方2｜老宅延壽相關補助申請書件（官方內頁）",
      href: "https://www.ud.taichung.gov.tw/3305212/post",
    },
    ...attachmentResources,
    ...directResources.slice(1),
  ];

  service.detail.resources = [
    ...officialResources,
    ...service.detail.resources.filter((item) => !String(item.title || "").startsWith("官方")),
  ];

  const officialNews = {
    date: "2026-06-25",
    category: "危老延壽",
    title: "臺中市老宅延壽機能復新計畫公告1150624",
    summary: "臺中市都市發展局公告老宅延壽機能復新計畫受理資訊，申請前可先確認建物資格、住戶共識、修繕項目與應備文件。",
    href: "service.html?item=old-house-life-extension#service-news",
  };
  service.detail.news = [officialNews, ...service.detail.news.filter((item) => item.title !== officialNews.title)];
  site.updates = [officialNews, ...site.updates.filter((item) => item.title !== officialNews.title)];

  fs.writeFileSync(SITE_JSON, `${JSON.stringify(site, null, 4)}\n`, "utf8");
  fs.writeFileSync(SITE_JS, `window.SITE_CONTENT = ${JSON.stringify(site, null, 2)};\n`, "utf8");

  console.log(`direct=${directResources.length}`);
  console.log(`attachments=${attachmentResources.length}`);
  console.log(`out=${path.relative(ROOT, OUT_DIR)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
