/* 班費收支記帳 v3.0 與工作站的轉接：
 * - 主程式內建 WS（共享整合版）模式：帳本存在工作站共用資料庫（鍵名 account-v3），
 *   每張單據相片一個鍵（account-v3.photo.<id>）；v3.0 只記收支，不使用學生名單。
 * - 第一次開啟時會自動轉入舊版整合資料（lssh.classAccount.current.v2，舊資料保留不動）；
 *   舊版「檔案名稱」存檔（classAccount_*）列在「資料與設定 → 備份與還原」，可個別匯入。
 * - 這裡只負責把工作站的 apply、capture 事件轉給主程式（window.AccountApp）。 */
(() => {
  'use strict';
  const W = Workspace;
  W.adapter = {
    apply() { window.AccountApp?.apply(); },
    capture() { window.AccountApp?.capture(); }
  };
})();
