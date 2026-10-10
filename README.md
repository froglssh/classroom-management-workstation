# 班級經營整合工作站

臺北市麗山高中林獻升老師製作。六項班級工具共用一份學生名冊：幹部與小老師、座位安排、打掃工作、班費收支、園遊會分工、導師評語。

## 上傳 GitHub 並啟用 Pages

1. 建立一個 GitHub 儲存庫。
2. 將**本資料夾裡面的所有內容**放在儲存庫根目錄，讓 `index.html` 直接位於根目錄。不要只上傳 ZIP，也不要再多包一層資料夾。保留 `共享整合版/` 與 `docs/` 的結構。
3. 至儲存庫 **Settings → Pages → Build and deployment**，Source 選 **Deploy from a branch**，Branch 選 **main**，Folder 選 **/(root)**，再按 Save。
4. 等待 GitHub 完成發布，使用 Pages 頁面提供的網址開啟。

這是一套靜態網站，不需要 npm、伺服器端 Python 或建置程序。`index.html` 是首頁；`.nojekyll` 用於停用 Jekyll 處理。部署來源若選其他分支，請改選實際上傳的分支。

GitHub 官方說明：
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 開始使用

1. 首頁 → 開啟學生資料 → 建立班級與學期。
2. 匯入 Excel 或新增學生 → 儲存共用名冊。
3. 幹部與小老師工具安排職務，或匯入該工具匯出的 JSON，檢查對應後確認。
4. 座位與評語自動讀取共用職務；其他工具共用學生名冊。
5. 定期在資料中心下載「完整備份 JSON」。

## 資料保存與搬移

- 網頁在雲端，班級資料保存在目前瀏覽器的 IndexedDB。不同電腦、不同瀏覽器、不同網址來源不會自動共享。
- 本機舊版與 GitHub Pages 為不同來源。請先在舊版資料中心下載完整備份，再於雲端版資料中心還原。
- 同一 github.io 網域下的不同專案仍可能共用瀏覽器儲存空間；此程式沿用既有資料庫名稱以維持備份相容。
- 此包只包含程式、套件與說明，不含學生名冊、任職備份、評語草稿或 API 金鑰。請勿將另外匯出的個人資料備份放入公開儲存庫。
- AI 潤飾需自己的服務設定與網路；一般名冊、職務與座位操作不需要呼叫 AI。

## 本機預覽（選用）

Mac 安裝 Python 3 後雙擊 `啟動班級經營工作站.command`。會啟動 `http://127.0.0.1:8766/index.html`，與原研習版的 8765 分開。

也可在本資料夾執行：

```sh
python3 -m http.server 8766 --bind 127.0.0.1
```

再開啟上面的網址。直接雙擊 HTML 不適合共用資料，會提示使用啟動器。發布到 GitHub Pages 後不必使用這兩個本機啟動檔。

## 內容

- `index.html`：完整首頁。
- `班級經營整合工作站.html`：相容名稱，轉到首頁。
- `共享整合版/`：資料中心、六工具、共用資料庫、各工具整合程式、CSS、套件與授權。
- `docs/`：六項工具操作說明與整合架構說明。
- `檔案清單.json`：打包時間、檔案大小與 SHA-256。
- `班級工作站啟動器.py`、`啟動班級經營工作站.command`：本機預覽用。

第三方套件授權位於 `共享整合版/vendor/`。此包不另行變更原程式及文件的著作權。
