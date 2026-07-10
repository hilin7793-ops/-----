# 遊戲系統函數介面文件

本文件將 `rules.md` 與 `model.md` 整理成偏實作導向的函數介面規格。

本文件重點描述：

* 建議函數命名
* 建議輸入物件格式
* 建議輸出物件格式
* 共用型別與狀態值
* 主要錯誤條件

本文件不限制：

* 實際程式碼架構
* 是否拆成 service / repository / controller
* 是否使用 class、module 或 pure function

---

# 1. 文件約定

## 1.1 函數風格

建議以 JavaScript / TypeScript 非同步函數撰寫：

```js
async function functionName(input) {
  return output
}
```

所有函數預設：

* 使用物件作為輸入參數
* 使用物件作為輸出結果
* 驗證失敗時丟出可辨識錯誤碼或回傳 `success: false`

---

## 1.2 共用錯誤碼建議

```js
const ErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_STATE: "INVALID_STATE",
  MONEY_NOT_ENOUGH: "MONEY_NOT_ENOUGH",
  TICKET_NOT_OWNED: "TICKET_NOT_OWNED",
  TICKET_RESERVED: "TICKET_RESERVED",
  TICKET_COMBINATION_INVALID: "TICKET_COMBINATION_INVALID",
  JOURNEY_ALREADY_STARTED: "JOURNEY_ALREADY_STARTED",
  JOURNEY_NOT_EDITABLE: "JOURNEY_NOT_EDITABLE",
  SHOP_CLOSED: "SHOP_CLOSED",
  SHOP_REFRESH_COOLDOWN: "SHOP_REFRESH_COOLDOWN",
  AUCTION_ALREADY_BID: "AUCTION_ALREADY_BID",
  BLIND_BOX_ALREADY_OPENED: "BLIND_BOX_ALREADY_OPENED",
  BLIND_BOX_NOT_AVAILABLE: "BLIND_BOX_NOT_AVAILABLE",
  BLIND_BOX_EFFECT_INVALID: "BLIND_BOX_EFFECT_INVALID",
  PLAYER_LOCATION_MISMATCH: "PLAYER_LOCATION_MISMATCH",
  SPECIAL_STATE_NOT_FOUND: "SPECIAL_STATE_NOT_FOUND",
  GAME_ALREADY_STARTED: "GAME_ALREADY_STARTED",
  GAME_ALREADY_ENDED: "GAME_ALREADY_ENDED",
}
```

---

## 1.3 共用狀態值

```js
const GameStatus = ["waiting", "started", "ended"]
const PlayerGameStatus = ["waiting", "active", "arrived", "offline"]
const TicketStatus = [
  "generated",
  "shop_available",
  "auction_available",
  "owned",
  "reserved",
  "consumed",
  "destroyed",
]
const JourneyStatus = [
  "reserved",
  "started",
  "completed",
  "cancelled",
  "incident_pending",
  "incident_resolved",
]
const AuctionStatus = ["scheduled", "active", "ended", "resolved", "destroyed"]
const ShopStatus = ["open", "closed"]
const BlindBoxStatus = ["hidden_effect", "available", "opened", "removed"]
const BlindBoxEffectType = [
  "money",
  "gain_random_ticket",
  "lose_random_ticket",
  "gain_shop_ticket",
  "gain_next_auction_bid_pool",
  "gain_free_shop_refresh",
  "conditional",
]
const BlindBoxSpecialStateType = [
  "next_auction_bid_pool_reward",
  "free_shop_refresh_count",
]
const TicketRatingType = ["normal_shop", "auction"]
const TicketRatingGrade = ["S", "A", "B", "C", "D", "E", "SHIT"]
```

---

# 2. 共用型別建議

```js
/**
 * @typedef {Object} TicketGenerationRules
 * @property {Object.<string, number>} transportWeightRules
 * @property {Object.<string, number>} transportDurationMultiplierRules
 * @property {Object.<string, number>} transportPriceMultiplierRules
 * @property {RandomRule} baseUsableMinutesRandomRule
 * @property {RandomRule} basePriceRandomRule
 */

/**
 * @typedef {Object} RandomRule
 * @property {number} average
 * @property {number} standardDeviation
 * @property {number} step
 * @property {number} minValue
 * @property {number} maxValue
 */

/**
 * @typedef {Object} TicketData
 * @property {string} id
 * @property {string} transportType
 * @property {number} baseDuration
 * @property {number} basePrice
 * @property {number} usableMinutes
 * @property {number} price
 * @property {number} ratingScore
 * @property {string} ratingGrade
 * @property {string} ratingType
 * @property {string} status
 * @property {string} ticketSource
 * @property {Object} metadata
 */

/**
 * @typedef {Object} JourneyData
 * @property {string} id
 * @property {string} gameId
 * @property {string} playerId
 * @property {string} fromLocationId
 * @property {string} toLocationId
 * @property {string} transportType
 * @property {string[]} ticketIdList
 * @property {string} departureTime
 * @property {string} arrivalTime
 * @property {string} status
 */

/**
 * @typedef {Object} BlindBoxData
 * @property {string} id
 * @property {string} gameId
 * @property {string} locationId
 * @property {Object} effectData
 * @property {string} status
 * @property {boolean} openedStatus
 * @property {string | null} openedBy
 * @property {string | null} openedAt
 */

/**
 * @typedef {Object} PlayerSpecialStateData
 * @property {string} id
 * @property {string} gameId
 * @property {string} playerId
 * @property {string} stateType
 * @property {Object} stateData
 * @property {string} sourceBlindBoxId
 * @property {boolean} isConsumed
 */
```

---

# 3. 地圖系統

```js
async function createMap({ mapName, description, countryOrRegion, customRules, availableTransportTypes })
async function updateMap({ mapId, mapName, description, countryOrRegion, customRules, availableTransportTypes })
async function deleteMap({ mapId })
async function getMap({ mapId })
async function listMaps({ filterOptions })
async function addLocation({ mapId, locationName, locationType, metadata })
async function updateLocation({ locationId, locationName, locationType, metadata })
async function removeLocation({ mapId, locationId })
async function listLocations({ mapId })
async function setStartLocation({ mapId, locationId })
async function setGoalLocation({ mapId, locationId })
async function getStartLocation({ mapId })
async function getGoalLocation({ mapId })
async function setAvailableTransportTypes({ mapId, transportTypeList })
async function getAvailableTransportTypes({ mapId })
async function setSpecialRules({ mapId, specialRules })
async function getSpecialRules({ mapId })
```

---

# 4. 玩家系統

```js
async function createPlayer({ userId, displayName })
async function getPlayer({ playerId })
async function updatePlayerProfile({ playerId, displayName, avatar, metadata })
async function initializePlayerForGame({ gameId, playerId, startLocationId, initialMoney })
async function getPlayerMoney({ gameId, playerId })
async function addPlayerMoney({ gameId, playerId, amount, reason })
async function deductPlayerMoney({ gameId, playerId, amount, reason })
async function canAfford({ gameId, playerId, amount })
async function getPlayerLocation({ gameId, playerId })
async function setPlayerLocation({ gameId, playerId, locationId, reason })
async function getPlayerTickets({ gameId, playerId, filterOptions })
async function addTicketToPlayer({ gameId, playerId, ticketId, source })
async function removeTicketFromPlayer({ gameId, playerId, ticketId, reason })
async function getPlayerCurrentJourney({ gameId, playerId })
async function getPlayerReservedJourney({ gameId, playerId })
async function setPlayerJourneyState({ gameId, playerId, journeyId, journeyState })
async function hasReachedGoal({ gameId, playerId, goalLocationId })
```

主要檢查：

* 金錢不得小於 `0`
* 同時只能有一個未開始預約旅程
* 玩家位置只在目前地點與已完成旅程目的地之間切換

---

# 5. 車票系統

```js
async function createTicket({ transportType, usableMinutes, price, ticketSource, metadata })
async function generateRandomTicket({ mapId, availableTransportTypes, generationRules })
async function generateTicketBatch({ mapId, count, generationRules })
async function selectRandomTransportTypeByWeight({ availableTransportTypes, transportWeightRules })
async function generateRandomValueByRule({ randomRuleName, average, standardDeviation, step, minValue, maxValue })
async function calculateTicketUsableMinutes({ baseUsableMinutes, transportType, transportDurationMultiplierRules })
async function calculateTicketPrice({ basePrice, transportType, transportPriceMultiplierRules })
async function calculateTicketRating({ ticketData, ratingType })
async function calculateNormalShopTicketRating({ baseUsableMinutes, basePrice })
async function calculateAuctionTicketRating({ baseUsableMinutes })
async function getTicketGenerationRules({ mapId, ruleSetName })
async function getTicket({ ticketId })
async function updateTicketStatus({ ticketId, status, reason })
async function validateTicketOwnership({ gameId, playerId, ticketIdList })
async function validateTicketNotReserved({ gameId, ticketIdList })
async function validateTicketCombination({ ticketIdList, selectedTransportType })
async function calculateTicketTotalUsableTime({ ticketIdList, selectedTransportType })
async function validateTicketTimeEnoughForJourney({ ticketIdList, departureTime, arrivalTime, selectedTransportType })
async function reserveTickets({ gameId, playerId, journeyId, ticketIdList })
async function releaseReservedTickets({ gameId, journeyId, ticketIdList })
async function consumeTickets({ gameId, playerId, journeyId, ticketIdList })
async function createReturnedTicket({ gameId, playerId, transportType, returnedMinutes, sourceJourneyId, reason })
async function destroyTicket({ ticketId, reason })
```

車票生成規則需對應 `rules.md 14.1.4`：

* 先依權重決定 `transportType`
* 生成 `baseUsableMinutes`
* 生成 `basePrice`
* `usableMinutes = baseUsableMinutes * durationMultiplier`
* `price = basePrice * priceMultiplier`

車票評級規則需對應：

* 一般商店：`durationZ = (baseUsableMinutes - 55) / 20`
* 一般商店：`priceZ = (basePrice - 2500) / 800`
* 一般商店：`normalizedPriceZ = priceZ * 0.72`
* 一般商店：`ratingScore = clamp((durationZ - normalizedPriceZ) * (5 / 4.5), -5, 5)`
* 競標商店：`durationZ = (baseUsableMinutes - 55) / 20`
* 競標商店：`ratingScore = clamp(durationZ * (5 / 2.25), -5, 5)`

車票組合檢查需支援：

* 相同一般交通工具可組合
* 不同一般交通工具不可同段組合
* 通用車票不可單獨使用
* 步行不得與任何車票混用
* 計程車視為一般交通工具

---

# 6. 商店系統

## 6.1 一般商店

```js
async function initializeGeneralShop({ gameId, mapId })
async function refreshGeneralShop({ gameId, playerId, refreshType })
async function canRefreshGeneralShop({ gameId, playerId, currentTime, refreshType })
async function getGeneralShopItems({ gameId })
async function purchaseGeneralShopTicket({ gameId, playerId, shopItemId })
async function removeGeneralShopItem({ gameId, shopItemId, reason })
async function getGeneralShopPriorityState({ gameId })
async function setGeneralShopPriorityState({ gameId, priorityBuyerPlayerId, priorityStartedAt, priorityEndsAt, prioritySource })
async function clearGeneralShopPriorityState({ gameId, reason })
async function isGeneralShopOpen({ currentTime })
```

主要檢查：

* 一次上架 `5` 張車票
* 手動刷新價格為 `500 * 玩家數`
* 每次手動刷新至少間隔 `10` 分鐘
* 每日 `06:00` 免費刷新一次
* `00:00` 到 `06:00` 關店
* 刷新不影響競標商店
* `06:00` 免費刷新不得建立優先購買權
* 玩家主動使用免費刷新效果時，需建立 `5` 分鐘優先購買權
* 被一般商店下架的車票不得進入競標商店

## 6.2 競標商店

```js
async function initializeAuctionShop({ gameId, mapId })
async function createAuctionRound({ gameId, startTime, endTime, ticketData })
async function getCurrentAuction({ gameId, currentTime })
async function getAuctionSchedule({ gameId, date })
async function canCreateAuctionRound({ gameId, currentTime })
async function placeBid({ gameId, auctionId, playerId, bidAmount })
async function hasPlayerBid({ auctionId, playerId })
async function getAuctionBids({ auctionId })
async function resolveAuction({ gameId, auctionId })
async function awardAuctionTicket({ gameId, auctionId, winnerPlayerId, ticketId })
async function destroyAuctionTicket({ auctionId, ticketId, reason })
async function isAuctionShopOpenForNewAuction({ currentTime })
```

主要檢查：

* 每 `30` 分鐘開一輪
* 每輪 `10` 分鐘
* 每人每輪只能出價一次
* 出價立即扣款且不退
* 同價最高全部失效後往下比
* 競標商品需以 `auction` 評級檢查，且只允許 `A` 或 `S`

---

# 7. 盲盒系統

```js
async function createBlindBox({ gameId, locationId, effectData, createdBy })
async function createBlindBoxBatch({ gameId, blindBoxConfigList, createdBy })
async function updateBlindBox({ gameId, blindBoxId, locationId, effectData, updatedBy })
async function deleteBlindBox({ gameId, blindBoxId, deletedBy })
async function getBlindBox({ gameId, blindBoxId, requesterId, visibilityMode })
async function listBlindBoxes({ gameId, requesterId, visibilityMode })
async function getPublicBlindBoxInfo({ gameId, playerId })
async function validateBlindBoxSetup({ gameId, blindBoxConfigList })
async function canOpenBlindBox({ gameId, playerId, blindBoxId, currentTime })
async function openBlindBox({ gameId, playerId, blindBoxId, currentTime })
async function markBlindBoxAsOpened({ gameId, blindBoxId, playerId, openedAt })
async function removeOpenedBlindBox({ gameId, blindBoxId })
async function executeBlindBoxEffect({ gameId, playerId, blindBoxId, effectData })
async function validateBlindBoxEffect({ effectData })
async function executeMoneyEffect({ gameId, playerId, operator, value })
async function executeRandomTicketGainEffect({ gameId, playerId, generationTableType })
async function executeRandomTicketLossEffect({ gameId, playerId })
async function executeFreeShopTicketEffect({ gameId, playerId, shopItemSelectionMode })
async function executeGainNextAuctionBidPoolEffect({ gameId, playerId, blindBoxId })
async function applyNextAuctionBidPoolReward({ gameId, auctionId, playerId })
async function executeFreeShopRefreshEffect({ gameId, playerId, freeRefreshCount })
async function useFreeShopRefresh({ gameId, playerId, currentTime })
async function evaluateBlindBoxCondition({ gameId, playerId, conditionData })
async function executeConditionalBlindBoxEffect({ gameId, playerId, conditionData, thenEffectData, elseEffectData })
async function getPlayerBlindBoxSpecialStates({ gameId, playerId })
async function addPlayerBlindBoxSpecialState({ gameId, playerId, stateType, stateData, sourceBlindBoxId })
async function consumePlayerBlindBoxSpecialState({ gameId, playerId, stateId, reason })
async function recordBlindBoxAction({ gameId, playerId, blindBoxId, actionType, actionData })
async function getBlindBoxReviewData({ gameId })
async function filterBlindBoxDataByVisibility({ gameId, requesterId, blindBoxData, visibilityMode })
```

主要檢查：

* 盲盒只能在遊戲開始前設定
* 遊戲開始後不得新增、修改、刪除盲盒
* 玩家只有在目前位置等於盲盒位置時才能開啟
* 同一盲盒只能被開啟一次
* 遊戲進行中不得公開未開啟盲盒效果
* 條件式效果只能使用系統可判定的遊戲內資料

---

# 8. 旅程系統

```js
async function createJourney({ gameId, playerId, fromLocationId, toLocationId, transportType, ticketIdList, departureTime, arrivalTime, metadata })
async function validateCreateJourney({ gameId, playerId, fromLocationId, toLocationId, transportType, ticketIdList, departureTime, arrivalTime })
async function updateJourney({ gameId, playerId, journeyId, fromLocationId, toLocationId, transportType, ticketIdList, departureTime, arrivalTime, metadata })
async function validateUpdateJourney({ gameId, playerId, journeyId, fromLocationId, toLocationId, transportType, ticketIdList, departureTime, arrivalTime })
async function cancelJourney({ gameId, playerId, journeyId, reason })
async function startJourney({ gameId, playerId, journeyId, startedAt })
async function completeJourney({ gameId, playerId, journeyId, completedAt })
async function getJourney({ journeyId })
async function listPlayerJourneys({ gameId, playerId, filterOptions })
async function listGameJourneys({ gameId, filterOptions, queryOptions })
async function getGameJourneyDashboard({ gameId, currentTime })
async function getGameJourneyActionQueue({ gameId, currentTime, queryOptions })
async function getGameJourneyExceptionList({ gameId, currentTime, queryOptions })
async function getGameJourneySummary({ gameId, currentTime })
async function getPublicJourneyInfo({ gameId, requestingPlayerId, targetPlayerId })
async function validateJourneyConnection({ gameId, playerId, fromLocationId, toLocationId, departureTime })
async function validateJourneyTime({ departureTime, arrivalTime, currentTime })
async function validateWalkingJourney({ transportType, ticketIdList, departureTime, arrivalTime })
async function validateTaxiJourney({ transportType, fromLocationId, toLocationId, departureTime, arrivalTime, ticketIdList })
async function lockJourney({ journeyId, reason })
async function unlockJourney({ journeyId, reason })
async function cancelJourneyBatch({ gameId, journeyIdList, reason, cancelledBy })
async function lockJourneyBatch({ gameId, journeyIdList, reason, lockedBy })
async function unlockJourneyBatch({ gameId, journeyIdList, reason, unlockedBy })
async function processJourneyTimeEvents({ gameId, currentTime })
```

主要檢查：

* 第一段出發地需為起點
* 最後一段目的地需為終點
* 下一段出發地需等於上一段目的地
* 下一段出發時間至少晚前段抵達 `1` 分鐘
* 出發時間不得早於目前時間
* 旅程開始後不可修改或取消

---

# 9. 交通異常系統

```js
async function submitTrafficIncidentRequest({ gameId, playerId, journeyId, evidenceList, actualEndLocationId, actualEndedAt, description })
async function validateTrafficIncidentRequest({ gameId, playerId, journeyId, requestId })
async function approveTrafficIncidentRequest({ requestId, reviewerId, reviewNote })
async function rejectTrafficIncidentRequest({ requestId, reviewerId, rejectReason })
async function calculateReturnedTicketTime({ journeyId, originalJourneyData, actualEndLocationId, actualEndTime, transportType })
async function applyTrafficIncidentResult({ gameId, playerId, journeyId, requestId, returnedTicketData })
```

主要檢查：

* 必須是已開始旅程
* 一般延誤不處理
* 必須是無法抵達原目的地或中途終止
* 返還同交通工具之對應剩餘時間

---

# 10. 紀錄與可見性系統

```js
async function createRecord({ gameId, playerId, recordType, action, payload, createdAt })
async function recordPlayerAction({ gameId, playerId, actionType, actionData })
async function recordTicketAcquisition({ gameId, playerId, ticketId, source, sourceDetail })
async function recordTicketUsage({ gameId, playerId, journeyId, ticketIdList, usedAt })
async function recordJourney({ gameId, playerId, journeyId, journeyAction, journeyData })
async function recordShopAction({ gameId, playerId, shopType, actionType, actionData })
async function recordTrafficIncidentRequest({ gameId, playerId, requestId, requestAction, requestData })
async function recordBlindBoxAction({ gameId, playerId, blindBoxId, actionType, actionData })
async function getPlayerRecords({ gameId, playerId, visibilityMode, filterOptions })
async function getGameRecords({ gameId, visibilityMode, filterOptions })
async function getPublicRecordsDuringGame({ gameId, requestingPlayerId })
async function getPostGameReviewData({ gameId })
async function canViewPlayerExactLocation({ gameId, requestingPlayerId, targetPlayerId })
async function canViewPlayerFullRoute({ gameId, requestingPlayerId, targetPlayerId })
async function canViewPublicJourney({ gameId, requestingPlayerId, targetPlayerId })
async function filterPlayerDataByVisibility({ gameId, requestingPlayerId, targetPlayerData, visibilityMode })
async function filterRecordDataByVisibility({ gameId, requestingPlayerId, recordData, visibilityMode })
async function filterBlindBoxDataByVisibility({ gameId, requesterId, blindBoxData, visibilityMode })
```

---

# 11. 遊戲流程系統

```js
async function createGame({ hostPlayerId, mapId, startLocationId, goalLocationId, initialMoney, gameSettings })
async function getGame({ gameId })
async function updateGameSettings({ gameId, settings })
async function joinGame({ gameId, playerId })
async function leaveGame({ gameId, playerId })
async function initializeGameStartFlow({ gameId, startTime })
async function startGame({ gameId, startTime })
async function canStartGame({ gameId, currentTime })
async function endGame({ gameId, endedAt })
async function checkGameEndCondition({ gameId })
async function recordPlayerArrival({ gameId, playerId, arrivalTime, remainingMoney })
async function determineWinner({ gameId })
async function getRanking({ gameId })
async function processGameTimeEvents({ gameId, currentTime })
```

主要檢查：

* 遊戲只能整點開始
* 開始前可加入，可離開
* 開始後不得加入，不得退出
* 遊戲開始前需完成盲盒設定驗證
* 所有玩家抵達終點後才正式結束

---

# 12. 時間與資料層

## 12.1 時間系統

```js
async function getCurrentTime()
async function isOnTheHour({ currentTime })
async function isOnAuctionStartTime({ currentTime })
async function isWithinTimeRange({ currentTime, startTime, endTime })
async function calculateDurationMinutes({ startTime, endTime })
async function hasReachedTime({ currentTime, targetTime })
```

## 12.2 Data Access Layer

```js
async function createRecordInCollection({ collectionName, data })
async function getRecordById({ collectionName, recordId })
async function updateRecordById({ collectionName, recordId, data })
async function deleteRecordById({ collectionName, recordId })
async function listRecords({ collectionName, filterOptions, sortOptions, paginationOptions })
async function findOneRecord({ collectionName, filterOptions })
async function runTransactionLikeOperation({ operationName, operationData })
```

---

# 13. 系統事件

```js
async function processAllScheduledEvents({ gameId, currentTime })
async function processShopScheduledEvents({ gameId, currentTime })
async function processJourneyScheduledEvents({ gameId, currentTime })
async function processGameEndEvent({ gameId, currentTime })
```

---

# 14. 建議回傳格式

成功結果建議：

```js
{
  success: true,
  data: {}
}
```

失敗結果建議：

```js
{
  success: false,
  errorCode: "INVALID_STATE",
  message: "Journey already started",
  detail: {}
}
```

---

# 15. 實作優先順序

1. Data Access Layer
2. Time System
3. Game / Player 初始化
4. Ticket System
5. General Shop
6. Auction Shop
7. Blind Box System
8. Journey System
9. Record / Visibility
10. Traffic Incident
11. Scheduled Events

---

# 16. 對應說明

* `rules.md` 定義玩法規則
* `model.md` 定義系統職責與函數需求
* `function.md` 定義工程實作者實際會寫出的函數介面

若三者衝突，應先回頭修正 `rules.md` 與 `model.md`，再同步更新本文件。
