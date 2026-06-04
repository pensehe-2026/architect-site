# 禾序建築網站

這是一個資料驅動的建築師網站。版面在 `index.html`、`styles.css`、`app.js`，網站內容集中在 `data/site-content.json`。

## 本機預覽

在 `architect-site` 資料夾執行：

```powershell
python -m http.server 4173
```

然後開啟 `http://localhost:4173`。

## 更新內容

直接修改 `data/site-content.json`，或用腳本從本機檔案 / 遠端 URL 同步：

```powershell
.\update-content.ps1 -Source .\new-content.json
.\update-content.ps1 -Source https://example.com/site-content.json
```

JSON 至少需要保留：

- `studioName`
- `projects`
- `updates`

網站右上角的重新整理按鈕會重新讀取最新 JSON，適合搭配排程、CMS 匯出、Google Sheets 匯出或自動化流程覆蓋 `data/site-content.json`。
