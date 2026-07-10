# Japan Backend Status

本文件整理目前 `Japan/backend/system` 後端完成度，作為目前開發基準。

最後更新：

- 依目前 `Japan/backend/system/src`
- 依目前 `Japan/design/api.md`

## 0. 完成 / 未完成項目清單

### 0.1 已完成

- 核心後端服務分層已建立，包含 `api / services / data / utils / constants`
- 地圖、地點、起點、終點的管理流程已完成
- 玩家建立、玩家資料、金錢、車票、位置、旅程狀態查詢與更新已完成
- 旅程建立、修改、取消、開始、完成、批次管理與管理端 dashboard 已完成
- 車票生成、批次生成、持有、預約、消耗、銷毀、返還流程已完成
- 一般商店初始化、刷新、查詢、購買、優先購買權已完成
- 競標商店初始化、開標、出價、結算、無人得標銷毀已完成
- 盲盒建立、批次建立、更新、刪除、開啟、效果執行、可見性過濾已完成
- 交通異常申請、審核、批次審核、返還票券與旅程修正已完成
- 遊戲開始、結束、排名、排程事件處理已完成
- 紀錄、review、公開可見性與賽後審查資料已完成
- auth context 骨架、host/self 權限檢查、dev fallback 已可運作
- API smoke test 與 in-memory smoke test 已存在且可驗證主要流程

### 0.2 未完成

- 正式 PocketBase 身份驗證仍未完全收斂，`operatorPlayerId` / `x-auth-user-id` fallback 仍存在
- production 環境下的權限邊界尚未完全切到真實 token 驗證
- 前端尚未形成完整可用產品，現階段仍以單頁靜態 UI 為主
- PocketBase 真實資料庫整合測試已可在本機 PocketBase 環境通過，但仍缺自動化/持續整合覆蓋
- 單元測試與 service 細粒度測試仍不足
- 查詢排序、分頁與進階篩選仍可持續擴充
- 管理端批次/巡檢工具仍有可補強空間
- 一些規則細節仍需持續和 `rules.md` / `function.md` 做最終對齊

## 1. 完成度總覽

- 後端核心流程完成度：約 `85% ~ 90%`
- 後端 API 可供前端串接程度：約 `90% ~ 92%`
- 權限與身份邊界完成度：約 `60% ~ 70%`
- 整體產品完成度（含前端）：約 `40% ~ 50%`

## 2. 已完成清單

### 2.1 基礎資料

- 地圖建立、查詢、更新、刪除
- 地點建立、查詢、更新、刪除
- 起點/終點設定
- 玩家建立、玩家資料查詢、玩家資料更新
- 遊戲建立、加入、離開、開始、結束、排名

### 2.2 旅程系統

- 建立旅程
- 更新旅程
- 取消旅程
- 主持人批次取消預約旅程
- 主持人旅程 dashboard 聚合查詢
- 主持人旅程待辦 action queue 查詢
- 主持人例外旅程列表查詢
- 主持人旅程摘要查詢
- 主持人查詢整局旅程列表
- 主持人批次鎖定旅程
- 主持人批次解鎖旅程
- 啟動旅程
- 完成旅程
- 查詢單一旅程
- 查詢玩家旅程列表
- 查詢目前旅程
- 查詢保留旅程
- 旅程時間與接續合法性驗證
- 步行/計程車規則驗證

### 2.3 車票系統

- 隨機票券生成
- 票券批次生成
- 票券價格/可用時間計算
- 一般商店車票評級計算（時長 + 價格）
- 競標商店車票評級計算（只看時長）
- 車票評級資料輸出（`ratingScore` / `ratingGrade` / `ratingType`）
- 票券持有、預約、釋放、消耗、銷毀
- 交通中斷返還票券建立

### 2.4 一般商店

- 商店初始化
- 商店刷新
- 商品查詢
- 商品購買
- 免費刷新特殊狀態整合
- 手動付費刷新 5 分鐘優先購買權
- 玩家主動免費刷新效果 5 分鐘優先購買權
- `06:00` 免費刷新不產生優先購買權
- `06:00` 免費刷新後 10 分鐘內不可手動刷新
- 被刷新下架的一般商店票券不進入競標商店
- 商店商品查詢輸出 `priorityState` 與 `priorityAccess`

### 2.5 拍賣商店

- 拍賣初始化
- 建立拍賣回合
- 查詢目前拍賣
- 出價
- 查詢出價列表
- 拍賣結算
- 無唯一得標者時銷毀票券
- 競標商品只生成競標評級 `A / S`
- 競標評級只使用基礎時長，不使用價格
- 目前拍賣查詢輸出競標票券評級資料

### 2.6 盲盒系統

- 建立盲盒
- 批次建立盲盒
- 批次更新盲盒
- 批次刪除盲盒
- 驗證盲盒配置
- 更新盲盒
- 刪除盲盒
- 查詢盲盒
- 玩家可見盲盒公開資訊
- 開啟盲盒
- 盲盒 review 資料
- 玩家特殊狀態查詢

### 2.7 盲盒效果

- `money`
- `gain_random_ticket`
- `lose_random_ticket`
- `gain_shop_ticket`
- `gain_next_auction_bid_pool`
- `gain_free_shop_refresh`
- `conditional`

### 2.8 交通中斷系統

- 提交交通中斷申請
- 查詢單筆申請
- 查詢遊戲內申請列表
- 核准申請
- 拒絕申請
- 批次核准/拒絕申請
- 核准後自動修正旅程狀態、玩家位置、返還票券

### 2.9 Review / 紀錄 / 可見性

- 玩家紀錄查詢
- 遊戲紀錄查詢
- 遊戲中公開紀錄查詢
- 賽後 review 聚合 API
- 賽後 summary 聚合
- 盲盒 review 聚合
- 玩家位置/路徑/盲盒資料可見性過濾

### 2.10 主持人管理 API

- `GET /games/:gameId/access`
- `GET /games/:gameId/overview`
- `GET /games/:gameId/checklist`
- `POST /games/:gameId/checklist/process`
- `POST /games/:gameId/journeys/cancel-batch`
- `GET /games/:gameId/journeys/dashboard`
- `GET /games/:gameId/journeys/action-queue`
- `GET /games/:gameId/journeys/exceptions`
- `GET /games/:gameId/journeys/summary`
- `GET /games/:gameId/journeys`
- `POST /games/:gameId/journeys/lock-batch`
- `POST /games/:gameId/journeys/unlock-batch`
- `POST /games/:gameId/scheduled-events/process`
- `GET /games/:gameId/traffic-incidents`
- `GET /traffic-incidents/:requestId`
- `POST /traffic-incidents/:requestId/approve`
- `POST /traffic-incidents/:requestId/reject`
- `POST /games/:gameId/traffic-incidents/review-batch`
- `GET /games/:gameId/blind-boxes/review`

### 2.11 Auth / Session API

- `GET /auth/session`

### 2.12 排程事件處理

- 商店每日刷新處理
- 拍賣到期結算
- 拍賣新回合建立
- 旅程到點開始/完成
- 遊戲終點抵達與結束判定
- `06:00` 開局可同時觸發一般商店免費刷新與第一輪競標建立

### 2.13 權限骨架

- 已有 `request auth context` 骨架
- 主持人操作可優先使用 `authContext.playerId === hostPlayerId`
- 玩家自有操作可優先使用 `authContext.playerId === playerId`
- 開發期仍保留 `operatorPlayerId` 作為 fallback
- `players` schema 已補 `authUserId`
- 已有 `FORBIDDEN` 錯誤碼
- 已有 `GET /auth/session` 可直接觀察 request auth 解析結果
- 已有 `GET /games/:gameId/access` 可觀察指定遊戲的 host/self/joined 權限狀態

### 2.16 目前已可直接使用的流程

- 建立遊戲 -> 初始化商店 -> 刷新商店 -> 購買車票 -> 建立旅程 -> 啟動旅程 -> 完成旅程
- 建立遊戲 -> 初始化拍賣 -> 開標 -> 出價 -> 結算拍賣 -> 發放車票
- 建立遊戲 -> 設定盲盒 -> 開啟盲盒 -> 套用效果 -> 寫入紀錄
- 建立遊戲 -> 交通異常申請 -> 核准/拒絕 -> 返還車票 -> 修正旅程狀態
- 遊戲進行中查詢公開紀錄、玩家位置、公開旅程、盲盒公開資訊
- 遊戲結束後查詢 review、排名、完整紀錄與盲盒審查資料

### 2.14 測試

- `Japan/backend/system/scripts/api-smoke-test.js` 可通過
- `Japan/backend/system/scripts/smoke-test.js` 可通過
- 已驗證：
  - 核心遊戲流程
  - 公開/玩家/主持人列表 API 的 query options 串接
  - 一般商店票券評級輸出
  - 一般商店優先購買權阻擋與資料回傳
  - 競標商店只生成 `A / S` 長票
  - 競標票評級輸出
  - review 聚合
  - 主持人權限防護
  - 玩家權限防護
  - 交通中斷批次審核

### 2.15 PocketBase 結構同步

- 已補 `tickets` 評級欄位
- 已補 `shops` 一般商店優先購買權欄位
- 已補 `auctions` 競標票評級欄位
- 已新增增量 migration：`1783566200_add_ticket_rating_and_shop_priority.js`
- 已重新產生 schema 匯入檔
- 已將舊 snapshot migration 改為 no-op，避免覆蓋較新的 schema

## 3. 部分完成清單

### 3.1 權限與身份驗證

- `requestAuthService` 已存在
- `createAppServer` 已會建立 `authContext`
- 已可嘗試用 `Authorization: Bearer ...` 配合 PocketBase `auth-refresh` 驗證
- 目前支援 `x-auth-user-id -> players.authUserId -> playerId` 映射
- 已補 PocketBase `users` auth collection migration 與專用 smoke test 腳本
- 真 token smoke test 仍需本機提供 PocketBase 管理員憑證或 admin token
- PocketBase smoke test 已整理出共用前置檢查，缺少憑證時會一致報出環境需求
- `x-auth-user-id` 與 `operatorPlayerId` 皆可用環境變數關閉，進一步收斂 production 行為
- 仍需補完整 auth collection 規劃、登入流程與 production 驗證策略

### 3.2 API 文件角色標示

- `api.md` 已有初步角色矩陣
- 仍需持續把 visibility 型 public API 與正式角色限制完全對齊

### 3.3 查詢能力

- `maps`、`game records`、`public game records`、`traffic incidents`、`player records`、`player tickets`、`player special states`、`player journeys`、`blind boxes`、`public blind boxes` 已開始支援 `sortBy / sortDirection / limit / offset`
- `blind-box review` 已支援共用 query options，以及三組列表各自獨立的排序/分頁 query options
- 其他列表 API 已逐步接入同一套 query options，route 層查詢參數已大致統一

### 3.4 PocketBase 真實環境驗證

- 已有 PocketBase adapter
- 已完成 schema build 與 migration 套用
- `pocketbase-adapter-smoke-test.js`、`pocketbase-flow-smoke-test.js`、`pocketbase-auth-smoke-test.js` 已可在本機 PocketBase 服務下通過
- PocketBase smoke test 已共用測試前置檢查，缺少憑證時會一致報出環境需求
- 仍缺持續整合、自動化排程與更廣的真實資料庫覆蓋

### 3.5 管理端能力

- 已有 overview/checklist/process
- 已有旅程 dashboard、旅程待辦 action queue、例外旅程列表、旅程摘要、整局旅程列表查詢、預約旅程批次取消、旅程批次鎖定、旅程批次解鎖
- `overview` 已整合 `journeyDashboard`，並補上 `activeAuctionCount` / `currentAuctionBidCount` 等巡檢摘要
- 新增 `GET /games/:gameId/management-snapshot`，可一次取得 `overview + checklist + traffic incident review` 的主持人巡檢總覽
- `createAppServer` 已收斂為 route 組裝層，`auth`、`traffic incidents`、`blind boxes` 已拆出獨立 route module
- 新增 `GET /games/:gameId/traffic-incidents/review-summary`，可快速取得交通中斷批次審核摘要
- 但批次管理能力仍不完整
- 仍可再補更多巡檢、統計與批量操作

## 4. 尚未完成清單

### 4.1 後端功能缺口

- 更完整的查詢排序、分頁、進階篩選
- 更完整的主持人批次管理 API
- 更多以 PocketBase 實庫執行的端對端驗證
- 前端需要補齊完整互動頁面與角色導覽

### 4.2 權限系統缺口

- 正式身份驗證
- 角色來源與登入態
- host/player/admin 權限矩陣一致化
- 非自有但可授權的觀察/裁判模式
- production 環境停用 `operatorPlayerId` fallback

### 4.3 測試缺口

- 單元測試
- service 層規則測試
- PocketBase 真實整合測試仍需擴充到 CI / 自動化環境
- 權限拒絕案例覆蓋擴充
- 關鍵邊界案例仍可補強，例如商店冷卻、優先購買權、競標並列、盲盒特殊狀態連動

### 4.4 前端

- 尚未開始正式前端開發
- 現有 `Japan/frontend` 內容不是本輪可靠進度基準
- `index.html` 目前仍偏靜態示意頁，尚未形成完整產品流程

## 5. 建議下一步

1. 讓 `requestAuthService` 真正驗證 PocketBase token，取代目前的 header/dev fallback
2. 補 PocketBase 真實整合測試，優先覆蓋一般商店優先購買權與競標 `A / S` 票生成
3. 補更完整的查詢排序、分頁、篩選能力
4. 規劃前端串接順序，先接 `overview / checklist / general-shop / auction-shop`
