# 共用名冊本機依賴

- `xlsx.full.min.js`：SheetJS CE 0.18.5，沿用原名冊匯入使用的版本，改為本機載入。
- 原始下載網址：https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
- 授權檔：`LICENSE.sheetjs.txt`（Apache 2.0），來源 https://cdn.jsdelivr.net/npm/xlsx@0.18.5/LICENSE
- 取得日期：2026-10-10。

只用於讀取使用者選取的學生名冊檔案；不會上傳檔案，也不執行 Excel 巨集。

## 幹部與座位本機樣式

- `tailwindcss.browser.js`：Tailwind CSS 3.4.17 的瀏覽器版，供新版幹部及座位程式產生樣式。
- 原始下載網址：https://cdn.tailwindcss.com/3.4.17
- 授權檔：`LICENSE.tailwindcss.txt`（MIT），來源 https://cdn.jsdelivr.net/npm/tailwindcss@3.4.17/LICENSE
- 取得日期：2026-10-10。保留原工具的樣式生成方式，改用本機套件，避免 CDN 失敗時介面失去排版。

## 雲端包附加套件

html2canvas 1.4.1、jsPDF 2.5.1、JSZip 3.10.1、normalize.css 8.0.1、Font Awesome Free 6.0.0（含所需字型）已附在本包。各自的 LICENSE 檔與 third-party-sources.json 保留授權、來源與雜湊。網頁使用系統中文字型，不必下載 Google Fonts。
