/* 園遊會攤位規劃 v3.0 與共用名冊的轉接：
 * - 主程式內建 WS（共享整合版）模式：名單由共用名冊在籍學生帶入，以共用學生 ID 記錄分組與輪班，
 *   改名、換座號時安排會跟著學生；轉出學生會標示「已不在名單」並不再計入名額。
 * - 工具資料存在工作站共用資料庫（鍵名 fair-v3）；第一次開啟時會自動轉入舊版整合資料（lssh.stall.v1.*）。
 * - 這裡只負責把共用名冊更新與儲存事件轉給主程式（window.FairApp）。 */
(() => {
  'use strict';
  const W = Workspace;
  W.adapter = {
    apply() { window.FairApp?.applyRoster(); },
    capture() { window.FairApp?.capture(); }
  };
})();
