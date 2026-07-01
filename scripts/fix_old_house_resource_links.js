const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSET_DIR = path.join(ROOT, "assets", "regulations", "old-house-life-extension");
const SITE_JSON = path.join(ROOT, "data", "site-content.json");
const SITE_JS = path.join(ROOT, "data", "site-content.js");

const assetNameMap = {
  "01-臺中市老宅延壽機能復新計畫公告.pdf": "official-01-taichung-old-house-extension-announcement.pdf",
  "03-老宅延壽說明會簡報1150623.pdf": "official-03-briefing-1150623.pdf",
  "04-老宅延壽問答集11505.pdf": "official-04-faq-11505.pdf",
  "05-摺頁.pdf": "official-05-brochure.pdf",
  "07-內政部老宅延壽計畫建築物修繕補助申請流程圖.pdf": "official-07-application-flow.pdf",
  "08-因應國際情勢強化老舊建築物修繕補助辦法.pdf": "official-08-repair-subsidy-regulations.pdf",
  "2-1-一-公寓類4至6樓公寓修繕需求申請表.pdf": "official-02-01-apartment-repair-demand-form.pdf",
  "2-2-一-公寓類4至6樓公寓修繕需求申請表.docx": "official-02-02-apartment-repair-demand-form.docx",
  "2-3-一-公寓類4至6樓公寓修繕需求申請表.odt": "official-02-03-apartment-repair-demand-form.odt",
  "2-4-二-透天類6樓以下透天住宅修繕需求申請表.pdf": "official-02-04-townhouse-repair-demand-form.pdf",
  "2-5-二-透天類6樓以下透天住宅修繕需求申請表.odt": "official-02-05-townhouse-repair-demand-form.odt",
  "2-6-二-透天類6樓以下透天住宅修繕需求申請表.docx": "official-02-06-townhouse-repair-demand-form.docx",
  "2-7-三-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書.pdf": "official-02-07-apartment-repair-plan-subsidy.pdf",
  "2-8-三-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書.docx": "official-02-08-apartment-repair-plan-subsidy.docx",
  "2-9-三-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書.odt": "official-02-09-apartment-repair-plan-subsidy.odt",
  "2-10-四-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.pdf": "official-02-10-apartment-required-documents.pdf",
  "2-11-四-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.docx": "official-02-11-apartment-required-documents.docx",
  "2-12-四-公寓類4至6樓公寓修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.odt": "official-02-12-apartment-required-documents.odt",
  "2-13-五-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書.pdf": "official-02-13-townhouse-repair-plan-subsidy.pdf",
  "2-14-五-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書.odt": "official-02-14-townhouse-repair-plan-subsidy.odt",
  "2-15-五-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書.docx": "official-02-15-townhouse-repair-plan-subsidy.docx",
  "2-16-六-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.pdf": "official-02-16-townhouse-required-documents.pdf",
  "2-17-六-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.docx": "official-02-17-townhouse-required-documents.docx",
  "2-18-六-透天類6樓以下透天住宅修繕計畫暨結構安全性能評估申請補助計畫書-應檢附文件說明.odt": "official-02-18-townhouse-required-documents.odt",
};

const legacyHrefMap = {
  "提供的資料/老屋延壽/老宅延壽流程圖.png": "assets/regulations/old-house-life-extension/old-house-flow.png",
  "提供的資料/老屋延壽/內政部老宅延壽計畫建築物修繕補助申請流程圖.pdf": "assets/regulations/old-house-life-extension/official-07-application-flow.pdf",
  "提供的資料/老屋延壽/因應國際情勢強化老舊建築物修繕補助辦法.pdf": "assets/regulations/old-house-life-extension/official-08-repair-subsidy-regulations.pdf",
  "提供的資料/老屋延壽/老宅延壽問答集115.05.pdf": "assets/regulations/old-house-life-extension/official-04-faq-11505.pdf",
  "提供的資料/老屋延壽/一、公寓類 - 4至6樓公寓修繕需求申請表.odt": "assets/regulations/old-house-life-extension/official-02-03-apartment-repair-demand-form.odt",
  "提供的資料/老屋延壽/三、透天類 - 6樓以下透天住宅修繕需求申請表.odt": "assets/regulations/old-house-life-extension/official-02-05-townhouse-repair-demand-form.odt",
};

const assetHref = "assets/regulations/old-house-life-extension/";

for (const [oldName, newName] of Object.entries(assetNameMap)) {
  const oldPath = path.join(ASSET_DIR, oldName);
  const newPath = path.join(ASSET_DIR, newName);
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

const legacyFlow = path.join(ROOT, "提供的資料", "老屋延壽", "老宅延壽流程圖.png");
const flowTarget = path.join(ASSET_DIR, "old-house-flow.png");
if (fs.existsSync(legacyFlow) && !fs.existsSync(flowTarget)) {
  fs.copyFileSync(legacyFlow, flowTarget);
}

const normalizeHref = (href) => {
  if (legacyHrefMap[href]) return legacyHrefMap[href];
  if (!href.startsWith(assetHref)) return href;
  const fileName = href.slice(assetHref.length);
  return assetNameMap[fileName] ? `${assetHref}${assetNameMap[fileName]}` : href;
};

const site = JSON.parse(fs.readFileSync(SITE_JSON, "utf8"));
const service = site.services.find((item) => item.slug === "old-house-life-extension");
if (!service?.detail?.resources) {
  throw new Error("old-house-life-extension resources not found");
}

service.detail.resources = service.detail.resources.map((resource) => ({
  ...resource,
  href: normalizeHref(resource.href),
}));

fs.writeFileSync(SITE_JSON, `${JSON.stringify(site, null, 4)}\n`, "utf8");
fs.writeFileSync(SITE_JS, `window.SITE_CONTENT = ${JSON.stringify(site, null, 2)};\n`, "utf8");

const missing = service.detail.resources
  .filter((resource) => resource.href.startsWith(assetHref))
  .filter((resource) => !fs.existsSync(path.join(ROOT, resource.href)));

if (missing.length) {
  console.error(missing.map((item) => `${item.title}: ${item.href}`).join("\n"));
  throw new Error(`${missing.length} old-house resource links still point to missing files`);
}

console.log(`Checked ${service.detail.resources.length} old-house resources.`);
