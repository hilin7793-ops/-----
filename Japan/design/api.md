# Japan Game System API

這份文件只描述目前已經在 [createAppServer.js](C:/Users/hilin/Desktop/縱貫搶旗賽/Japan/backend/system/src/api/createAppServer.js) 實作完成的 HTTP API。

後續若 API 增加或調整，直接擴充這份文件。

## Base

- 預設本機開發位址：`http://127.0.0.1:8788`
- Content-Type：`application/json`

## Response Format

成功回應：

```json
{
  "success": true,
  "data": {}
}
```

## Role Matrix

目前 API 可先用三種主要角色理解：

- `public`：不需要登入即可存取
- `player-self`：需要可解析到操作者玩家身分，使用 `authContext`
- `host`：需要可解析到主持人玩家身分，使用 `authContext`

`access` 與 review 類 API 的觀察/審查語意細分為：

- `observer`：可讀取遊戲進行中的公開資料，對應 `canObserveGame`
- `reviewer`：可讀取賽後 review 與審查資料，對應 `canReviewGame`
- `admin`：可執行主持人管理操作，對應 `canManageGame`

目前後端的 request auth 規則：

- 若 request 可建立可信 `authContext.playerId`，優先使用它
- 若設定 `POCKETBASE_AUTH_COLLECTION`，後端會先嘗試用 `Authorization: Bearer ...` 對 PocketBase 做 `auth-refresh`
- `x-auth-user-id` 是開發/測試相容欄位，正式整合以 `Authorization: Bearer ...` 與 `authContext` 為準

目前已實作的角色分類如下。

### `public`

- `GET /auth/session`
- `POST /auth/login`
- `GET /health`
- `GET /maps`
- `GET /maps/:mapId`
- `POST /maps`
- `PATCH /maps/:mapId`
- `DELETE /maps/:mapId`
- `POST /maps/:mapId/locations`
- `GET /maps/:mapId/locations`
- `PATCH /maps/:mapId/locations/:locationId`
- `DELETE /maps/:mapId/locations/:locationId`
- `POST /maps/:mapId/start-location`
- `POST /maps/:mapId/goal-location`
- `POST /players`
- `GET /players/:playerId`
- `GET /games/:gameId`
- `GET /games/:gameId/access`
- `GET /games/:gameId/ranking`
- `GET /games/:gameId/records`
- `GET /games/:gameId/records/public`
- `GET /games/:gameId/review`
- `GET /games/:gameId/players/:playerId/location`
- `GET /games/:gameId/players/:playerId/public-journey`
- `GET /games/:gameId/general-shop/items`
- `GET /games/:gameId/auction-shop/current`
- `GET /games/:gameId/auction-shop/:auctionId/bids`
- `GET /games/:gameId/blind-boxes`
- `GET /games/:gameId/blind-boxes/public`
- `GET /games/:gameId/blind-boxes/:blindBoxId`
- `GET /journeys/:journeyId`

### `player-self`

- `PATCH /players/:playerId`
- `POST /games`
- `POST /games/:gameId/join`
- `POST /games/:gameId/leave`
- `GET /games/:gameId/players/:playerId/money`
- `GET /games/:gameId/players/:playerId/records`
- `GET /games/:gameId/players/:playerId/tickets`
- `GET /games/:gameId/players/:playerId/special-states`
- `GET /games/:gameId/players/:playerId/journeys`
- `GET /games/:gameId/players/:playerId/journeys/current`
- `GET /games/:gameId/players/:playerId/journeys/reserved`
- `POST /games/:gameId/general-shop/refresh`
- `POST /games/:gameId/general-shop/purchase`
- `POST /games/:gameId/auction-shop/:auctionId/bids`
- `POST /games/:gameId/traffic-incidents`
- `POST /games/:gameId/blind-boxes/:blindBoxId/open`
- `POST /journeys`
- `POST /journeys/:journeyId/start`
- `POST /journeys/:journeyId/complete`
- `POST /journeys/:journeyId/cancel`
- `PATCH /journeys/:journeyId`

### `host`

- `PATCH /games/:gameId/settings`
- `POST /games/:gameId/start`
- `POST /games/:gameId/end`
- `POST /games/:gameId/scheduled-events/process`
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
- `POST /games/:gameId/traffic-incidents/review-batch`
- `GET /games/:gameId/traffic-incidents`
- `GET /traffic-incidents/:requestId`
- `POST /traffic-incidents/:requestId/approve`
- `POST /traffic-incidents/:requestId/reject`
- `POST /games/:gameId/general-shop/initialize`
- `POST /games/:gameId/auction-shop/initialize`
- `POST /games/:gameId/auction-shop/rounds`
- `POST /games/:gameId/auction-shop/:auctionId/resolve`
- `POST /blind-boxes`
- `POST /games/:gameId/blind-boxes/batch`
- `DELETE /games/:gameId/blind-boxes/batch`
- `PATCH /games/:gameId/blind-boxes/batch`
- `POST /games/:gameId/blind-boxes/validate`
- `PATCH /blind-boxes/:blindBoxId`
- `DELETE /blind-boxes/:blindBoxId`
- `GET /games/:gameId/blind-boxes/review`

補充：

- `GET /games/:gameId/blind-boxes` 與 `GET /games/:gameId/blind-boxes/:blindBoxId` 在 `visibilityMode=admin` 時，需使用 `host`

補充：

- `public` 不代表未來正式產品一定完全開放，只代表目前後端尚未套用強制角色檢查
- `GET /games/:gameId/players/:playerId/location` 與 `public-journey` 目前會優先使用 `authContext.playerId` 判定可見性；未來正式流程應維持這個模式

失敗回應：

```json
{
  "success": false,
  "errorCode": "INVALID_STATE",
  "message": "error message",
  "detail": {}
}
```

## Health

## Auth

### `GET /auth/session`

用途：取得目前 request 解析出的 auth session 結果，供前端或管理端確認目前登入映射狀態。

回應包含：

- `playerId`
- `authUserId`
- `authCollection`
- `authVerified`
- `authError`
- `roleSet`
- `source`
- `usedOperatorFallback`
- `fallbackOperatorPlayerId`

### `POST /auth/login`

用途：以 PocketBase `users` auth collection 完成正式登入，供前端取得 bearer token。

Request body:

```json
{
  "email": "player@example.com",
  "password": "secret"
}
```

回應會回傳可供後續 API 使用的登入結果與 auth 資訊。

### `GET /health`

用途：檢查 API 存活。

## Maps

### `GET /maps`

用途：列出地圖。

Query:

- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `POST /maps`

用途：建立地圖。

Request body:

```json
{
  "mapName": "Japan Map",
  "description": "map description",
  "countryOrRegion": "Japan",
  "availableTransportTypes": ["local_train", "universal"],
  "customRules": {}
}
```

### `GET /maps/:mapId`

用途：取得單一地圖資料。

### `PATCH /maps/:mapId`

用途：更新地圖資料。

Request body:

```json
{
  "mapName": "Japan Map Updated",
  "description": "updated description",
  "countryOrRegion": "Japan",
  "availableTransportTypes": ["local_train", "universal"],
  "customRules": {}
}
```

### `DELETE /maps/:mapId`

用途：刪除地圖。

### `POST /maps/:mapId/locations`

用途：新增地點。

Request body:

```json
{
  "locationName": "Tokyo",
  "locationType": "city",
  "metadata": {}
}
```

### `GET /maps/:mapId/locations`

用途：列出地圖下的地點。

### `PATCH /maps/:mapId/locations/:locationId`

用途：更新地點資料。

Request body:

```json
{
  "locationName": "Tokyo Updated",
  "locationType": "city",
  "metadata": {}
}
```

### `DELETE /maps/:mapId/locations/:locationId`

用途：刪除指定地點。

### `POST /maps/:mapId/start-location`

用途：設定起點。

Request body:

```json
{
  "locationId": "LOCATION_ID"
}
```

### `POST /maps/:mapId/goal-location`

用途：設定終點。

Request body:

```json
{
  "locationId": "LOCATION_ID"
}
```

## Players

### `POST /players`

用途：建立玩家。

Request body:

```json
{
  "userId": "user-001",
  "displayName": "Player 1"
}
```

### `GET /players/:playerId`

用途：取得玩家資料。

### `PATCH /players/:playerId`

用途：更新玩家個人資料。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "displayName": "Updated Player",
  "avatar": "avatar.png",
  "metadata": {
    "bio": "hello"
  }
}
```

補充：

- 權限為 `player-self`
- 至少要提供一個可更新欄位：`displayName`、`avatar`、`metadata`

## Games

主持人／管理端操作以 `authContext.playerId` 驗證為正式路徑。

### `POST /games`

用途：建立遊戲。

Request body:

```json
{
  "name": "Game 1",
  "hostPlayerId": "PLAYER_ID",
  "mapId": "MAP_ID",
  "startLocationId": "LOCATION_ID",
  "goalLocationId": "LOCATION_ID",
  "initialMoney": 5000,
  "gameSettings": {}
}
```

補充：

- 權限為 `player-self`

### `GET /games/:gameId`

用途：取得遊戲資料。

### `GET /games/:gameId/access`

用途：取得目前 request 對指定遊戲的 access profile，供前端判定 host/self/加入狀態與可用操作。

Query:

- `operatorPlayerId`，可選
- `targetPlayerId`，可選，用於判定是否可視為 self access

回應包含：

- `playerId`
- `targetPlayerId`
- `isAuthenticated`
- `isHost`
- `isJoinedGame`
- `isTargetPlayer`
- `canViewHostDashboard`
- `canObserveGame`
- `canReviewGame`
- `canManageGame`
- `canAccessTargetPlayerSelfData`
- `authSource`
- `roleSet`
- `usedOperatorFallback`

補充：

- `canObserveGame` 對應可看進行中公開資訊的觀察權限
- `canReviewGame` 對應可看賽後 review 與管理審查摘要的權限
- `canManageGame` 對應主持人管理操作權限

### `POST /games/:gameId/join`

用途：玩家加入遊戲。

Request body:

```json
{
  "playerId": "PLAYER_ID"
}
```

補充：

- 權限為 `player-self`

### `POST /games/:gameId/leave`

用途：玩家離開尚未開始的遊戲。

Request body:

```json
{
  "playerId": "PLAYER_ID"
}
```

補充：

- 權限為 `player-self`

### `PATCH /games/:gameId/settings`

用途：更新遊戲設定。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "settings": {
    "someFlag": true
  }
}
```

### `POST /games/:gameId/start`

用途：開始遊戲。

Request body:

```json
{
  "startTime": "2026-07-09T06:00:00+08:00",
  "operatorPlayerId": "PLAYER_ID"
}
```

### `POST /games/:gameId/end`

用途：手動結束遊戲。

Request body:

```json
{
  "endedAt": "2026-07-09T09:00:00+08:00",
  "operatorPlayerId": "PLAYER_ID"
}
```

### `POST /games/:gameId/scheduled-events/process`

用途：手動觸發排程事件處理。

Request body:

```json
{
  "currentTime": "2026-07-09T07:00:00+08:00",
  "operatorPlayerId": "PLAYER_ID"
}
```

回應包含：

- `shopResult`
- `journeyResult`
- `gameResult`

### `GET /games/:gameId/ranking`

用途：取得排名。

### `GET /games/:gameId/records`

用途：取得遊戲紀錄。

Query:

- `visibilityMode`，預設 `post_game_review`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `GET /games/:gameId/records/public`

用途：取得遊戲中的公開紀錄。

Query:

- `requestingPlayerId`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

補充：

- 後端會優先使用 `authContext.playerId` 判定可見性，沒有 auth context 時才使用 `requestingPlayerId`

### `GET /games/:gameId/review`

用途：取得賽後整合 review 資料，供賽後頁面一次載入。

回應包含：

- `reviewData.game`
- `reviewData.ranking`
- `reviewData.winnerResult`
- `reviewData.recordList`
- `reviewData.blindBoxReviewData`
- `reviewData.summary`

`reviewData.summary` 目前包含：

- `playerResultList`
- `ticketAcquisitionSourceCounts`
- `trafficIncidentSummary`
- `recordTypeCounts`
- `blindBoxSummary`
- `winnerPlayerId`
- `tiedPlayerIds`

### `GET /games/:gameId/overview`

用途：取得管理端／主持人用的遊戲總覽資料。

Query:

- `currentTime`，可選，用於判定目前拍賣回合

回應包含：

- `overview.game`
- `overview.ranking`
- `overview.playerList`
- `overview.generalShopItemList`
- `overview.currentAuction`
- `overview.blindBoxList`
- `overview.trafficIncidentRequestList`
- `overview.journeyDashboard`
- `overview.summary`

補充：

- `overview.generalShopItemList` 會包含車票評級與優先購買權資訊
- `overview.currentAuction` 會包含競標票資訊與 `ticketRating`

### `GET /games/:gameId/management-snapshot`

用途：一次取得主持人巡檢所需的主要摘要。

回應包含：

- `snapshot.overview`
- `snapshot.checklist`
- `snapshot.trafficIncidentReviewSummary`
- `snapshot.journeyManagement`
- `snapshot.journeyActionQueueSummary`

### `GET /games/:gameId/checklist`

用途：取得主持人目前需要處理的待辦檢查資料。

Query:

- `currentTime`，可選，用於判定目前是否已達旅程／拍賣處理時點
- `operatorPlayerId`

回應包含：

- `checklist.pendingTrafficIncidentRequestList`
- `checklist.dueReservedJourneyList`
- `checklist.dueStartedJourneyList`
- `checklist.resolvableAuctionList`
- `checklist.dailyShopRefresh`
- `checklist.auctionRoundCreation`
- `checklist.summary`

### `GET /games/:gameId/traffic-incidents/review-summary`

用途：快速取得交通中斷批次審核摘要。

### `GET /games/:gameId/journeys/action-queue/summary`

用途：快速取得旅程待辦摘要。

### `POST /games/:gameId/checklist/process`

用途：主持人一鍵處理目前 checklist 中到點的旅程、拍賣與商店排程事件。

Request body:

```json
{
  "currentTime": "2026-07-09T07:00:00+08:00",
  "operatorPlayerId": "PLAYER_ID"
}
```

回應包含：

- `checklistBefore`
- `processResult`
- `checklistAfter`

### `POST /games/:gameId/journeys/cancel-batch`

用途：主持人批次取消尚未開始的預約旅程。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "cancelledBy": "PLAYER_ID",
  "journeyIdList": ["JOURNEY_ID_1", "JOURNEY_ID_2"],
  "reason": "host_batch_cleanup"
}
```

回應包含：

- `cancelledCount`
- `resultList`

### `GET /games/:gameId/journeys/summary`

用途：主持人查看整局旅程摘要，快速掌握旅程狀態分布與待處理數量。

Query:

- `operatorPlayerId`
- `currentTime`，可選，用於判定哪些旅程已到啟動或完成處理時點

回應包含：

- `totalJourneyCount`
- `statusCounts`
- `transportTypeCounts`
- `lockedCount`
- `unlockedCount`
- `dueToStartCount`
- `dueToCompleteCount`

### `GET /games/:gameId/journeys/exceptions`

用途：主持人查看整局需要人工注意的旅程列表，例如已到時間未處理、交通異常待處理、或被鎖定的預約旅程。

Query:

- `operatorPlayerId`
- `currentTime`，可選，用於判定哪些旅程已到啟動或完成處理時點
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

回應包含：

- `exceptionJourneyList`
- 每筆資料會帶 `exceptionReasonList`

### `GET /games/:gameId/journeys/action-queue`

用途：主持人查看旅程待辦 action queue，直接取得每筆例外旅程可建議執行的下一步操作。

Query:

- `operatorPlayerId`
- `currentTime`，可選，用於判定哪些旅程已到啟動或完成處理時點
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

回應包含：

- `actionQueue`
- 每筆資料會帶 `exceptionReasonList`
- 每筆資料會帶 `suggestedActionList`

### `GET /games/:gameId/journeys/dashboard`

用途：主持人取得旅程管理面板聚合資料，一次拿到摘要、例外旅程、待辦 action queue 與旅程 checklist summary。

Query:

- `operatorPlayerId`
- `currentTime`，可選，用於判定哪些旅程已到啟動或完成處理時點

回應包含：

- `dashboard.summary`
- `dashboard.exceptionJourneyList`
- `dashboard.actionQueue`
- `dashboard.checklistSummary`

### `GET /games/:gameId/journeys`

用途：主持人查詢整局旅程列表。

Query:

- `operatorPlayerId`
- `playerId`，可選
- `status`，可選
- `transportType`，可選
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `POST /games/:gameId/journeys/lock-batch`

用途：主持人批次鎖定旅程，避免後續被玩家修改。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "lockedBy": "PLAYER_ID",
  "journeyIdList": ["JOURNEY_ID_1", "JOURNEY_ID_2"],
  "reason": "host_review_lock"
}
```

回應包含：

- `lockedCount`
- `resultList`

### `POST /games/:gameId/journeys/unlock-batch`

用途：主持人批次解除旅程鎖定，恢復玩家可修改狀態。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "unlockedBy": "PLAYER_ID",
  "journeyIdList": ["JOURNEY_ID_1", "JOURNEY_ID_2"],
  "reason": "host_review_unlock"
}
```

回應包含：

- `unlockedCount`
- `resultList`

## Game Player

玩家自己的資料查詢以 `authContext.playerId` 驗證為正式路徑。

### `GET /games/:gameId/players/:playerId/money`

用途：取得玩家金錢。

Query:

- `operatorPlayerId`，可選

### `GET /games/:gameId/players/:playerId/records`

用途：取得玩家紀錄。

Query:

- `visibilityMode`，預設 `during_game`
- `operatorPlayerId`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `GET /games/:gameId/players/:playerId/location`

用途：取得玩家位置。

Query:

- `requestingPlayerId`，可選，僅在沒有 `authContext.playerId` 時作為可見性判定 fallback

補充：

- 非本人且未進入賽後檢視時，回應中的 `locationId` 會是 `null`

### `GET /games/:gameId/players/:playerId/public-journey`

用途：取得玩家公開旅程資訊。

Query:

- `requestingPlayerId`

補充：

- 後端會優先使用 `authContext.playerId` 判定可見性，沒有 auth context 時才使用 `requestingPlayerId`

### `GET /games/:gameId/players/:playerId/tickets`

用途：取得玩家票券列表。

Query:

- `operatorPlayerId`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `GET /games/:gameId/players/:playerId/special-states`

用途：取得玩家目前未消耗的盲盒特殊狀態。

Query:

- `operatorPlayerId`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

## General Shop

### `POST /games/:gameId/general-shop/initialize`

用途：初始化一般商店。

Request body:

```json
{
  "mapId": "MAP_ID"
}
```

### `GET /games/:gameId/general-shop/items`

用途：取得一般商店商品。

回應補充：

- `data.priorityState`
- `data.shopTicketList[].ticket.ratingScore`
- `data.shopTicketList[].ticket.ratingGrade`
- `data.shopTicketList[].ticket.ratingType`
- `data.shopTicketList[].priorityAccess`

### `POST /games/:gameId/general-shop/refresh`

用途：刷新一般商店。

Request body:

```json
{
  "playerId": "PLAYER_ID",
  "refreshType": "manual",
  "currentTime": "2026-07-09T06:10:00+08:00",
  "playerCount": 1,
  "mapId": "MAP_ID",
  "availableTransportTypes": ["local_train", "universal"]
}
```

補充：

- `refreshType` 可使用 `manual`、`daily_free`、`free_refresh`
- `free_refresh` 需玩家持有可用的盲盒免費刷新特殊狀態
- `manual` 與玩家主動使用的 `free_refresh` 會建立 `5` 分鐘優先購買權
- `daily_free` 不會建立優先購買權
- `free_refresh` 仍需遵守一般商店刷新間隔限制
- 權限為 `player-self`

### `POST /games/:gameId/general-shop/purchase`

用途：購買一般商店票券。

Request body:

```json
{
  "playerId": "PLAYER_ID",
  "shopItemId": "SHOP_ITEM_ID",
  "currentTime": "2026-07-09T06:11:00+08:00"
}
```

補充：

- 權限為 `player-self`
- 若商品仍在刷新者的 `5` 分鐘優先購買權期間內，非優先玩家購買會失敗

## Auction Shop

### `POST /games/:gameId/auction-shop/initialize`

用途：初始化拍賣商店。

Request body:

```json
{
  "mapId": "MAP_ID"
}
```

### `POST /games/:gameId/auction-shop/rounds`

用途：建立拍賣回合。

Request body:

```json
{
  "mapId": "MAP_ID",
  "startTime": "2026-07-09T06:30:00+08:00",
  "endTime": "2026-07-09T06:40:00+08:00",
  "availableTransportTypes": ["local_train", "universal"]
}
```

補充：

- 競標商品會重新生成直到符合 `A` 或 `S` 評級
- 競標商品評級只看車票基礎時長，不使用價格

### `GET /games/:gameId/auction-shop/current`

用途：取得目前進行中的拍賣。

Query:

- `currentTime`

回應補充：

- `data.currentAuction.ticket`
- `data.currentAuction.ticketRating`

### `POST /games/:gameId/auction-shop/:auctionId/bids`

用途：出價。

Request body:

```json
{
  "playerId": "PLAYER_ID",
  "bidAmount": 500,
  "currentTime": "2026-07-09T06:31:00+08:00"
}
```

補充：

- 權限為 `player-self`

### `GET /games/:gameId/auction-shop/:auctionId/bids`

用途：查詢出價列表。

### `POST /games/:gameId/auction-shop/:auctionId/resolve`

用途：結算拍賣。

Request body:

```json
{
  "currentTime": "2026-07-09T06:40:00+08:00"
}
```

## Journeys

### `POST /journeys`

用途：建立旅程。

Request body:

```json
{
  "gameId": "GAME_ID",
  "playerId": "PLAYER_ID",
  "operatorPlayerId": "PLAYER_ID",
  "fromLocationId": "LOCATION_ID",
  "toLocationId": "LOCATION_ID",
  "transportType": "local_train",
  "ticketIdList": ["TICKET_ID"],
  "departureTime": "2026-07-09T06:50:00+08:00",
  "arrivalTime": "2026-07-09T06:55:00+08:00",
  "currentTime": "2026-07-09T06:20:00+08:00",
  "metadata": {}
}
```

### `POST /journeys/:journeyId/start`

用途：手動啟動旅程。

Request body 可保留 `operatorPlayerId` 作為相容欄位。

### `POST /journeys/:journeyId/complete`

用途：手動完成旅程。

Request body 可保留 `operatorPlayerId` 作為相容欄位。

### `POST /journeys/:journeyId/cancel`

用途：取消旅程。

Request body 可保留 `operatorPlayerId` 作為相容欄位。

### `PATCH /journeys/:journeyId`

用途：更新旅程。

Request body 可保留 `operatorPlayerId` 作為相容欄位。

### `GET /journeys/:journeyId`

用途：取得旅程資料。

### `GET /games/:gameId/players/:playerId/journeys`

用途：列出玩家旅程。

Query:

- `operatorPlayerId`，可選
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `GET /games/:gameId/players/:playerId/journeys/current`

用途：取得玩家目前進行中的旅程。

Query:

- `operatorPlayerId`，可選

### `GET /games/:gameId/players/:playerId/journeys/reserved`

用途：取得玩家保留中的旅程。

Query:

- `operatorPlayerId`，可選

## Traffic Incidents

### `GET /games/:gameId/traffic-incidents`

用途：列出指定遊戲的交通中斷申請。

Query:

- `operatorPlayerId`，可選
- `playerId`
- `journeyId`
- `status`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `POST /games/:gameId/traffic-incidents`

用途：提交交通中斷申請。

補充：

- 權限為 `player-self`

### `POST /games/:gameId/traffic-incidents/review-batch`

用途：批次核准或拒絕交通中斷申請。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "requestIdList": ["REQUEST_ID_1", "REQUEST_ID_2"],
  "decision": "approve",
  "reviewerId": "admin",
  "reviewNote": "batch approved",
  "rejectReason": ""
}
```

### `GET /traffic-incidents/:requestId`

用途：取得單一交通中斷申請。

Query:

- `operatorPlayerId`，可選

### `POST /traffic-incidents/:requestId/approve`

用途：核准交通中斷申請。

Request body 需包含：

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "reviewerId": "admin",
  "reviewNote": "approved"
}
```

### `POST /traffic-incidents/:requestId/reject`

用途：拒絕交通中斷申請。

Request body 需包含：

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "reviewerId": "admin",
  "rejectReason": "not enough evidence"
}
```

## Blind Boxes

### `POST /blind-boxes`

用途：建立盲盒。

Request body:

```json
{
  "gameId": "GAME_ID",
  "locationId": "LOCATION_ID",
  "effectData": {
    "effectType": "gain_free_shop_refresh",
    "freeRefreshCount": 2
  },
  "createdBy": "admin"
}
```

### `POST /games/:gameId/blind-boxes/batch`

用途：批次建立盲盒。

Request body:

```json
{
  "createdBy": "admin",
  "blindBoxConfigList": [
    {
      "locationId": "LOCATION_ID",
      "effectData": {
        "effectType": "money",
        "operator": "+=",
        "value": 1000
      }
    }
  ]
}
```

### `DELETE /games/:gameId/blind-boxes/batch`

用途：批次刪除盲盒。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "deletedBy": "PLAYER_ID",
  "blindBoxIdList": ["BLIND_BOX_ID_1", "BLIND_BOX_ID_2"]
}
```

### `PATCH /games/:gameId/blind-boxes/batch`

用途：批次更新盲盒。

Request body:

```json
{
  "operatorPlayerId": "PLAYER_ID",
  "updatedBy": "PLAYER_ID",
  "blindBoxUpdateList": [
    {
      "blindBoxId": "BLIND_BOX_ID_1",
      "effectData": {
        "effectType": "money",
        "operator": "+=",
        "value": 200
      }
    }
  ]
}
```

### `POST /games/:gameId/blind-boxes/validate`

用途：驗證盲盒批次設定是否合法。

### `PATCH /blind-boxes/:blindBoxId`

用途：更新盲盒。

### `DELETE /blind-boxes/:blindBoxId`

用途：刪除盲盒。

Request body:

```json
{
  "gameId": "GAME_ID",
  "deletedBy": "admin"
}
```

### `GET /games/:gameId/blind-boxes`

用途：列出盲盒。

Query:

- `requesterId`
- `visibilityMode`
- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選
- 若 `visibilityMode=admin`，則需使用 host 身分

補充：

- 後端會優先使用 `authContext.playerId` 作為 `requesterId`，沒有 auth context 時才使用 query 中的 `requesterId`

### `GET /games/:gameId/blind-boxes/public`

用途：取得玩家可見的盲盒公開資訊。

Query:

- `sortBy`，可選
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選

### `GET /games/:gameId/blind-boxes/:blindBoxId`

用途：取得單一盲盒。

Query:

- `requestingPlayerId` 或 `requesterId`
- `visibilityMode`
- 若 `visibilityMode=admin`，則需使用 host 身分

補充：

- 後端會優先使用 `authContext.playerId` 作為可見性判定 requester，沒有 auth context 時才退回 `requestingPlayerId` 或 `requesterId`

### `GET /games/:gameId/blind-boxes/review`

用途：取得賽後盲盒審查資料。

Query:

- `operatorPlayerId`
- `sortBy`，可選，作為三組 review 列表的共同預設排序
- `sortDirection`，可選，`asc` 或 `desc`
- `limit`，可選
- `offset`，可選
- `blindBoxSortBy`、`blindBoxSortDirection`、`blindBoxLimit`、`blindBoxOffset`，可選
- `effectLogSortBy`、`effectLogSortDirection`、`effectLogLimit`、`effectLogOffset`，可選
- `recordSortBy`、`recordSortDirection`、`recordLimit`、`recordOffset`，可選

### `POST /games/:gameId/blind-boxes/:blindBoxId/open`

用途：玩家開啟自己所在位置的盲盒。

補充：

- 權限為 `player-self`

用途：開啟盲盒。

## Blind Box Effects

目前後端內建可執行的盲盒效果：

- `money`
- `gain_random_ticket`
- `lose_random_ticket`
- `gain_shop_ticket`
- `gain_next_auction_bid_pool`
- `gain_free_shop_refresh`
- `conditional`

## Notes

- 部分流程依賴遊戲狀態與時間條件，不符合規則時會回傳 `INVALID_STATE`
- 商店與票券有隨機性，測試時不應假設固定票價或固定票種
- 若後續新增 API，請直接擴充本文件對應章節，不另開新檔
