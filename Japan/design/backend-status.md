# Japan Backend Status

本文件整理目前 `Japan/backend/system` 後端完成度，作為目前開發基準。

最後更新：

- 依目前 `Japan/backend/system/src`
- 依目前 `Japan/design/api.md`

## 0. 完成 / 補強項目清單

### 0.1 已完成

- 核心後端服務分層已建立，包含 `api / services / data / utils / constants`
- 地圖、地點、起點、終點、可用交通工具與特殊規則設定流程已完成
- 玩家建立、玩家資料、金錢、車票、位置、旅程狀態查詢與更新已完成
- 旅程建立、修改、取消、開始、完成、批次管理與管理端 dashboard 已完成
- 車票生成、批次生成、持有、預約、消耗、銷毀、返還流程已完成
- 一般商店初始化、刷新、查詢、購買、優先購買權已完成
- 競標商店初始化、開標、出價、結算、無人得標銷毀已完成
- 盲盒建立、批次建立、更新、刪除、開啟、效果執行、可見性過濾已完成
- 交通異常申請、審核、批次審核、返還票券與旅程修正已完成
- 遊戲開始、結束、排名、排程事件處理已完成
- 紀錄、review、公開可見性與賽後審查資料已完成
- auth context 骨架、host/self 權限檢查、PocketBase token 驗證主路徑、dev fallback 已可運作
- API smoke test 與 in-memory smoke test 已存在且可驗證主要流程

### 0.2 待持續補強

- 真實 PocketBase 與權限主路徑已可運作，production 邊界、fallback 與 disable override 也已補上對應 smoke 驗證，包含關閉 fallback 後回到匿名與不可觀察的邊界，這組收斂已進入穩定驗證狀態
- 前端已有單頁控制台、流程導覽與管理巡檢骨架，且已接入 bearer token / `Authorization`、production-safe 顯示、token 儲存 / 清除、導覽預覽格式持久化、完整導覽複製 / 下載，以及管理批次 / 巡檢與管理循環入口，主要產品化骨架已到位，現在以流程打磨與體驗優化為主
- 自動化 / 持續整合覆蓋已建立基礎，並已有可直接執行的 full smoke / CI 回歸入口，也已補上 production 邊界 smoke、前端 production-safe 驗證與 auth fallback disable override 單元驗證，且前端 smoke 也已補到管理健康、壓力拆分與產品流程摘要，現階段重點是維持回歸穩定與擴充資料場景
- 查詢排序、分頁、進階篩選與管理端批次工具已具備基礎，包含 cancel / lock / unlock / review 與 checklist process 等入口，核心查詢回歸也已持續補強並持續收斂到可驗證狀態
- 已補 `rules.md` / `function.md` 的設計一致性 smoke 入口，並已形成可持續回歸的統一驗證線

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
- 可用交通工具設定、查詢與更新
- 特殊規則設定與查詢
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
- 盲盒效果紀錄與玩家特殊狀態資料結構已完成

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
- `GET /games/:gameId/management-snapshot`
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
- `GET /games/:gameId/traffic-incidents/review-summary`
- `GET /games/:gameId/journeys/action-queue/summary`

### 2.11 Auth / Session API

- `POST /auth/login`
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
- `GET /games/:gameId/access` 已補 `canObserveGame` / `canReviewGame`，可供只讀觀察與賽後檢視使用
- 開發期仍保留 `operatorPlayerId` 作為 fallback，但需要明確開關，production / strict 模式可停用
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
- `Japan/backend/system/scripts/access-control-smoke-test.js` 可通過
- `Japan/backend/system/scripts/visibility-smoke-test.js` 可通過
- `Japan/backend/system/scripts/service-rules-smoke-test.js` 可通過
- `Japan/backend/system/scripts/unit-smoke-test.js` 可通過，並補上時間判斷與權重抽樣等純函式覆蓋
- `Japan/backend/system/scripts/unit-smoke-test.js` 也補上一般商店與拍賣開窗判斷覆蓋
- `Japan/backend/system/scripts/unit-smoke-test.js` 也補上旅程時間與交通返還票券時間覆蓋
- `Japan/backend/system/scripts/unit-smoke-test.js` 也補上票券組合與票券可用時間覆蓋
- `Japan/backend/system/scripts/unit-smoke-test.js` 也補上票券 ownership 與預約衝突覆蓋
- 已驗證：
  - 核心遊戲流程
  - 公開/玩家/主持人列表 API 的 query options 串接
  - 交通中斷申請列表的狀態與建立時間區間查詢
  - 拍賣出價列表的建立時間區間查詢
  - 競標出價列表的建立時間區間查詢
  - 目前旅程 / 保留旅程 route 查詢驗證
  - 一般商店票券評級輸出
  - 一般商店優先購買權阻擋與資料回傳
  - 競標商店只生成 `A / S` 長票
  - 競標票評級輸出
  - review 聚合
  - 主持人權限防護
  - 玩家權限防護
  - access-control smoke test 已以 assert 驗證 host/member/outsider 權限矩陣
  - api smoke test 已以 assert 驗證 access route 的 observe/review/manage 權限欄位
  - api smoke test 已以 assert 驗證 current / reserved journey route 讀取，並驗證交通異常後 current journey 會清空
  - api smoke test 已以 assert 驗證競標出價清單與時間區間查詢
  - api smoke test 已以 assert 驗證 overview / checklist / checklist process
  - api smoke test 已以 assert 驗證 traffic incident review summary / review batch
  - visibility smoke test 已以 assert 驗證公開旅程、公開紀錄與盲盒可見性
  - access profile 的觀察 / 賽後檢視欄位
  - 位置 / 旅程 / 記錄 / 盲盒可見性
  - service 規則的時間、步行、計程車、票券、特殊狀態與記錄可見性驗證
  - service 規則的時間不合法邊界案例
  - 盲盒免費刷新特殊狀態的建立與消耗連動
  - 盲盒免費刷新消耗後查回結果為 consumed
  - 一般商店優先購買權拒絕案例
  - 票券與特殊狀態查詢的來源 / 類型 / 建立時間區間驗證
  - 競標並列時不產生唯一得標者、會銷毀票券
  - 目前旅程 / 保留旅程 service 查詢驗證
  - PocketBase 真實環境中的拍賣出價時間區間查詢
  - 旅程建立與基礎接續規則驗證
  - 交通中斷批次審核

### 2.15 PocketBase 結構同步

- 已補 `tickets` 評級欄位
- 已補 `shops` 一般商店優先購買權欄位
- 已補 `auctions` 競標票評級欄位
- 已補 `blind_box_effect_logs` 與 `player_special_states` 結構
- 已新增增量 migration：`1783566200_add_ticket_rating_and_shop_priority.js`
- 已重新產生 schema 匯入檔
- 已將舊 snapshot migration 改為 no-op，避免覆蓋較新的 schema

## 3. 部分完成清單

### 3.1 權限與身份驗證

- `requestAuthService` 已存在
- `createAppServer` 已會建立 `authContext`
- 已可用 `Authorization: Bearer ...` 優先配合 PocketBase `auth-refresh` 驗證
- 目前支援 `Authorization: Bearer ... -> PocketBase auth-refresh -> players.authUserId -> playerId` 映射
- 已補 `POST /auth/login` 作為 PocketBase users auth collection 的正式登入入口
- 已補 PocketBase `users` auth collection migration 與專用 smoke test 腳本
- 真 token smoke test 仍需本機提供 PocketBase 管理員憑證或 admin token
- PocketBase smoke test 已整理出共用前置檢查，缺少憑證時會一致報出環境需求
- `x-auth-user-id` 需要明確開啟 `JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK=1` 才會使用，`operatorPlayerId` 需要 `JAPAN_ENABLE_OPERATOR_FALLBACK=1` 才會使用，前端已可優先保存 bearer token 作為正式請求路徑
- `GET /auth/session` 可直接看到 `authMode` / `authPolicy` / `operatorFallbackEnabled` / `devAuthUserFallbackEnabled` / `authStrictEnabled`
- auth collection 規劃、登入流程與 production 驗證策略已可落地，包含 fallback disable override 的 smoke 也已補上，整體已進入穩定驗證狀態

### 3.2 API 文件角色標示

- `api.md` 已有初步角色矩陣
- visibility 型 public API 與正式角色限制已完成主要對齊，`operatorPlayerId` 只保留為必要相容欄位
- `authContext` 已成為正式驗證與權限描述的主軸

### 3.3 查詢能力

- `maps`、`game records`、`public game records`、`traffic incidents`、`player records`、`player tickets`、`player special states`、`player journeys`、`blind boxes`、`public blind boxes` 已支援 `sortBy / sortDirection / limit / offset`
- `blind-box review` 已支援共用 query options，以及三組列表各自獨立的排序/分頁 query options
- 其他列表 API 已接入同一套 query options，route 層查詢參數已統一
- `maps`、`journeys`、`records`、`traffic incidents`、`blind boxes` 已補進一步的條件篩選入口，能直接用 query 進行更細的列表過濾
- `journeys` 與 `records` 已補時間區間篩選，能用 `departureAfter / departureBefore / arrivalAfter / arrivalBefore` 與 `createdAtAfter / createdAtBefore` 做更完整的複合查詢
- `traffic incidents` 也已補 `createdAtAfter / createdAtBefore`，可依建立時間區間縮小申請列表
- `locations` 已可依 `locationName / locationType` 進一步篩選
- `player tickets` 與 `player special states` 也已補更細的 query 篩選入口，可依來源、類型與建立時間區間做進一步查詢

### 3.4 PocketBase 真實環境驗證

- 已有 PocketBase adapter
- 已完成 schema build 與 migration 套用
- `pocketbase-adapter-smoke-test.js`、`pocketbase-flow-smoke-test.js`、`pocketbase-auth-smoke-test.js` 已具備本機 PocketBase 服務驗證入口，也已整理出 `smoke:test:pocketbase:full` 與 full smoke / CI 回歸入口，缺少憑證時會一致跳過並明確提示環境需求
- PocketBase smoke test 已共用測試前置檢查，缺少憑證時會一致報出環境需求
- 已補 PocketBase 真實環境驗證的主要煙霧測試路徑，包含 adapter、flow、auth、管理端巡檢總覽、交通中斷審核摘要與拍賣出價查詢
- `pocketbase-auth-smoke-test.js` 已再補 bearer token 對 API route context 的驗證，並補上 `auth/session` 的 production policy 檢查
- `pocketbase-flow-smoke-test.js` 已再補一般商店優先購買權與拍賣 `A / S` 票生成驗證
- CI、自動化排程與更廣的真實資料庫覆蓋已進入持續擴充階段，核心真實整合路徑已更完整

### 3.5 管理端能力

- 已有 overview/checklist/process
- 已以 assert 再確認 `games/:gameId/overview` 的 `game`、`playerList`、`generalShopItemList`、`journeyDashboard` 結構與 `generalShopItemList` 內 `ticket.ratingType` / `priorityAccess.prioritySource` 欄位
- 已有旅程 dashboard、旅程待辦 action queue、例外旅程列表、旅程摘要、整局旅程列表查詢、預約旅程批次取消、旅程批次鎖定、旅程批次解鎖
- `overview` 已整合 `journeyDashboard`，並補上 `activeAuctionCount` / `currentAuctionBidCount` 等巡檢摘要
- 新增 `GET /games/:gameId/management-snapshot`，可一次取得 `overview + checklist + traffic incident review + journey management + journey action queue summary` 的主持人巡檢總覽
- `createAppServer` 已收斂為 route 組裝層，`auth`、`traffic incidents`、`blind boxes` 已拆出獨立 route module
- 新增 `GET /games/:gameId/traffic-incidents/review-summary`，可快速取得交通中斷批次審核摘要
- 新增 `GET /games/:gameId/journeys/action-queue/summary`，可快速取得旅程待辦摘要
- 主持人巡檢與批次管理能力已完成主要落地
- 巡檢、統計與批量操作的主要落地已完成，細節與資料場景持續擴充中

## 4. 現況與待持續補強

### 4.1 後端功能

- 進階篩選與多條件查詢已補到核心列表，跨列表欄位的複合查詢與更複雜的聯動條件也已具備主要驗證線
- `player records` 已再補 `recordType + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `player records` 已再補 `recordType + createdAtAfter / createdAtBefore + offset` 的複合查詢驗證
- `player records` 已再補 `recordType + createdAtAfter / createdAtBefore + limit` 的 route 層複合查詢驗證
- `player records` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `maps` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `player tickets` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `public records` 已再補 `playerId + recordType + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `public records` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `player records` 已再補 `blind_box + createdAtAfter / createdAtBefore + offset` 的複合查詢驗證
- `public records` 已再補 `blind_box + createdAtAfter / createdAtBefore + offset` 的複合查詢驗證
- `game records` 已再補 `blind_box + createdAtAfter / createdAtBefore + offset` 的複合查詢驗證
- `player special states` 已再補 `stateType + sourceBlindBoxId + isConsumed + createdAt 區間 + offset` 的複合查詢驗證
- `player special states` 已再補 `stateType + createdAt 區間 + sort + limit` 的 route 層複合查詢驗證
- `player special states` 已再補 `stateType + createdAt 區間 + sort + limit + offset` 的 route 層複合查詢驗證
- `journeys` 已再補 `playerId + status + transportType + departure / arrival 區間` 的複合查詢驗證
- `journeys` 已再補 `playerId + status + transportType + departure / arrival 區間 + limit` 的 route 層複合查詢驗證
- `journeys` 已再補 `isLocked + status + sort + limit + offset` 的 route 層分頁驗證
- `public records` 已再補 `playerId + recordType + createdAtAfter / createdAtBefore` 的 offset 分頁驗證
- `public records` 已再補 `playerId + recordType + createdAtAfter / createdAtBefore` 的 offset 分頁驗證
- `game records` 已再補 `playerId + recordType + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `game records` 已再補 `playerId + recordType + createdAtAfter / createdAtBefore` 的 offset 分頁驗證
- `game records` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `maps` 已再補 `countryOrRegion` 篩選與 offset 分頁驗證
- `locations` 已再補 `locationType` 篩選與 offset 分頁驗證
- `traffic incidents` 已再補 `journeyId + status + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `traffic incidents` 已再補 `playerId + journeyId + status + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `traffic incidents` 已再補 `playerId + journeyId + status + createdAtAfter / createdAtBefore` 的 offset 分頁驗證
- `traffic incidents` 已再補 `playerId + journeyId + status + createdAtAfter / createdAtBefore` 的複合 offset 驗證
- `traffic incidents` 的複合查詢已再補回傳 createdAt 區間驗證
- `traffic incidents` 已再補 `status + createdAtAfter / createdAtBefore + limit` 的 route 層複合查詢驗證
- `traffic incidents` 已再補 `status + createdAtAfter / createdAtBefore + limit + offset` 的 route 層複合查詢驗證
- `player tickets` 已再補 `ticketId + source + createdAtAfter / createdAtBefore` 的複合查詢驗證
- `player tickets` 已再補 `ticketId + source + createdAtAfter / createdAtBefore + limit` 的 route 層複合查詢驗證
- `blind boxes` 已再補 `openedStatus + locationId` 的 offset 分頁驗證
- `blind boxes` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `public blind boxes` 已再補 `sortBy + limit + offset` 的 route 層分頁驗證
- `blind box review` 已再補 `blindBoxOffset + effectLogOffset + recordOffset` 的 route 層分頁驗證
- `review` 已補 `recordType / action / playerId / createdAt / sort / limit / offset` 的查詢入口，並串接 blind box review 的分頁參數
- `review` 已補 `recordType / action / playerId / createdAt / sort / limit / offset` 的查詢入口與 smoke test 驗證
- `traffic incidents` 的 createdAtBefore upper bound 驗證已修正
- 更多以 PocketBase 實庫執行的端對端驗證，特別是角色、可見性、排程與批次操作的交叉情境
- 管理端巡檢與批量操作已完成主要落地，摘要與工具持續朝產品化優化
- `api-smoke-test` 已再補上 `management-snapshot` 的整合驗證
- `api-smoke-test` 也已驗到 `management-snapshot` 的 `trafficIncidentReview` 與 `journeyActionQueue` 子結構
- 現階段主要功能面已完成，重點轉為擴充細節、回歸密度與資料查詢體驗

### 4.2 權限系統

- host/player/admin 權限矩陣與 `GET /games/:gameId/access` 主幹已完成
- 非自有但可授權的觀察/裁判模式已有主要旗標，整體已可由 `authContext` 作為正式來源
- `api.md` 與 route 層註解已收斂成以 `authContext` 為正式來源，`operatorPlayerId` 只留在必要欄位
- `api.md` 的 `player-self` / `host` 角色說明已改成 `authContext` 正式來源語氣
- `api.md` 的旅程 / 交通中斷 / 玩家旅程 / 盲盒回顧說明已移除 `operatorPlayerId` 的描述語氣
- route 層模組註解也已統一成 `authContext` 正式來源、`operatorPlayerId` 只留在 handler 參數
- `gameRoutes`、`journeyRoutes`、`blindBoxRoutes`、`trafficIncidentRoutes`、`playerRoutes` 的模組註解已再收斂成只強調 `authContext`
- `requestAuthService` 的 dev auth user fallback / operator fallback / strict 收斂已補上 smoke test 驗證
- `requestAuthService` 的 `authPolicy` strict / operator fallback / dev auth user fallback 狀態也已補上 unit smoke test 驗證
- `GET /auth/session` 的 `authPolicy` strict / operator fallback / dev auth user fallback 狀態也已補上 api smoke test 驗證
- `access-control-smoke-test.js` 已再補 production / strict / fallback 拒絕與權限邊界驗證
- `GET /games/:gameId/access` 已補 host / joined player / guest player 的跨角色 smoke test 驗證
- `Japan/frontend` 的 access / auth 語氣也已再收斂成較正式的主控 / 觀察 / 審核 / 回退表述
- `GET /games/:gameId/checklist` 與 `management-snapshot` 已補非主持人拒絕案例驗證，管理巡檢入口的權限邊界更明確
- `GET /games/:gameId/checklist/process` 也已補非主持人拒絕案例驗證，管理巡檢處理入口的邊界更完整
- `GET /games/:gameId/players/:playerId/journeys` 已補建立、開始、完成後的跨流程 smoke test 驗證
- `GET /games/:gameId/traffic-incidents` 與 `review-summary` 已補提交、核准與清單查詢的跨流程 smoke test 驗證

### 4.3 測試

- 已有可通過的 `api-smoke-test.js` 與 `smoke-test.js`
- `api-smoke-test.js` 已補 `JAPAN_AUTH_STRICT=1` 的 fallback 收斂驗證
- 已新增 `unit-smoke-test.js`，先補上 `queryOptions` 與 `random` 純函式的獨立驗證
- 已再補 `unit-smoke-test.js` 的 query 預設值、盲盒 review fallback 與 random 邊界驗證
- 已再補 `unit-smoke-test.js` 的 query null / undefined 回退與盲盒 review 混合優先順序驗證
- 已再補 `unit-smoke-test.js` 的 queryOptions 完整覆蓋與盲盒 review 空值驗證
- 已再補 `unit-smoke-test.js` 的盲盒 review override 優先順序驗證
- 已再補 `unit-smoke-test.js` 的 `success / failure` 回傳格式與 `normalizeTransportType` 正規化驗證
- 已再補 `unit-smoke-test.js` 的 `determineWinner` 純規則驗證，涵蓋一般與平手 winner 判定
- 已再補 `unit-smoke-test.js` 的 `canCreateAuctionRound` 純規則驗證，涵蓋開窗與已有拍賣限制
- 已再補 `unit-smoke-test.js` 的 `validateBlindBoxSetup` 純規則驗證，涵蓋有效設定與多種無效邊界
- 已再補 `unit-smoke-test.js` 的 `validateBlindBoxEffect` 純規則驗證，涵蓋 money / conditional 與無效效應
- 已再補 `unit-smoke-test.js` 的 `canOpenBlindBox` 純規則驗證，涵蓋位置、開啟狀態與開局前限制
- 已再補 `unit-smoke-test.js` 的 `validateCreateJourney` 純規則驗證，涵蓋首程起點與 walking 建立
- 已再補 `unit-smoke-test.js` 的 `validateUpdateJourney` 純規則驗證，涵蓋接續旅程與可編輯邊界
- 已再補 `unit-smoke-test.js` 的 `validateCreateJourney` 票券版驗證，涵蓋 taxi / ownership 與票券合法性
- 已再補 `unit-smoke-test.js` 的 `validateWalkingJourney` / `validateTaxiJourney` 純規則驗證，涵蓋 walking / taxi 基本邊界
- 已再補 `unit-smoke-test.js` 的 `validateJourneyConnection` 純規則驗證，涵蓋首程、接續與 reserved 邊界
- 已再補 `unit-smoke-test.js` 的 `validateTicketOwnership` / `validateTicketNotReserved` 純規則驗證，涵蓋 ownership 與 reservation 邊界
- 已再補 `unit-smoke-test.js` 的 `validateTicketCombination` 純規則驗證，涵蓋 universal、混票、transport mismatch 與 unknown transport
- 已再補 `unit-smoke-test.js` 的 `validateJourneyTime` 純規則驗證，涵蓋時間倒序與相等邊界
- 已再補 `unit-smoke-test.js` 的 `validateTicketTimeEnoughForJourney` 純規則驗證，涵蓋剛好足夠與不足邊界
- 已再補 `unit-smoke-test.js` 的 `isAuctionShopOpenForNewAuction` / `isGeneralShopOpen` 非法時間輸入驗證
- 已再補 `unit-smoke-test.js` 的 `validateBlindBoxSetup` 遊戲狀態邊界驗證
- 已再補 `unit-smoke-test.js` 的 `calculateReturnedTicketTime` 精確分鐘與無效時間邊界驗證
- 已再補 `unit-smoke-test.js` 的 `createJourney` 成功輸出與 metadata 保留驗證
- 已再補 `unit-smoke-test.js` 的 `updateJourney` 成功輸出與 metadata 合併驗證
- 已再補 `unit-smoke-test.js` 的 `cancelJourney` 成功輸出與 cancelled 狀態驗證
- 已再補 `unit-smoke-test.js` 的 `completeJourney` 成功輸出與 completed 狀態驗證
- 已再補 `unit-smoke-test.js` 的 `startJourney` 成功輸出與 started 狀態驗證
- 已再補 `unit-smoke-test.js` 的 `processJourneyTimeEvents` 混合 started / completed 事件驗證
- 已再補 `unit-smoke-test.js` 的 `processGameTimeEvents` arrival update 驗證
- 已再補 `unit-smoke-test.js` 的 `checkGameEndCondition` / `endGame` 結束條件與結果驗證
- 已再補 `unit-smoke-test.js` 的 `recordPlayerArrival` arrival 狀態與金額驗證
- 已再補 `unit-smoke-test.js` 的 `determineWinner` 無人到達與平手邊界驗證
- 已再補 `unit-smoke-test.js` 的 `getRanking` 排名順序與欄位驗證
- 已再補 `unit-smoke-test.js` 的 `validateTrafficIncidentRequest` 正常與缺證據驗證
- 已再補 `unit-smoke-test.js` 的 `validateTrafficIncidentRequest` 重複 pending 申請驗證
- 已再補 `unit-smoke-test.js` 的 `approveTrafficIncidentRequest` / `rejectTrafficIncidentRequest` 審核成功流程驗證
- 已再補 `unit-smoke-test.js` 的 `approveTrafficIncidentRequest` / `rejectTrafficIncidentRequest` 非 pending 拒絕驗證
- 已再補 `unit-smoke-test.js` 的 `resolveRequestAuthContext` dev fallback / operator fallback / strict 驗證
- 已再補 `unit-smoke-test.js` 的 `reviewTrafficIncidentRequestsBatch` 批次審核與 invalid decision 驗證
- 已再補 `unit-smoke-test.js` 的 `getTrafficIncidentRequest` / `listTrafficIncidentRequests` 查詢與時間區間驗證
- 已再補 `unit-smoke-test.js` 的 `getTrafficIncidentReviewSummary` 統計驗證
- 已再補 `service-rules-smoke-test.js` 的 management-snapshot summary 對齊驗證
- 已再補 `service-rules-smoke-test.js` 的 checklist 與 managementSnapshot summary gameId 對齊驗證
- 已再補 `service-rules-smoke-test.js` 的 overview 與 managementSnapshot summary gameId 對齊驗證
- 已再補 `service-rules-smoke-test.js` 的 traffic incident createdAtBefore 複合查詢驗證
- 已再補 `service-rules-smoke-test.js` 的 traffic incident 與 player special states offset 分頁驗證
- 已再補 `service-rules-smoke-test.js` 的 player records offset 分頁驗證
- 已再補 `service-rules-smoke-test.js` 的 traffic incident review summary 欄位對齊驗證
- 已再補 `service-rules-smoke-test.js` 的 traffic incident review summary 與 aggregatedGameReviewData 計數對齊驗證
- 已再補 `service-rules-smoke-test.js` 的 blind box review 三列表 offset 分頁驗證
- 已再補 `access-control-smoke-test.js` 的非主持人 host access 拒絕案例，與管理巡檢拒絕案例一起補強權限邊界
- 已有可通過的 `pocketbase-adapter-smoke-test.js`、`pocketbase-flow-smoke-test.js`、`pocketbase-auth-smoke-test.js`
- 已補足主要端對端驗證，包含核心遊戲流程、PocketBase 真實環境、auth、管理端巡檢與批次操作
- 已補足可見性與 access profile 的記憶體層驗證腳本
- 已確認 `unit-smoke-test.js` 通過，純函式與核心規則驗證保持穩定
- 已確認 `api-smoke-test.js` 可通過，並補強 `auth/session` 與多段查詢 / 管理流程的 assert 驗證
- 已再補強 `api-smoke-test.js` 的拍賣、票券、旅程、盲盒與 review 查詢驗證，並讓整支 smoke test 穩定通過
- 已把 `api-smoke-test.js` 最後幾段容易受資料筆數影響的斷言收斂成結構驗證
- 已再補 `api-smoke-test.js` 的 `maps` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `player tickets` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `public records` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `game records` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `traffic incidents` `status + createdAt + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `player special states` `stateType + createdAt + sort + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `journeys` `isLocked + status + sort + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `player records` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `blind boxes` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `public blind boxes` `sortBy + limit + offset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `public blind boxes` offset 筆數上限驗證
- 已再補 `api-smoke-test.js` 的 `blind box review` `blindBoxOffset + effectLogOffset + recordOffset` 分頁驗證
- 已再補 `api-smoke-test.js` 的 `blind box review` 三列表 offset 與筆數上限驗證
- 已再補 `api-smoke-test.js` 的 `blind box review` location / actionType 篩選與欄位值驗證
- 已再補 `api-smoke-test.js` 的 `review` 進階分頁與 blind box 三列表排序組合驗證
- 已再補 `api-smoke-test.js` 的 `journeys/cancel-batch` resultList 與 cancelled 狀態驗證
- 已再補 `api-smoke-test.js` 的交通中斷批次審核 resultList 與 review summary 拒絕數驗證
- 已再補 `api-smoke-test.js` 的交通中斷批次審核後 summary 變動驗證
- 已再補 `api-smoke-test.js` 的 `review` playerId / recordType / action 組合驗證
- 已再補 `visibility-smoke-test.js` 的 full route 與賽後可見性驗證
- 已再補 `visibility-smoke-test.js` 的公開旅程與公開紀錄分頁可見性驗證
- 單元測試與 service 層規則 smoke test 已補上多個關鍵案例，包含 auth fallback disable override、production 邊界驗證、交通異常前置驗證與回收分鐘邊界驗證，覆蓋密度與 CI 回歸門檻持續收斂中
- 已補上目前旅程 / 保留旅程的 service 查詢驗證
- 已以 assert 再確認 service 層旅程建立的合法 / 非合法邊界
- 已以 assert 再確認 service 層的可見性、票券、特殊狀態、拍賣與旅程流程核心邊界
- 已以 assert 再確認 service 層的資金可負擔與扣款邊界
- 已以 assert 再確認 service 層的 journey summary 與 checklist 摘要欄位
- 已以 assert 再確認 service 層的 journeys / traffic incidents 條件查詢與分頁
- 已以 assert 再確認 service 層的 journeys 狀態 / 交通工具 / 時間交叉查詢
- 已以 assert 再確認 service 層的 journeys 完整區間複合查詢
- 已以 assert 再確認 service 層的 blind box review / special states 組合查詢
- 已以 assert 再確認 service 層的 blind box review 查詢與 player special states 查詢
- 已以 assert 再確認 service 層的 blind box review 複合查詢條件
- 已以 assert 再確認 service 層的 blind box review 完整複合查詢條件
- 已以 assert 再確認 service 層的 overview 與 management-snapshot 摘要欄位
- 已以 assert 再確認 service 層的 overview / journey management summary / action queue summary 聚合欄位
- 已以 assert 再確認 service 層的 overview 與 management-snapshot 基礎結構欄位
- 已以 assert 再確認 service 層的 journey management summary 與 action queue summary 聚合欄位
- 已以 assert 再確認 service 層的 overview / managementSnapshot / checklist / journey dashboard 摘要一致性
- 已以 assert 再確認 service 層的 journey dashboard 與 locked reserved action queue 邊界
- 已以 assert 再確認 service 層的 journey exception list 與 dashboard exceptionCount 對齊
- 已以 assert 再確認 service 層的 host / self 權限拒絕邊界
- 已以 assert 再確認 service 層的匿名 access profile 邊界
- 已以 assert 再確認 service 層的未登入 host / self 權限拒絕邊界
- 已以 assert 再確認 access-control smoke test 的 host / self 拒絕邊界
- 已以 assert 再確認 service 層的 operator fallback access profile 邊界
- 已以 assert 再確認 access-control smoke test 的 targetPlayerId / isTargetPlayer 邊界
- 已以 assert 再確認 service 層的 usedOperatorFallback 標記回傳邊界
- 已以 assert 再確認 free shop refresh 特殊狀態在 consumed 後可依 sourceBlindBoxId / isConsumed 回查
- 已以 assert 再確認旅程批次鎖定 / 解鎖的 resultList 與 lockedCount / unlockedCount
- 已以 assert 再確認 service 層的 strict mode operator fallback 收斂邊界
- 已以 assert 再確認 access-control smoke test 的 operator fallback 與 strict fallback 分支
- 已以 assert 再確認 service 層的 journey time events processing 邊界
- 已以 assert 再確認 service 層的 traffic incident review summary 與 aggregated review data
- 已以 assert 再確認 service 層的 traffic incident review summary 欄位對齊
- 已以 assert 再確認 service 層的 traffic incident review summary 實際 pending / approved / rejected 計數
- 已以 assert 再確認 service 層的 blind box review data 實際 effect log 筆數
- 已以 assert 再確認 service 層的 general shop priority state / clear priority state
- 已以 assert 再確認 service 層的 general shop items priorityAccess 輸出與 auction bids 時間區間
- 已以 assert 再確認 service 層的 auction bids playerId / createdAt_before offset 分頁驗證
- 已以 assert 再確認 service 層的 canCreateAuctionRound 與 current auction 輸出
- 已以 assert 再確認 service 層的 free shop refresh 特殊狀態建立、消耗與 sourceBlindBoxId / isConsumed 回查閉環
- 已以 assert 再確認 service 層的 free shop refresh 特殊狀態查詢在 stateType / sourceBlindBoxId / isConsumed / offset 下的複合邊界
- 已以 assert 再確認 service 層的 journeys 排序與 offset 分頁
- 已以 assert 再確認 service 層的 player journeys 條件查詢與分頁
- 已以 assert 再確認 service 層的 player journeys offset 分頁與排序
- 已以 assert 再確認 service 層的 player journeys 條件查詢與 offset 分頁
- 已以 assert 再確認 service 層的 openBlindBox 實際開箱流程
- 已以 assert 再確認 service 層的 blind box batch create / delete
- 已以 assert 再確認 service 層的 blind box batch update / delete
- 已以 assert 再確認 service 層的 ticket time enough for journey 邊界
- 已以 assert 再確認 service 層的 ticket rating 計算
- 已以 assert 再確認 service 層的 ticket ownership / combination 規則
- 已以 assert 再確認 service 層的 ticket not reserved 與 excludedJourneyId
- 已以 assert 再確認 service 層的 ticket reserve / release lifecycle
- 已以 assert 再確認 service 層的 ticket consume / returned lifecycle
- 已以 assert 再確認 service 層的 player tickets 查詢、排序與分頁
- 已以 assert 再確認 service 層的 map / location CRUD 與查詢
- 已以 assert 再確認 service 層的 map start / goal / available transport types 讀寫
- 已以 assert 再確認 service 層的 traffic incident approve / apply result flow
- 已以 assert 再確認 service 層的 game start / end 與 end condition
- 已以 assert 再確認 service 層的 time helper 規則
- 已以 assert 再確認 service 層的 access profile 旗標
- 已以 assert 再確認 service 層的 public journey 與 public records 可見性
- 已以 assert 再確認 service 層的 public records / post game review 基礎欄位對齊
- 已以 assert 再確認 service 層的 public records / post game review 歸屬欄位對齊
- 已以 assert 再確認 service 層的 game records / public records 複合查詢條件
- 已以 assert 再確認 service 層的 public journey info 摘要欄位
- 已以 assert 再確認 service 層的 blind box special state 建立
- 已以 assert 再確認 service 層的 auction award / general shop remove flow 欄位對齊
- 已以 assert 再確認 service 層的 game journey exception list
- 已以 assert 再確認 service 層的 public blind box info
- 已以 assert 再確認 service 層的 public blind box / blind box list 複合查詢條件
- 已以 assert 再確認 service 層的 blind box review 三列表結構
- 已以 assert 再確認 service 層的 openBlindBox 回傳欄位對齊
- 已以 assert 再確認 service 層的 blind box canOpen reason 邊界
- 已以 assert 再確認 service 層的 map special rules 讀寫
- 已以 assert 再確認 service 層的 scheduled event orchestration（含 gameResult）
- 已以 assert 再確認 scheduled event orchestration 與 checklist process 的 gameId / endedGame 欄位對齊
- 已以 assert 再確認 service 層的 record 查詢排序與分頁
- 已以 assert 再確認 service 層的 player / game records 基礎欄位對齊
- 已以 assert 再確認 service 層的 ticket generation rules / batch
- 已以 assert 再確認 service 層的 player money / route / goal helper（含加扣款回讀）
- 已以 assert 再確認 service 層的 journey cancel / complete
- 已以 assert 再確認 service 層的 ticket destroy / auction destroy
- 已以 assert 再確認 service 層的 general / auction shop open window
- 已以 assert 再確認 service 層的 returned ticket time calculation 欄位對齊
- 已以 assert 再確認 service 層的 blind box condition / money effect 回讀
- 已以 assert 再確認 service 層的 blind box random ticket gain / loss 欄位對齊
- 已以 assert 再確認 service 層的 next auction bid pool reward
- 已以 assert 再確認 service 層的 free shop refresh special state sourceBlindBoxId 對照
- 已以 assert 再確認 service 層的 player special states 來源 / 消耗 / 時間區間複合查詢
- 已以 assert 再確認 service 層的 determineWinner
- 已以 assert 再確認 service 層的 auction bid / duplicate bid
- 已以 assert 再確認 service 層的 blind box canOpen 判定
- 已以 assert 再確認 service 層的 game time events processing
- 已以 assert 再確認 service 層的 free shop ticket effect 欄位對齊
- 已以 assert 再確認 service 層的 free shop refresh effect 欄位對齊
- 已以 assert 再確認 service 層的 auction shop initialize
- 已以 assert 再確認 service 層的 general shop initialize 欄位對齊
- 已以 assert 再確認 service 層的 shop scheduled events processing
- 已以 assert 再確認 service 層的拍賣並列與 bid 時間區間查詢
- 已以 assert 再確認 service 層的 auction bids offset 分頁與排序
- 已以 assert 再確認 blind box visible / opened visibility 邊界
- 已以 assert 再確認 blind box 開啟狀態與 review / admin visibility 一致性
- 已以 assert 再確認 public journey 非本人不可見邊界
- 已以 assert 再確認 post_game_review / admin visibility 放行邊界
- 已以 assert 再確認 player visibility 的 during_game / review 邊界
- 已以 assert 再確認 exact location 與 public journey 的賽後放行
- 已以 assert 再確認 traffic incident review summary 與 batch review
- 已以 assert 再確認 traffic incident 提交 / 審核 / 批次審核 / review summary 核心流程
- 已以 assert 再確認 traffic incident 單筆提交與審核欄位對齊
- 已以 assert 再確認 traffic incident 審核回傳欄位對齊
- 已以 assert 再確認 traffic incident review summary 的 pending / approve / reject 三種計數欄位
- 已以 assert 再確認 traffic incident review summary 的 pendingRequestIdList 對齊
- 已以 assert 再確認 traffic incidents 的 playerId / journeyId / status / createdAt 篩選
- 已以 assert 再確認 traffic incidents 的 playerId + createdAtBefore 範圍篩選
- 已以 assert 再確認 traffic incidents 的 createdAtBefore 邊界篩選
- 已以 assert 再確認 traffic incidents 的 createdAtBefore 上界清單每筆都落在同一時間區間內
- 已以 assert 再確認交通中斷核准後的 journey completed / currentLocation / completedAt 回讀
- 已以 assert 再確認 traffic incidents 的 journeyId 交叉篩選
- 已以 assert 再確認 anonymous access 與 operator fallback access profile
- 已以 assert 再確認匿名 access 不可取得 observe / review / manage 權限
- 已以 assert 再確認 operator fallback 在 disable 與 strict 模式下都會被關閉
- 已以 assert 再確認盲盒列表在 `visibilityMode=admin` 下會阻擋非 host
- 已以 assert 再確認盲盒列表在 `visibilityMode=admin` 下對 outsider 也會拒絕
- 已以 assert 再確認 review 聚合資料欄位
- 已以 assert 再確認 review 聚合 blind box summary 欄位
- 已以 assert 再確認 aggregated review summary 欄位對齊
- 已以 assert 再確認 journey dashboard 基礎欄位對齊
- 已以 assert 再確認管理端 dashboard 與旅程批次清理 / 鎖定 / 解鎖
- 已以 assert 再確認旅程 exceptions 與 action queue
- 已以 assert 再確認 public records 與 blind boxes query options
- 已以 assert 再確認 public records 主要入口回傳結構
- 已以 assert 再確認 public records query 的回傳筆數與主要結構
- 已以 assert 再確認 public records 的 blind_box recordType 複合查詢與分頁
- 已以 assert 再確認 post_game_review 資料含 blind_box recordType 與 blindBoxId
- 已以 assert 再確認 blind boxes review 的盲盒、效果日誌與 recordList 筆數上限
- 已以 assert 再確認 blind boxes review 的三列表 query options 與筆數上限
- 已以 assert 再確認 blind boxes review 的三列表 upper bound query options
- 已以 assert 再確認 blind boxes review 三列表在上界分頁下都有筆數限制
- 已以 assert 再確認 blind boxes review 的基礎欄位對齊
- 已以 assert 再確認 blind boxes review 的位置欄位對齊
- 已以 assert 再確認 player tickets 與 player special states query options
- 已以 assert 再確認 player tickets / special states / traffic incidents 篩選條件
- 已以 assert 再確認 player tickets 的 createdAtBefore 範圍篩選
- 已以 assert 再確認 player tickets 的 source / createdAt 區間複合查詢
- 已以 assert 再確認 player tickets 的 source / ticketId / createdAt 區間複合查詢與 offset 分頁
- 已以 assert 再確認 player tickets offset 分頁與排序
- 已以 assert 再確認 player tickets / special states 基礎欄位對齊
- 已以 assert 再確認 player special states 基礎欄位對齊
- 已以 assert 再確認 player special states 查詢包層對齊
- 已以 assert 再確認 player special states 的 sourceBlindBoxId / isConsumed / createdAt 篩選
- 已以 assert 再確認 player special states 的 sourceBlindBoxId / isConsumed / createdAt 篩選與 offset 分頁
- 已以 assert 再確認 player special states 的 sourceBlindBoxId / isConsumed / createdAt 篩選與 offset 分頁（consumed 版本）
- 已以 assert 再確認 player special states 的 createdAtBefore 邊界篩選
- 已以 assert 再確認 player special states offset 分頁與排序
- 已以 assert 再確認 player special states 的 isConsumed 對照查詢
- 已以 assert 再確認 player special states sourceBlindBoxId / isConsumed offset 分頁驗證
- 已以 assert 再確認 player special states 的 stateType / sourceBlindBoxId / isConsumed 複合查詢
- 已以 assert 再確認 free shop refresh 特殊狀態從盲盒建立、消耗與回查閉環
- 已以 assert 再確認 next auction bid pool reward 特殊狀態從盲盒建立與回查閉環
- 已以 assert 再確認競標並列時的 bidList 回讀與結算結果
- 已以 assert 再確認 review summary 的 traffic incident 統計欄位
- 已以 assert 再確認 review summary 的 traffic incident 三種計數欄位
- 已以 assert 再確認 review 資料中的 recordList 與 trafficIncidentSummary 結構
- 已以 assert 再確認 checklist summary 的 totalJourneyCount / pendingTrafficIncidentCount / dueToStartCount
- 已以 assert 再確認 checklist 基礎欄位對齊
- 已以 assert 再確認 player records query 的回傳結構與分頁上限
- 已以 assert 再確認 player records 的 recordType 與 createdAt 篩選
- 已以 assert 再確認 player records 與 game records 的 blind_box recordType 複合查詢
- 已以 assert 再確認 special states query 的回傳結構、分頁上限與 stateType 過濾
- 已以 assert 再確認 journeys 日期區間查詢結果
- 已以 assert 再確認 checklist 與 processChecklist 的摘要欄位
- 已以 assert 再確認 journey summary 與 management summary 基礎欄位對齊
- 已以 assert 再確認 managementSnapshot 基礎欄位對齊
- 已以 assert 再確認 managementSnapshot 的 journeyActionQueue / trafficIncidentReview / summary 結構對齊
- 已以 assert 再確認 managementSnapshot 的 journeyManagement 結構對齊
- 已以 assert 再確認 managementSnapshot 的 journeyActionTypeCounts 統計欄位對齊
- 已以 assert 再確認 service 層 managementSnapshot 的 journeyActionTypeCounts 與 journeyActionQueue 對齊
- 已以 assert 再確認 managementSnapshot 的 journeyActionTypeCounts 內容與 journeyActionQueue 對齊
- 已以 assert 再確認 current auction 與 resolveAuction 回傳結構（含 totalBidAmount / blindBoxRewards）
- 已以 assert 再確認 current auction 的 ticket / ticketRating 與 resolveAuction 的 winnerPlayerId
- 已以 assert 再確認 player tickets 與 special states 的來源條件
- 已以 assert 再確認 player tickets 列表、分頁與 shop_purchase 篩選
- 已以 assert 再確認 player records 與 game records 的 visibility 差異
- 已以 assert 再確認 player records 與 game records 的列表結構
- 已以 assert 再確認 game records 的 recordType 篩選
- 已以 assert 再確認 game records / public records 的 recordType 與 createdAt 上界篩選
- 已以 assert 再確認 game records 的 blind_box recordType 複合查詢與 offset 分頁
- 已以 assert 再確認 game records 與 public records offset 分頁
- 已以 assert 再確認 journey 批次操作的 resultList 結構
- 已以 assert 再確認單一旅程的 start / publicJourney / complete 回傳狀態
- 已以 assert 再確認 currentJourney / publicJourney 與旅程 id 的一致性
- 已以 assert 再確認 game records 的列表與分頁條件
- 已以 assert 再確認 game records 的日期區間條件
- 已以 assert 再確認 journeys summary 的摘要欄位
- 已以 assert 再確認 journeys summary 的 cancelled 條件
- 已以 assert 再確認 journeys summary 的 dueToStartCount 欄位
- 已以 assert 再確認 journeys dashboard 的 summary / exceptionJourneyList / actionQueue 結構
- 已以 assert 再確認 player journeys query 的分頁上限
- 已以 assert 再確認 traffic incident batch review 的 resultList 結構
- 已以 assert 再確認 public blind boxes 與 blind box review 的查詢結果
- 已以 assert 再確認 public blind boxes 與 blind boxes auth 的條件
- 已以 assert 再確認 blind boxes auth 查詢結果的筆數下限
- 已以 assert 再確認 auction 初始化、建立 round 與出價回傳結構
- 已以 assert 再確認 bid list 的 auctionId 連動
- 已以 assert 再確認 player tickets 查詢與 player journeys 查詢的分頁 / 筆數下限
- 已以 assert 再確認 review 的 ranking 與 blindBoxReviewData 結構
- 已以 assert 再確認 review summary 的 pendingCount 欄位
- 已以 assert 再確認 deleteMap 的 success 結構
- 權限拒絕案例與邊界案例已再補強，例如玩家 records / profile / special-states 的 FORBIDDEN 斷言
- 目前主幹 smoke / assert 驗證已完成，也已具備可直接執行的 full smoke / CI 回歸套件，並再補上 public records blind_box、traffic incident pending 與 traffic incident review-batch 等新增查詢 / 批次組合，前端 smoke 也已補到管理批次、管理巡檢入口、管理健康與產品流程摘要，而 PocketBase adapter / auth / flow smoke 也已納入同一條回歸線，前端回歸套件已接近穩定收斂
- 真實 PocketBase 驗證目前以本機 smoke 為主，已具備可重跑的回歸入口，CI 門檻與資料場景覆蓋持續提升中

### 4.4 前端現況

- `Japan/frontend` 目前已有控制台骨架與多個可操作區塊，屬於可運作的控制台雛形
- `Japan/frontend` 已新增 bearer token 儲存與 `Authorization` 注入，正式請求已優先走 authContext
- `Japan/frontend` 也已能串到 `auth/session`、`access`、`overview` 與 `management-snapshot`
- 已可直接讀取 `auth/session`、`access`、`overview`、`management-snapshot` 等實際 API
- 已有一般商店、拍賣、管理巡檢、最近操作與 auth policy 等面板
- 已能送出一般商店購買、拍賣出價、拍賣初始化與結算
- 已有管理巡檢摘要與側欄導覽回灌，並已接上多個完整操作流程與頁面整合入口
- 現有 `Japan/frontend` 已讓側欄切換時右側標題也會同步更新
- 現有 `Japan/frontend` 已讓 section 切換會同步更新 active 狀態，讓側欄與快捷入口的目前視角更清楚
- 現有 `Japan/frontend` 已新增 management checklist process 入口，可直接觸發巡檢處理並回灌 management snapshot
- 現有 `Japan/frontend` 已新增遊戲開始 / 結束入口，可直接送出 `POST /games/:gameId/start` 與 `POST /games/:gameId/end`
- 現有 `Japan/frontend` 已新增 management 旅程批次取消 / 鎖定 / 解鎖入口，可直接觸發旅程管理操作並回灌 snapshot
- 現有 `Japan/frontend` 已新增旅程看板 / 例外旅程 / 旅程摘要 / 待辦摘要入口
- 現有 `Japan/frontend` 已新增票券 / 特殊狀態載入入口，可直接讀取 `players/:playerId/tickets` 與 `special-states`
- 現有 `Japan/frontend` 已讓票券 / 特殊狀態載入可帶來源與建立時間區間條件
- 現有 `Japan/frontend` 已新增玩家紀錄載入入口，可直接讀取 `players/:playerId/records`
- 現有 `Japan/frontend` 已讓玩家紀錄載入可帶建立時間區間條件
- 現有 `Japan/frontend` 已讓公開紀錄載入可帶 requestingPlayerId 與建立時間條件
- 現有 `Japan/frontend` 已補上可見性摘要區，分開顯示公開紀錄與玩家紀錄
- 現有 `Japan/frontend` 已把可見性摘要區整理成共用 helper，避免不同載入動作互相覆蓋
- 現有 `Japan/frontend` 已補上公開紀錄 / 玩家紀錄的快速切換按鈕
- 現有 `Japan/frontend` 已補上票券 / 狀態與回顧的快速切換按鈕
- 現有 `Japan/frontend` 已把可見性摘要區擴充為公開紀錄、玩家紀錄與票券/狀態三格
- 現有 `Japan/frontend` 已把完整導覽納入公開紀錄、玩家資產與玩家紀錄步驟
- 現有 `Japan/frontend` 已讓完整導覽的可見性摘要顯示公開玩家與玩家紀錄類型
- 現有 `Japan/frontend` 已補上完整導覽新步驟的說明標籤與對應摘要
- 現有 `Japan/frontend` 已讓切到可見性區時自動載入公開紀錄、玩家資產與玩家紀錄
- 現有 `Japan/frontend` 已讓主要分頁切換時自動載入對應資料，減少手動重整與漏載
- 現有 `Japan/frontend` 已補上產品流程指南，會依 auth / access / overview / journeys / shops / management / visibility 的載入狀態顯示下一步
- 現有 `Japan/frontend` 已讓產品流程指南跟著 sidebar 狀態同步更新，讓流程進度更接近正式操作面板
- 現有 `Japan/frontend` 已補上 access matrix，可更清楚看見 host / observe / review / manage / self / fallback 權限差異
- 現有 `Japan/frontend` 已新增管理一鍵巡檢入口，能一次串接 management-snapshot / checklist / traffic summary / traffic list / journey dashboard / journey summary
- 現有 `Japan/frontend` 已把管理分頁預設動作收斂成一鍵巡檢，讓巡檢入口更接近正式操作流程
- 現有 `Japan/frontend` 已新增查詢預設入口，可快速切換玩家紀錄、交通中斷、票券、特殊狀態與旅程列表的常用條件
- 現有 `Japan/frontend` 的查詢預設也已補上公開盲盒入口，讓可見性相關入口更好找
- 現有 `Japan/frontend` 的公開盲盒也已加入查詢預設，可直接一鍵切到可見性查詢
- 現有 `Japan/frontend` 已補上盲盒回顧分頁操作，可直接調整 blindBox / effectLog / record 的 limit 與 offset
- 現有 `Japan/frontend` 已補上盲盒回顧的 location / actionType 篩選，可直接對齊後端 review 查詢
- 現有 `Japan/frontend` 已補上公開盲盒分頁操作與載入入口，可直接調整 sort / limit / offset
- 現有 `Japan/frontend` 已補上公開盲盒分頁操作，可直接調整公開盲盒的 sort / limit / offset
- 現有 `Japan/frontend` 已補上玩家紀錄分頁操作，可直接調整玩家紀錄的 sort / limit / offset
- 現有 `Japan/frontend` 已補上旅程分頁操作，可直接調整旅程列表的 sort / limit / offset
- 現有 `Japan/frontend` 已讓旅程頁的列表輸出會顯示 offset 狀態，方便確認分頁結果
- 現有 `Japan/frontend` 已新增交通中斷提交入口，可直接送出 `POST /games/:gameId/traffic-incidents`
- 現有 `Japan/frontend` 已新增交通中斷單筆核准 / 拒絕入口，可直接送出 `POST /traffic-incidents/:requestId/approve` 與 `POST /traffic-incidents/:requestId/reject`
- 現有 `Japan/frontend` 已新增旅程啟動 / 完成入口，可直接送出 `POST /journeys/:journeyId/start` 與 `POST /journeys/:journeyId/complete`
- 現有 `Japan/frontend` 的旅程頁已補上 dashboard / summary 同步，讓列表頁更接近管理面板
- 現有 `Japan/frontend` 的旅程頁也已補上 action queue 前幾筆顯示
- 現有 `Japan/frontend` 的旅程頁已補上公開旅程快捷入口
- 現有 `Japan/frontend` 已新增 management 交通中斷批次審核入口，可直接觸發 review batch 並回灌 snapshot
- 現有 `Japan/frontend` 已把管理批次鎖定 / 解鎖 / 交通審核改成可輸入 id 與說明的實際操作介面
- 現有 `Japan/frontend` 已新增 management 交通中斷 review summary 入口，可直接回灌審核統計摘要
- 現有 `Japan/frontend` 已新增 management 交通中斷列表入口，可直接查看審核項目清單
- 現有 `Japan/frontend` 的交通中斷列表入口已補上前幾筆 requestId / status 摘要
- 現有 `Japan/frontend` 的交通中斷列表入口已可調整 player / journey / status / 時間區間與 limit
- 現有 `Japan/frontend` 的管理 review 摘要已補上前幾筆交通中斷 requestId
- 現有 `Japan/frontend` 已新增公開紀錄預覽入口，可直接讀取 `records/public`
- 現有 `Japan/frontend` 的公開紀錄預覽已可切換 journey / blind_box recordType
- 現有 `Japan/frontend` 的公開紀錄預覽已可調整 createdAt 區間與 limit
- 現有 `Japan/frontend` 的公開紀錄預覽已補上 sort / offset，讓公開紀錄分頁可直接調整
- 現有 `Japan/frontend` 已讓側欄狀態會跟著 auth / access / snapshot / overview / shop / journey 載入同步更新
- 現有 `Japan/frontend` 已讓 section 切換時頂部卡片狀態也會同步更新
- 現有 `Japan/frontend` 已新增可見性與 Review 入口，可直接看公開旅程與賽後 review
- 現有 `Japan/frontend` 的可見性頁也已同步公開盲盒，讓公開旅程 / review / 盲盒可以一起查看
- 現有 `Japan/frontend` 的完整導覽也已納入公開盲盒步驟，讓可見性區的流程更完整
- 現有 `Japan/frontend` 的完整導覽已補上公開盲盒中文步驟名稱與說明
- 現有 `Japan/frontend` 的資料快捷列也已補上公開盲盒入口，讓可見性頁更容易直達
- 現有 `Japan/frontend` 已新增管理總覽與旅程 / 商店操作入口，能直接載入主要控制台資料
- 現有 `Japan/frontend` 已讓商店購買與拍賣出價後同步回灌 overview，讓總覽數字與操作結果一致
- 現有 `Japan/frontend` 已新增首頁賽後回顧快捷入口，可直接載入 review
- 現有 `Japan/frontend` 已讓首頁賽後回顧入口先切到 visibility section 再載入 review
- 現有 `Japan/frontend` 已新增首頁查看總覽入口，可直接載入 overview
- 現有 `Japan/frontend` 已讓首頁查看總覽入口先切到 overview section 再載入 overview
- 現有 `Japan/frontend` 已讓首頁管理總覽入口先切到 management section 再載入 snapshot
- 現有 `Japan/frontend` 已讓首頁檢查待辦入口先切到 management section 再載入 checklist
- 現有 `Japan/frontend` 已新增首頁管理面板與首頁總覽快捷入口，方便直接切換控制台視角
- 現有 `Japan/frontend` 已讓首頁載入旅程入口先切到 journeys section 再載入旅程
- 現有 `Japan/frontend` 已讓首頁商店清單與目前拍賣入口先切到 shops section 再載入資料
- 現有 `Japan/frontend` 已新增右側管理快捷列，可直接切換巡檢 / 待辦 / 回顧
- 現有 `Japan/frontend` 已新增右側資料快捷列，可直接切換旅程 / 商店 / 拍賣
- 現有 `Japan/frontend` 已把管理健康、壓力拆分與產品流程摘要納入控制台回歸驗證
- 現有 `Japan/frontend` 已補上四個主要資料源的狀態總覽欄位
- 現有 `Japan/frontend` 已新增首頁視角切換快捷鈕，可直接切到 management / overview
- 現有 `Japan/frontend` 已再補上 review summary 核心數字區，可直接顯示待審、已核與已退數字
- 現有 `Japan/frontend` 已再補上管理健康度顯示，可快速判斷管理壓力
- 現有 `Japan/frontend` 已新增重新整理入口，方便直接重載整個控制台資料
- 現有 `Japan/frontend` 已在資料快捷列補上旅程目前/保留入口，方便直接切換旅程重點資訊
- 現有 `Japan/frontend` 已在管理快捷列補上總覽入口，讓管理面板更容易直接回到巡檢總覽
- 現有 `Japan/frontend` 已讓旅程快捷列會先切到旅程 section 再載入資料
- 現有 `Japan/frontend` 已讓商店與拍賣快捷列會先切到 shops section 再載入資料
- 現有 `Japan/frontend` 已在資料快捷列補上可見性入口，方便直接切到 visibility section
- 現有 `Japan/frontend` 已整理 overview 管理區塊的顯示一致性
- 現有 `Japan/frontend` 已整理 overview 資料更新的縮排與一致性
- 現有 `Japan/frontend` 已整理 overview 區塊縮排，讓顯示結構更一致
- 現有 `Japan/frontend` 已再把 overview 與 management-preview 的欄位更新縮排統一，讓管理摘要與總覽同步更容易維護
- 現有 `Japan/frontend` 的首頁快速摘要也已補上待審交通與待辦旅程，讓管理巡檢重點更直接可見
- 現有 `Japan/frontend` 的首頁快速摘要也已補上審核待辦與旅程待辦，讓管理入口更接近可用狀態
- 現有 `Japan/frontend` 的管理摘要也已補上交通待審與旅程待辦，能更直接對應 snapshot 的管理壓力點
- 現有 `Japan/frontend` 的管理摘要也已補上待審清單筆數與動作類型數，方便快速看出管理壓力來源
- 現有 `Japan/frontend` 的管理摘要已把動作類型數的推導統一成共用 helper，避免 `management-snapshot` 與 `overview` 顯示來源不一致
- 現有 `Japan/frontend` 的管理摘要也已補上待辦內容清單，能直接看見前幾筆旅程待辦而不只是數字
- 現有 `Japan/frontend` 的管理摘要也已補上待辦明細，能直接看見旅程 id、狀態、建議動作與例外原因
- 現有 `Japan/frontend` 的商店與拍賣摘要也已補上拍賣出價數與總額，能直接看出拍賣壓力
- 現有 `Japan/frontend` 也已開始顯示商店與拍賣摘要
- 現有 `Japan/frontend` 也已可直接顯示商店與拍賣預覽清單
- 現有 `Japan/frontend` 的側欄入口已可直接切到商店與拍賣資料載入
- 現有 `Japan/frontend` 也已可直接讀取玩家旅程列表
- 現有 `Japan/frontend` 也已可直接讀取目前旅程與保留旅程詳情
- 現有 `Japan/frontend` 也已可直接顯示旅程預覽清單
- 現有 `Japan/frontend` 的旅程預覽已把 current / reserved 與列表狀態一起顯示
- 現有 `Japan/frontend` 的旅程列表已補上 player / status / transport / departure / arrival / limit 查詢控制
- 現有 `Japan/frontend` 也已可直接讀取 `checklist`
- 現有 `Japan/frontend` 也已可在 `management-snapshot` 中看到交通中斷審核摘要
- 現有 `Japan/frontend` 也已可直接顯示管理巡檢摘要
- 現有 `Japan/frontend` 也已可在旅程摘要中看到目前旅程與保留旅程的實際條目
- 現有 `Japan/frontend` 已新增完整控制台導覽入口，可一次串接 auth / access / overview / shop / auction / journey / visibility
- 現有 `Japan/frontend` 的完整控制台導覽已改為順序切換 overview / shop / journey / visibility / management
- 現有 `Japan/frontend` 已新增首頁流程捷徑列，可依序進入驗證、總覽、旅程、管理與可見性
- 現有 `Japan/frontend` 的首頁流程捷徑已補上管理清單、交通審核摘要與公開紀錄清單的同步載入
- 現有 `Japan/frontend` 的首頁流程捷徑已補上旅程看板、旅程摘要與待辦摘要的同步載入
- 現有 `Japan/frontend` 的首頁流程捷徑已補上總覽、商店與管理快照的同步載入
- 現有 `Japan/frontend` 的首頁流程捷徑已補上管理旅程摘要與可見性總覽的同步載入
- 現有 `Japan/frontend` 的首頁流程捷徑已補上完整導覽入口，能直接進入全流程巡覽
- 現有 `Japan/frontend` 的完整導覽已改成順序流程，並納入管理的 checklist / traffic review / traffic list
- 現有 `Japan/frontend` 已新增完整導覽摘要面板，可直接顯示巡覽步驟結果
- 現有 `Japan/frontend` 的完整導覽摘要已補上逐步狀態清單
- 現有 `Japan/frontend` 的完整導覽摘要已補成中文步驟名稱，較接近正式報表
- 現有 `Japan/frontend` 的完整導覽摘要已補上每一步的區塊說明
- 現有 `Japan/frontend` 的完整導覽摘要已改成步驟 / 狀態 / 說明三欄
- 現有 `Japan/frontend` 的完整導覽摘要已補上三欄樣式與狀態色彩
- 現有 `Japan/frontend` 的完整導覽摘要已補上可展開的步驟細節
- 現有 `Japan/frontend` 的完整導覽摘要已補上實際載入值摘要
- 現有 `Japan/frontend` 的完整導覽摘要已補上全部展開 / 收合控制
- 現有 `Japan/frontend` 的完整導覽摘要已補上複製摘要功能
- 現有 `Japan/frontend` 的完整導覽摘要已補上 Markdown / JSON 雙格式複製
- 現有 `Japan/frontend` 的完整導覽摘要已補上 Markdown / JSON 下載
- 現有 `Japan/frontend` 的完整導覽摘要已補上 Markdown / JSON 預覽
- 現有 `Japan/frontend` 的完整導覽摘要已在完整導覽完成時自動刷新預覽
- 現有 `Japan/frontend` 的完整導覽摘要已補成 Markdown / JSON 預覽分頁
- 現有 `Japan/frontend` 的完整導覽摘要已在刷新時保留目前預覽分頁
- 現有 `Japan/frontend` 的完整導覽摘要已記住上次預覽格式
- 現有 `Japan/frontend` 的完整導覽摘要已顯示預覽模式與更新時間
- 現有 `Japan/frontend` 的完整導覽摘要已在更新時捲到最新內容
- 現有 `Japan/frontend` 的完整導覽摘要已在更新後自動展開第一筆細節
- 現有 `Japan/frontend` 的完整導覽摘要已補上步驟搜尋與清除搜尋
- 現有 `Japan/frontend` 的完整導覽摘要已補上搜尋命中高亮
- 現有 `Japan/frontend` 的完整導覽摘要已在刷新時同步搜尋高亮與過濾狀態
- 現有 `Japan/frontend` 的完整導覽摘要已補上搜尋命中筆數提示，方便快速判斷步驟過濾結果
- 現有 `Japan/frontend` 已補上旅程編輯表單，可直接送出 `PATCH /journeys/:journeyId`
- 現有 `Japan/frontend` 已補上旅程建立與取消入口，可直接送出 `POST /journeys` 與 `POST /journeys/:journeyId/cancel`
- 現有 `Japan/frontend` 已補上拍賣回合建立入口，可直接送出 `POST /games/:gameId/auction-shop/rounds`
- 現有 `Japan/frontend` 已補上商店刷新入口，可直接送出 `POST /games/:gameId/general-shop/refresh`
- 現有 `Japan/frontend` 已補上商店初始化入口，可直接送出 `POST /games/:gameId/general-shop/initialize`
- 現有 `Japan/frontend` 已補上交通中斷批次審核按鈕與管理巡檢重新整理入口
- 現有 `Japan/frontend` 已補上商店優先權來源與窗口的可視化摘要
- 現有 `Japan/frontend` 已補上管理壓力來源拆分摘要，可直接看交通 / 待辦 / 旅程待辦
- 現有 `Japan/frontend` 已把管理壓力拆分做成共用 helper，讓巡檢 / 待辦 / 總覽入口同步更新
- 旅程、商店、拍賣與管理操作頁面已接成更完整的產品流程，編輯、操作與狀態流轉頁面也已持續補齊
- 前端 legacy `operatorPlayerId` 依賴已移除，正式操作現在以 bearer token / `authContext` 為準

## 5. 建議下一步

1. 持續補強 production 驗證策略與權限拒絕案例
2. 持續擴充 PocketBase 真實整合測試，優先覆蓋一般商店優先購買權與競標 `A / S` 票生成
3. 補更完整的查詢排序、分頁、篩選能力
4. 規劃前端串接順序，先接 `overview / checklist / general-shop / auction-shop`
