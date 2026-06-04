# 後台設定說明

本資料夾是 Decap CMS 後台。

## 本機預覽

直接開啟：

```text
http://localhost:4173/admin/
```

本機環境只能查看後台介面；真正儲存需要部署到 Netlify 並啟用 Identity / Git Gateway。

## 上線設定

1. 把網站放到 GitHub repository。
2. 用 Netlify 部署此 repository。
3. 到 Netlify 啟用 Identity。
4. 啟用 Git Gateway。
5. 邀請可編輯網站內容的使用者。
6. 到 `/admin/` 登入後即可編輯。

## 資料同步

Decap CMS 會編輯 JSON 檔。前台目前讀取對應的 JS 檔，因此 CMS 更新後需要執行：

```powershell
python scripts/sync_json_to_js.py
```

正式部署時可以把這段加入 build command。
