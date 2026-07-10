# 遊戲系統函數規格文件

本文件根據遊戲規則整理各系統所需函數與使用方式。

本文件只描述：

* 函數名稱
* 函數用途
* 輸入資料
* 輸出資料
* 使用時機
* 主要檢查規則

本文件不包含：

* 實際程式碼
* 資料庫實作
* API 路由實作
* 前端畫面實作

---

# 1. 地圖系統 Map System

地圖系統負責管理遊戲地圖、地點、起點、終點、交通工具設定與特殊規則。

地圖系統不負責驗證真實路線、班次或交通可行性。

---

## 1.1 createMap

### 用途

建立一張新地圖。

### 輸入

* mapName
* description
* countryOrRegion
* customRules
* availableTransportTypes

### 輸出

* mapId
* createdMapData

### 使用時機

管理者建立新遊戲地圖時使用。

---

## 1.2 updateMap

### 用途

修改既有地圖資料。

### 輸入

* mapId
* mapName
* description
* countryOrRegion
* customRules
* availableTransportTypes

### 輸出

* updatedMapData

### 使用時機

管理者調整地圖設定時使用。

---

## 1.3 deleteMap

### 用途

刪除指定地圖。

### 輸入

* mapId

### 輸出

* success
* deletedMapId

### 使用時機

管理者移除不再使用的地圖時使用。

---

## 1.4 getMap

### 用途

取得指定地圖完整資料。

### 輸入

* mapId

### 輸出

* mapData

### 使用時機

建立遊戲、顯示地圖設定、驗證遊戲起終點時使用。

---

## 1.5 listMaps

### 用途

取得可使用地圖列表。

### 輸入

* filterOptions

### 輸出

* mapList

### 使用時機

玩家或管理者選擇地圖時使用。

---

## 1.6 addLocation

### 用途

在地圖中新增地點。

### 輸入

* mapId
* locationName
* locationType
* metadata

### 輸出

* locationId
* locationData

### 使用時機

建立或擴充地圖地點時使用。

---

## 1.7 updateLocation

### 用途

修改地圖中的地點資料。

### 輸入

* locationId
* locationName
* locationType
* metadata

### 輸出

* updatedLocationData

### 使用時機

管理者修改地點名稱或資訊時使用。

---

## 1.8 removeLocation

### 用途

從地圖中移除指定地點。

### 輸入

* mapId
* locationId

### 輸出

* success
* removedLocationId

### 使用時機

管理者刪除地點時使用。

---

## 1.9 listLocations

### 用途

取得指定地圖內所有地點。

### 輸入

* mapId

### 輸出

* locationList

### 使用時機

建立旅程、設定起點終點、顯示地點列表時使用。

---

## 1.10 setStartLocation

### 用途

設定地圖或遊戲使用的起點。

### 輸入

* mapId
* locationId

### 輸出

* startLocation

### 使用時機

建立地圖或建立遊戲時使用。

---

## 1.11 setGoalLocation

### 用途

設定地圖或遊戲使用的終點。

### 輸入

* mapId
* locationId

### 輸出

* goalLocation

### 使用時機

建立地圖或建立遊戲時使用。

---

## 1.12 getStartLocation

### 用途

取得指定地圖或遊戲的起點。

### 輸入

* mapId

### 輸出

* startLocation

### 使用時機

遊戲開始初始化玩家位置時使用。

---

## 1.13 getGoalLocation

### 用途

取得指定地圖或遊戲的終點。

### 輸入

* mapId

### 輸出

* goalLocation

### 使用時機

判定玩家是否抵達終點時使用。

---

## 1.14 setAvailableTransportTypes

### 用途

設定地圖可使用的交通工具種類。

### 輸入

* mapId
* transportTypeList

### 輸出

* updatedTransportSettings

### 使用時機

管理者設定地圖規則時使用。

---

## 1.15 getAvailableTransportTypes

### 用途

取得地圖可使用的交通工具種類。

### 輸入

* mapId

### 輸出

* transportTypeList

### 使用時機

生成車票、建立旅程、顯示交通工具選項時使用。

---

## 1.16 setSpecialRules

### 用途

設定地圖特殊規則。

### 輸入

* mapId
* specialRules

### 輸出

* updatedSpecialRules

### 使用時機

管理者設定自訂地圖規則時使用。

---

## 1.17 getSpecialRules

### 用途

取得指定地圖的特殊規則。

### 輸入

* mapId

### 輸出

* specialRules

### 使用時機

建立遊戲、驗證旅程或特殊事件時使用。

---

# 2. 玩家系統 Player System

玩家系統負責玩家資料、金錢、位置、車票、旅程狀態管理。

---

## 2.1 createPlayer

### 用途

建立玩家資料。

### 輸入

* userId
* displayName

### 輸出

* playerId
* playerData

### 使用時機

玩家首次加入遊戲或建立角色時使用。

---

## 2.2 getPlayer

### 用途

取得指定玩家資料。

### 輸入

* playerId

### 輸出

* playerData

### 使用時機

查詢玩家狀態、建立旅程、購買車票、判定勝負時使用。

---

## 2.3 updatePlayerProfile

### 用途

更新玩家基本資料。

### 輸入

* playerId
* displayName
* avatar
* metadata

### 輸出

* updatedPlayerData

### 使用時機

玩家修改個人資料時使用。

---

## 2.4 initializePlayerForGame

### 用途

遊戲開始時初始化玩家狀態。

### 輸入

* gameId
* playerId
* startLocationId
* initialMoney

### 輸出

* initializedPlayerState

### 使用時機

遊戲正式開始時使用。

### 主要規則

* 玩家位置設為指定起點。
* 玩家金錢設為指定初始金幣。
* 初始化玩家車票、旅程與紀錄狀態。

---

## 2.5 getPlayerMoney

### 用途

取得玩家目前金錢。

### 輸入

* gameId
* playerId

### 輸出

* money

### 使用時機

購買車票、刷新商店、出價競標、勝負平手判定時使用。

---

## 2.6 addPlayerMoney

### 用途

增加玩家金錢。

### 輸入

* gameId
* playerId
* amount
* reason

### 輸出

* updatedMoney

### 使用時機

玩家獲得獎勵或特殊規則給予金錢時使用。

---

## 2.7 deductPlayerMoney

### 用途

扣除玩家金錢。

### 輸入

* gameId
* playerId
* amount
* reason

### 輸出

* updatedMoney

### 使用時機

購買車票、刷新商店、競標出價時使用。

### 主要規則

* 扣除後金錢不得小於 0。
* 金錢不足時不得扣款。

---

## 2.8 canAfford

### 用途

檢查玩家是否有足夠金錢支付指定金額。

### 輸入

* gameId
* playerId
* amount

### 輸出

* canAfford
* currentMoney

### 使用時機

購買、刷新、出價前使用。

---

## 2.9 getPlayerLocation

### 用途

取得玩家目前位置。

### 輸入

* gameId
* playerId

### 輸出

* locationId

### 使用時機

建立旅程、旅程完成、終點判定時使用。

### 主要規則

玩家位置只代表目前所在城市或地點，不代表途中位置或即時 GPS 位置。

---

## 2.10 setPlayerLocation

### 用途

更新玩家目前位置。

### 輸入

* gameId
* playerId
* locationId
* reason

### 輸出

* updatedLocation

### 使用時機

旅程完成後使用。

---

## 2.11 getPlayerTickets

### 用途

取得玩家持有車票列表。

### 輸入

* gameId
* playerId
* filterOptions

### 輸出

* ticketList

### 使用時機

建立旅程、查看持有車票、驗證車票列表時使用。

---

## 2.12 addTicketToPlayer

### 用途

將車票加入玩家持有列表。

### 輸入

* gameId
* playerId
* ticketId
* source

### 輸出

* updatedTicketList

### 使用時機

購買車票、競標得標、獎勵取得、交通異常返還車票時使用。

---

## 2.13 removeTicketFromPlayer

### 用途

從玩家持有列表移除車票。

### 輸入

* gameId
* playerId
* ticketId
* reason

### 輸出

* updatedTicketList

### 使用時機

旅程開始消耗車票時使用。

---

## 2.14 getPlayerCurrentJourney

### 用途

取得玩家目前進行中旅程。

### 輸入

* gameId
* playerId

### 輸出

* currentJourney

### 使用時機

檢查玩家是否正在移動、建立下一段旅程、顯示公開旅程資訊時使用。

---

## 2.15 getPlayerReservedJourney

### 用途

取得玩家尚未開始的預約旅程。

### 輸入

* gameId
* playerId

### 輸出

* reservedJourney

### 使用時機

建立、修改、取消旅程時使用。

### 主要規則

玩家同時只能擁有一個尚未開始的預約旅程。

---

## 2.16 setPlayerJourneyState

### 用途

更新玩家旅程狀態。

### 輸入

* gameId
* playerId
* journeyId
* journeyState

### 輸出

* updatedPlayerJourneyState

### 使用時機

旅程建立、開始、完成、取消時使用。

---

## 2.17 hasReachedGoal

### 用途

判定玩家是否已抵達終點。

### 輸入

* gameId
* playerId
* goalLocationId

### 輸出

* hasReachedGoal
* arrivalTime

### 使用時機

旅程完成後、勝負判定時使用。

---

# 3. 車票系統 Ticket System

車票系統負責生成車票、管理車票、驗證車票組合、預約與消耗車票。

---

## 3.1 createTicket

### 用途

建立一張車票。

### 輸入

* transportType
* usableMinutes
* price
* ticketSource
* metadata

### 輸出

* ticketId
* ticketData

### 使用時機

商店生成車票、競標生成車票、獎勵發放車票時使用。

---

## 3.2 generateRandomTicket

### 用途

隨機生成一張車票。

### 輸入

* mapId
* availableTransportTypes
* generationRules

### 輸出

* ticketData

### 使用時機

一般商店刷新、競標商店開啟新競標時使用。

### 主要規則

* 須依照交通工具出現比例隨機選出交通工具種類。
* 須先生成基礎車票效益時長隨機數。
* 須先生成基礎價格隨機數。
* 車票可使用時間 = 基礎車票效益時長 × 交通工具車票倍率。
* 車票價格 = 基礎價格 × 交通工具價格倍率。
* 隨機數需支援平均值、標準差、步進值、下限、上限規則。
* 若地圖限制可用交通工具，僅能在允許清單內抽取。
* 商店與競標若需不同評級條件，應使用對應的評級函數分離處理。

---

## 3.2.1 calculateTicketRating

### 用途

計算車票評級分數與等級。

### 輸入

* ticketData
* ratingType

### 輸出

* ratingScore
* ratingGrade

### 使用時機

顯示車票價值、儲存車票評級、商店商品展示時使用。

### 主要規則

* `ratingType = normal_shop` 時，同時考慮基礎時長與基礎價格。
* `ratingType = auction` 時，只考慮基礎時長，不得使用價格。
* 評級分數範圍需落在 `-5` 到 `+5`。
* 分數區間需對應 `S / A / B / C / D / E / SHIT`。
* 分數區間需維持對稱邊界，避免正負評級偏差。

---

## 3.2.2 calculateNormalShopTicketRating

### 用途

計算一般商店車票評級。

### 輸入

* baseUsableMinutes
* basePrice

### 輸出

* ratingScore
* ratingGrade

### 使用時機

一般商店生成與展示車票時使用。

### 主要規則

* 同時考慮基礎車票效益時長與基礎價格。
* 價格需先標準化後再納入計算。
* 最終分數限制在 `-5` 到 `+5`。
* `durationZ = (baseUsableMinutes - 55) / 20`
* `priceZ = (basePrice - 2500) / 800`
* `normalizedPriceZ = priceZ * 0.72`
* `rawScore = durationZ - normalizedPriceZ`
* `ratingScore = clamp(rawScore * (5 / 4.5), -5, 5)`

---

## 3.2.3 calculateAuctionTicketRating

### 用途

計算競標商店車票評級。

### 輸入

* baseUsableMinutes

### 輸出

* ratingScore
* ratingGrade

### 使用時機

競標商店生成車票時使用。

### 主要規則

* 只考慮基礎車票效益時長。
* 不得使用基礎價格參與評級。
* 競標商品只允許 `A` 或 `S`。
* `durationZ = (baseUsableMinutes - 55) / 20`
* `ratingScore = clamp(durationZ * (5 / 2.25), -5, 5)`

---

## 3.3 generateTicketBatch

### 用途

一次生成多張車票。

### 輸入

* mapId
* count
* generationRules

### 輸出

* ticketList

### 使用時機

一般商店刷新 5 張車票時使用。

### 主要規則

* 每張車票皆須獨立執行一次隨機生成流程。
* 批次生成時須共用同一套 generationRules。
* 生成結果需保留每張車票的 transportType、usableMinutes、price 與 generation metadata。

---

## 3.3.1 selectRandomTransportTypeByWeight

### 用途

依照設定的交通工具出現比例，隨機選出本次車票的交通工具種類。

### 輸入

* availableTransportTypes
* transportWeightRules

### 輸出

* selectedTransportType

### 使用時機

generateRandomTicket 決定交通工具時使用。

### 主要規則

* 只能從 availableTransportTypes 中抽取。
* 抽取權重依照 transportWeightRules 定義。
* 若某交通工具未被地圖允許，該交通工具不得參與抽取。

---

## 3.3.2 generateRandomValueByRule

### 用途

依照指定隨機規則產生數值。

### 輸入

* randomRuleName
* average
* standardDeviation
* step
* minValue
* maxValue

### 輸出

* generatedValue

### 使用時機

生成基礎車票效益時長、基礎價格時使用。

### 主要規則

* 生成值需落在 minValue 與 maxValue 範圍內。
* 生成值需符合 step 規則。
* randomRuleName 可用於區分不同數值來源，例如 baseUsableMinutes、basePrice。

---

## 3.3.3 calculateTicketUsableMinutes

### 用途

依照基礎車票效益時長與交通工具倍率，計算車票可使用時間。

### 輸入

* baseUsableMinutes
* transportType
* transportDurationMultiplierRules

### 輸出

* usableMinutes

### 使用時機

generateRandomTicket 建立車票數值時使用。

### 主要規則

* usableMinutes = baseUsableMinutes × transportDurationMultiplier。
* transportDurationMultiplier 依 transportType 對應規則取得。

---

## 3.3.4 calculateTicketPrice

### 用途

依照基礎價格與交通工具價格倍率，計算最終車票價格。

### 輸入

* basePrice
* transportType
* transportPriceMultiplierRules

### 輸出

* finalPrice

### 使用時機

generateRandomTicket 建立車票數值時使用。

### 主要規則

* finalPrice = basePrice × transportPriceMultiplier。
* transportPriceMultiplier 依 transportType 對應規則取得。

---

## 3.3.5 getTicketGenerationRules

### 用途

取得指定地圖或系統目前使用的車票生成規則。

### 輸入

* mapId
* ruleSetName

### 輸出

* generationRules

### 使用時機

一般商店刷新、競標開啟、需要統一生成車票規則時使用。

### 包含資料

* transportWeightRules
* transportDurationMultiplierRules
* transportPriceMultiplierRules
* baseUsableMinutesRandomRule
* basePriceRandomRule

---

## 3.4 getTicket

### 用途

取得指定車票資料。

### 輸入

* ticketId

### 輸出

* ticketData

### 使用時機

購買、競標、建立旅程、消耗車票時使用。

---

## 3.5 updateTicketStatus

### 用途

更新車票狀態。

### 輸入

* ticketId
* status
* reason

### 輸出

* updatedTicketData

### 使用時機

車票上架、售出、預約、解除預約、消耗、銷毀時使用。

---

## 3.6 validateTicketOwnership

### 用途

確認車票是否屬於指定玩家。

### 輸入

* gameId
* playerId
* ticketIdList

### 輸出

* isValid
* invalidTicketList

### 使用時機

建立或修改旅程時使用。

---

## 3.7 validateTicketNotReserved

### 用途

確認車票未被其他旅程預約。

### 輸入

* gameId
* ticketIdList

### 輸出

* isValid
* reservedTicketList

### 使用時機

建立或修改旅程時使用。

---

## 3.8 validateTicketCombination

### 用途

驗證車票組合是否合法。

### 輸入

* ticketIdList
* selectedTransportType

### 輸出

* isValid
* reason
* mainTransportType
* totalUsableMinutes

### 使用時機

建立旅程、修改旅程時使用。

### 主要規則

* 相同一般交通工具車票可以組合。
* 不同一般交通工具不可在同一段旅程直接組合。
* 通用車票可以搭配任何一般交通工具。
* 通用車票不可單獨使用。
* 多張通用車票不可單獨使用。
* 計程車屬於一般車票。
* 步行不得與任何車票共同建立同一段旅程。

---

## 3.9 calculateTicketTotalUsableTime

### 用途

計算車票列表可提供的總使用時間。

### 輸入

* ticketIdList
* selectedTransportType

### 輸出

* totalUsableMinutes

### 使用時機

建立旅程、修改旅程、交通異常返還計算時使用。

---

## 3.10 validateTicketTimeEnoughForJourney

### 用途

確認車票總時間足以支援旅程時間。

### 輸入

* ticketIdList
* departureTime
* arrivalTime
* selectedTransportType

### 輸出

* isEnough
* requiredMinutes
* availableMinutes

### 使用時機

建立旅程、修改旅程時使用。

### 主要規則

車票總時間必須大於或等於抵達時間與出發時間的差。

---

## 3.11 reserveTickets

### 用途

將車票加入旅程使用車票列表並設為預約狀態。

### 輸入

* gameId
* playerId
* journeyId
* ticketIdList

### 輸出

* reservedTicketList

### 使用時機

旅程建立成功時使用。

### 主要規則

預約車票不可用於其他旅程。

---

## 3.12 releaseReservedTickets

### 用途

解除車票預約狀態。

### 輸入

* gameId
* journeyId
* ticketIdList

### 輸出

* releasedTicketList

### 使用時機

旅程開始前取消旅程或修改旅程時使用。

---

## 3.13 consumeTickets

### 用途

消耗旅程使用車票列表中的所有車票。

### 輸入

* gameId
* playerId
* journeyId
* ticketIdList

### 輸出

* consumedTicketList

### 使用時機

旅程開始時使用。

### 主要規則

車票購買時不消耗，建立旅程時不消耗，旅程開始時才消耗。

---

## 3.14 createReturnedTicket

### 用途

因交通異常重新計算而返還車票。

### 輸入

* gameId
* playerId
* transportType
* returnedMinutes
* sourceJourneyId
* reason

### 輸出

* returnedTicketData

### 使用時機

交通異常申請通過後使用。

---

## 3.15 destroyTicket

### 用途

銷毀指定車票。

### 輸入

* ticketId
* reason

### 輸出

* success
* destroyedTicketId

### 使用時機

競標無人得標、商店刷新下架、規則需要移除車票時使用。

---

# 4. 商店系統 Shop System

商店系統負責一般商店、競標商店、車票生成、刷新、購買與競標處理。

---

# 4.1 一般商店 General Shop

---

## 4.1.1 initializeGeneralShop

### 用途

初始化一般商店。

### 輸入

* gameId
* mapId

### 輸出

* shopState

### 使用時機

遊戲開始時使用。

---

## 4.1.2 refreshGeneralShop

### 用途

刷新一般商店內容。

### 輸入

* gameId
* playerId
* refreshType

### 輸出

* newShopTicketList
* refreshCost
* refreshedAt

### 使用時機

遊戲開始、每日 06:00 免費刷新、玩家手動刷新時使用。

### 主要規則

* 一般商店一次上架 5 張車票。
* 手動刷新費用為 500 × 玩家數量。
* 每次刷新至少間隔 10 分鐘。
* 每日 06:00 免費刷新一次。
* 06:00 免費刷新後至少 10 分鐘才可手動刷新。
* 刷新會下架所有尚未被購買的車票。
* 一般商店刷新不影響競標商店。
* 玩家手動刷新後，該次刷新產生車票的 5 分鐘優先購買權應被記錄。
* 06:00 免費刷新不產生優先購買權。
* 盲盒或其他效果給予的玩家主動免費刷新，視同玩家主動刷新並產生優先購買權。
* 被刷新下架的車票不會進入競標商店。

---

## 4.1.3 canRefreshGeneralShop

### 用途

檢查一般商店是否可以刷新。

### 輸入

* gameId
* playerId
* currentTime
* refreshType

### 輸出

* canRefresh
* reason
* refreshCost

### 使用時機

玩家按下刷新前使用。

---

## 4.1.4 getGeneralShopItems

### 用途

取得一般商店目前上架車票。

### 輸入

* gameId

### 輸出

* shopTicketList

### 使用時機

玩家查看商店時使用。

---

## 4.1.5 purchaseGeneralShopTicket

### 用途

購買一般商店車票。

### 輸入

* gameId
* playerId
* shopItemId

### 輸出

* success
* purchasedTicket
* updatedMoney

### 使用時機

玩家直接購買一般商店車票時使用。

### 主要規則

* 玩家金錢不足時不得購買。
* 購買後金錢不得小於 0。
* 架上的車票只能被一人購買。
* 多人同時購買時，以伺服器收到請求時間先後判定。
* 若商品已不存在，購買失敗。
* 若商品仍在刷新者優先購買權期間，只有刷新者可以購買。

---

## 4.1.6 removeGeneralShopItem

### 用途

移除一般商店指定商品。

### 輸入

* gameId
* shopItemId
* reason

### 輸出

* success

### 使用時機

車票被購買、商店刷新下架時使用。

---

## 4.1.7 isGeneralShopOpen

### 用途

確認一般商店是否營業。

### 輸入

* currentTime

### 輸出

* isOpen

### 使用時機

購買或刷新前使用。

### 主要規則

一般商店 00:00 至 06:00 關閉。

---

# 4.2 競標商店 Auction Shop

---

## 4.2.1 initializeAuctionShop

### 用途

初始化競標商店。

### 輸入

* gameId
* mapId

### 輸出

* auctionShopState

### 使用時機

遊戲開始時使用。

---

## 4.2.2 createAuctionRound

### 用途

建立一輪競標。

### 輸入

* gameId
* startTime
* endTime
* ticketData

### 輸出

* auctionId
* auctionData

### 使用時機

遊戲開始、整點、半點開啟競標時使用。

### 主要規則

* 每 30 分鐘一次。
* 開始時間固定為整點或半點。
* 每次競標只提供 1 張車票。
* 每次競標持續 10 分鐘。
* 00:00 至 06:00 不開啟新的競標。
* 00:00 開始的競標仍進行至 00:10。
* 若遊戲於 `06:00` 開始，第一輪競標需於 `06:00` 立即建立並於 `06:10` 結束。
* 競標商品需先通過 `auction` 評級，且只允許 `A` 或 `S`。

---

## 4.2.3 getCurrentAuction

### 用途

取得目前正在進行的競標。

### 輸入

* gameId
* currentTime

### 輸出

* auctionData

### 使用時機

玩家查看競標商店、出價時使用。

---

## 4.2.4 getAuctionSchedule

### 用途

取得競標排程。

### 輸入

* gameId
* date

### 輸出

* auctionScheduleList

### 使用時機

顯示競標時間表時使用。

---

## 4.2.5 canCreateAuctionRound

### 用途

檢查是否可以建立新競標。

### 輸入

* gameId
* currentTime

### 輸出

* canCreate
* reason

### 使用時機

系統時間事件檢查時使用。

---

## 4.2.6 placeBid

### 用途

玩家提交競標出價。

### 輸入

* gameId
* auctionId
* playerId
* bidAmount

### 輸出

* success
* bidData
* updatedMoney

### 使用時機

玩家於競標期間出價時使用。

### 主要規則

* 玩家每輪競標只能出價一次。
* 出價必須大於等於 0。
* 出價時立即扣款。
* 出價不退還。
* 玩家金錢不足時不得出價。
* 扣款後金錢不得小於 0。

---

## 4.2.7 hasPlayerBid

### 用途

檢查玩家是否已於該競標出價。

### 輸入

* auctionId
* playerId

### 輸出

* hasBid

### 使用時機

玩家出價前使用。

---

## 4.2.8 getAuctionBids

### 用途

取得指定競標的所有出價。

### 輸入

* auctionId

### 輸出

* bidList

### 使用時機

競標結束判定得標者時使用。

---

## 4.2.9 resolveAuction

### 用途

結算競標結果。

### 輸入

* gameId
* auctionId

### 輸出

* winnerPlayerId
* winningBid
* resultType

### 使用時機

競標結束時使用。

### 主要規則

* 找出目前最高價格。
* 若最高價格只有一位玩家，該玩家得標。
* 若最高價格有多人，該價格全部失效。
* 繼續檢查剩餘價格。
* 直到找到唯一最高價格。
* 若所有價格皆失效，車票銷毀。

---

## 4.2.10 awardAuctionTicket

### 用途

將競標車票發給得標玩家。

### 輸入

* gameId
* auctionId
* winnerPlayerId
* ticketId

### 輸出

* awardedTicket

### 使用時機

競標結算後有得標者時使用。

---

## 4.2.11 destroyAuctionTicket

### 用途

銷毀無人得標的競標車票。

### 輸入

* auctionId
* ticketId

### 輸出

* success

### 使用時機

競標無有效得標者時使用。

---

## 4.2.12 isAuctionShopOpenForNewAuction

### 用途

確認目前是否允許開啟新競標。

### 輸入

* currentTime

### 輸出

* isOpen

### 使用時機

系統檢查是否建立新競標時使用。

---

# 5. 旅程系統 Journey System

旅程系統負責建立、修改、取消、開始、完成旅程，以及旅程銜接與交通異常重新計算。

---

## 5.1 createJourney

### 用途

建立一段新旅程。

### 輸入

* gameId
* playerId
* fromLocationId
* toLocationId
* transportType
* departureTime
* arrivalTime
* ticketIdList

### 輸出

* journeyId
* journeyData

### 使用時機

玩家規劃新旅程時使用。

### 主要規則

* 出發時間不得早於目前時間。
* 玩家同時只能有一個尚未開始的預約旅程。
* 第一段旅程出發地必須為指定起點。
* 移動中可規劃下一段旅程。
* 下一段旅程出發地必須等於上一段旅程目的地。
* 下一段旅程出發時間至少距離上一段旅程抵達時間 1 分鐘。
* 最後一段旅程目的地應為指定終點。
* 步行不需要車票。
* 步行不得與任何車票共同建立同一段旅程。
* 非步行旅程需驗證車票列表合法性。

---

## 5.2 validateCreateJourney

### 用途

驗證是否可以建立旅程。

### 輸入

* gameId
* playerId
* journeyDraft

### 輸出

* isValid
* reasonList

### 使用時機

建立旅程前使用。

---

## 5.3 updateJourney

### 用途

修改尚未開始的旅程。

### 輸入

* gameId
* playerId
* journeyId
* updatedJourneyData

### 輸出

* updatedJourneyData

### 使用時機

玩家修改尚未開始的旅程時使用。

### 主要規則

旅程開始前可以修改：

* 出發地
* 目的地
* 交通工具
* 出發時間
* 抵達時間
* 使用車票列表

旅程開始後不可修改。

---

## 5.4 validateUpdateJourney

### 用途

驗證是否可以修改旅程。

### 輸入

* gameId
* playerId
* journeyId
* updatedJourneyData

### 輸出

* isValid
* reasonList

### 使用時機

修改旅程前使用。

---

## 5.5 cancelJourney

### 用途

取消尚未開始的旅程。

### 輸入

* gameId
* playerId
* journeyId

### 輸出

* success
* releasedTicketList

### 使用時機

玩家取消預約旅程時使用。

### 主要規則

* 旅程開始前可以取消。
* 取消不扣錢。
* 取消不消耗車票。
* 取消後解除車票預約。
* 旅程開始後不可取消。

---

## 5.6 startJourney

### 用途

將旅程狀態改為已開始。

### 輸入

* gameId
* playerId
* journeyId
* currentTime

### 輸出

* startedJourneyData
* consumedTicketList

### 使用時機

當現在時間大於或等於出發時間時使用。

### 主要規則

* 旅程開始時消耗使用車票列表。
* 旅程開始後不可取消。
* 旅程開始後資料鎖定。

---

## 5.7 completeJourney

### 用途

完成旅程並更新玩家位置。

### 輸入

* gameId
* playerId
* journeyId
* currentTime

### 輸出

* completedJourneyData
* updatedPlayerLocation

### 使用時機

當現在時間大於或等於抵達時間時使用。

### 主要規則

* 玩家位置更新為旅程目的地。
* 玩家可以建立新的旅程。
* 若目的地為終點，記錄抵達時間。

---

## 5.8 getJourney

### 用途

取得指定旅程資料。

### 輸入

* journeyId

### 輸出

* journeyData

### 使用時機

顯示旅程、修改旅程、取消旅程、審查紀錄時使用。

---

## 5.9 listPlayerJourneys

### 用途

取得玩家旅程列表。

### 輸入

* gameId
* playerId
* visibilityMode

### 輸出

* journeyList

### 使用時機

玩家查看自己完整旅程，或遊戲結束後審查時使用。

---

## 5.10 getPublicJourneyInfo

### 用途

取得遊戲進行中可公開的玩家旅程資訊。

### 輸入

* gameId
* targetPlayerId

### 輸出

* publicJourneyInfo

### 使用時機

其他玩家查看允許公開資訊時使用。

### 主要規則

遊戲進行中可查看：

* 玩家目前旅程
* 使用車票列表
* 旅程時間
* 交通異常申請

不可查看：

* 玩家目前確切位置
* 玩家完整路徑

---

## 5.11 validateJourneyConnection

### 用途

驗證新旅程與前一段旅程是否正確銜接。

### 輸入

* gameId
* playerId
* newJourneyDraft

### 輸出

* isValid
* reason

### 使用時機

建立或修改旅程時使用。

### 主要規則

* 下一段旅程出發地必須等於上一段旅程目的地。
* 下一段旅程出發時間至少距離上一段旅程抵達時間 1 分鐘。
* 不可跳躍到其他地點。

---

## 5.12 validateJourneyTime

### 用途

驗證旅程時間是否合法。

### 輸入

* departureTime
* arrivalTime
* currentTime

### 輸出

* isValid
* reason

### 使用時機

建立或修改旅程時使用。

### 主要規則

* 出發時間不得早於目前時間。
* 抵達時間應晚於出發時間。

---

## 5.13 validateWalkingJourney

### 用途

驗證步行旅程是否合法。

### 輸入

* journeyDraft

### 輸出

* isValid
* reason

### 使用時機

建立或修改步行旅程時使用。

### 主要規則

* 步行不需要車票。
* 步行不消耗金錢。
* 步行不得與任何車票共同建立同一段旅程。
* 步行仍需設定出發地、目的地、出發時間、抵達時間。

---

## 5.14 validateTaxiJourney

### 用途

驗證計程車旅程是否合法。

### 輸入

* journeyDraft
* ticketIdList

### 輸出

* isValid
* reason

### 使用時機

建立或修改計程車旅程時使用。

### 主要規則

* 計程車屬於一般車票。
* 計程車可以自由選擇目的地。
* 旅程開始後不可修改目的地。
* 建立計程車旅程時，玩家必須準備前往初始設定目的地所需完整時間。

---

## 5.15 lockJourney

### 用途

鎖定旅程資料。

### 輸入

* journeyId

### 輸出

* lockedJourneyData

### 使用時機

旅程開始時使用。

---

## 5.16 processJourneyTimeEvents

### 用途

依照現實時間處理旅程開始與完成。

### 輸入

* gameId
* currentTime

### 輸出

* startedJourneyList
* completedJourneyList

### 使用時機

系統定時檢查時使用。

### 主要規則

玩家離線不影響已建立或已開始旅程，所有事件仍依現實時間繼續。

---

# 5.2 交通異常重新計算 Traffic Incident Recalculation

---

## 5.2.1 submitTrafficIncidentRequest

### 用途

玩家提出交通異常重新計算申請。

### 輸入

* gameId
* playerId
* journeyId
* incidentDescription
* proofList
* actualEndLocationId
* unfinishedSegmentInfo

### 輸出

* requestId
* requestData

### 使用時機

旅程開始後遇到交通工具無法抵達原目的地時使用。

---

## 5.2.2 validateTrafficIncidentRequest

### 用途

驗證交通異常申請是否符合條件。

### 輸入

* gameId
* playerId
* journeyId
* requestData

### 輸出

* isValid
* reasonList

### 使用時機

處理交通異常申請前使用。

### 主要規則

需要符合：

* 旅程已開始。
* 事件發生於旅途中。
* 交通異常導致無法完成原旅程。
* 玩家提供有效證明。
* 延誤、等候、慢速行駛、一般晚點、天候延遲不重新計算。

---

## 5.2.3 approveTrafficIncidentRequest

### 用途

批准交通異常重新計算申請。

### 輸入

* gameId
* requestId
* approvedBy
* returnedMinutes

### 輸出

* approvedRequestData
* returnedTicketData

### 使用時機

管理者或系統確認申請有效後使用。

---

## 5.2.4 rejectTrafficIncidentRequest

### 用途

拒絕交通異常重新計算申請。

### 輸入

* gameId
* requestId
* rejectedBy
* reason

### 輸出

* rejectedRequestData

### 使用時機

申請不符合條件時使用。

---

## 5.2.5 calculateReturnedTicketTime

### 用途

計算應返還的車票時間。

### 輸入

* originalJourney
* actualCompletedSegment
* unfinishedSegmentInfo

### 輸出

* returnedMinutes
* transportType

### 使用時機

交通異常申請通過時使用。

### 主要規則

依照未完成區間返還對應時間之相同交通工具車票。

---

## 5.2.6 applyTrafficIncidentResult

### 用途

套用交通異常重新計算結果。

### 輸入

* gameId
* playerId
* journeyId
* requestId
* returnedTicketData

### 輸出

* updatedJourneyData
* updatedPlayerTickets

### 使用時機

交通異常申請批准後使用。

---

# 6. 紀錄系統 Record System

紀錄系統負責記錄所有遊戲行為、保存遊戲紀錄，並在遊戲結束後提供審查資料。

---

## 6.1 createRecord

### 用途

建立一筆遊戲紀錄。

### 輸入

* gameId
* playerId
* recordType
* action
* payload
* createdAt

### 輸出

* recordId
* recordData

### 使用時機

任何遊戲操作發生時使用。

---

## 6.2 recordPlayerAction

### 用途

記錄玩家操作。

### 輸入

* gameId
* playerId
* actionType
* actionData

### 輸出

* recordData

### 使用時機

玩家購買、刷新、出價、建立旅程、修改旅程、取消旅程等操作時使用。

---

## 6.3 recordTicketAcquisition

### 用途

記錄車票取得。

### 輸入

* gameId
* playerId
* ticketId
* source
* sourceDetail

### 輸出

* recordData

### 使用時機

玩家從商店、競標、獎勵、交通異常返還取得車票時使用。

---

## 6.4 recordTicketUsage

### 用途

記錄車票使用或消耗。

### 輸入

* gameId
* playerId
* journeyId
* ticketIdList
* usedAt

### 輸出

* recordData

### 使用時機

旅程開始消耗車票時使用。

---

## 6.5 recordJourney

### 用途

記錄旅程資料。

### 輸入

* gameId
* playerId
* journeyId
* journeyAction
* journeyData

### 輸出

* recordData

### 使用時機

旅程建立、修改、取消、開始、完成時使用。

---

## 6.6 recordShopAction

### 用途

記錄商店操作。

### 輸入

* gameId
* playerId
* shopType
* actionType
* actionData

### 輸出

* recordData

### 使用時機

一般商店刷新、購買、競標開啟、出價、結算時使用。

---

## 6.7 recordTrafficIncidentRequest

### 用途

記錄交通異常申請。

### 輸入

* gameId
* playerId
* requestId
* requestAction
* requestData

### 輸出

* recordData

### 使用時機

交通異常申請提交、批准、拒絕、套用結果時使用。

---

## 6.8 getPlayerRecords

### 用途

取得指定玩家的操作紀錄。

### 輸入

* gameId
* playerId
* visibilityMode
* filterOptions

### 輸出

* recordList

### 使用時機

玩家查看自己紀錄，或遊戲結束後審查時使用。

---

## 6.9 getGameRecords

### 用途

取得整場遊戲紀錄。

### 輸入

* gameId
* visibilityMode
* filterOptions

### 輸出

* recordList

### 使用時機

遊戲結束後審查、管理者查詢時使用。

---

## 6.10 getPublicRecordsDuringGame

### 用途

取得遊戲進行中允許公開的紀錄。

### 輸入

* gameId
* requestingPlayerId

### 輸出

* publicRecordList

### 使用時機

遊戲進行期間玩家查看公開資訊時使用。

### 主要規則

遊戲進行中不得公開：

* 玩家目前確切位置
* 玩家完整路徑

---

## 6.11 getPostGameReviewData

### 用途

取得遊戲結束後審查資料。

### 輸入

* gameId

### 輸出

* reviewData

### 使用時機

所有玩家抵達終點後使用。

### 包含資料

* 完整旅程紀錄
* 完整路線
* 車票使用紀錄
* 所有操作紀錄
* 交通異常申請紀錄

---

# 7. 遊戲流程系統 Game Flow System

遊戲流程系統負責建立遊戲、玩家加入、遊戲開始、遊戲結束與勝負判定。

---

## 7.1 createGame

### 用途

建立一場新遊戲。

### 輸入

* hostPlayerId
* mapId
* startLocationId
* goalLocationId
* initialMoney
* gameSettings

### 輸出

* gameId
* gameData

### 使用時機

主持人建立新遊戲房間時使用。

---

## 7.2 getGame

### 用途

取得指定遊戲資料。

### 輸入

* gameId

### 輸出

* gameData

### 使用時機

顯示遊戲狀態、進入房間、判斷流程時使用。

---

## 7.3 updateGameSettings

### 用途

更新遊戲設定。

### 輸入

* gameId
* settings

### 輸出

* updatedGameData

### 使用時機

遊戲開始前修改設定時使用。

---

## 7.4 joinGame

### 用途

玩家加入遊戲。

### 輸入

* gameId
* playerId

### 輸出

* joinedPlayerData
* gamePlayerList

### 使用時機

遊戲開始前玩家加入時使用。

### 主要規則

* 遊戲開始前可以加入。
* 遊戲開始後不得加入。

---

## 7.5 leaveGame

### 用途

玩家在遊戲開始前退出遊戲。

### 輸入

* gameId
* playerId

### 輸出

* success
* gamePlayerList

### 使用時機

遊戲尚未開始時使用。

### 主要規則

遊戲開始後不得退出遊戲。

---

## 7.6 startGame

### 用途

正式開始遊戲。

### 輸入

* gameId
* startTime

### 輸出

* startedGameData

### 使用時機

遊戲開始時間到達時使用。

### 主要規則

遊戲開始先決條件：

* 整點開始。
* 所有玩家位於指定起點，玩家自發性，不需檢查。

遊戲開始時完成：

* 所有玩家初始化至指定起點。
* 所有玩家獲得指定初始金幣。
* 刷新一般商店。
* 開始第一輪競標。

---

## 7.7 canStartGame

### 用途

檢查遊戲是否可以開始。

### 輸入

* gameId
* currentTime

### 輸出

* canStart
* reasonList

### 使用時機

主持人或系統嘗試開始遊戲前使用。

### 主要規則

* 必須為整點開始。
* 不檢查玩家現實位置是否真的在起點。

---

## 7.8 endGame

### 用途

結束遊戲。

### 輸入

* gameId
* endedAt

### 輸出

* endedGameData
* finalResults

### 使用時機

所有玩家都抵達終點後使用。

---

## 7.9 checkGameEndCondition

### 用途

檢查遊戲是否達成結束條件。

### 輸入

* gameId

### 輸出

* shouldEnd
* arrivedPlayerList
* notArrivedPlayerList

### 使用時機

每次玩家完成旅程後使用。

### 主要規則

即使產生第一名抵達者，遊戲仍持續，直到其他玩家都抵達終點後才結束。

---

## 7.10 recordPlayerArrival

### 用途

記錄玩家抵達終點。

### 輸入

* gameId
* playerId
* arrivalTime
* remainingMoney

### 輸出

* arrivalRecord

### 使用時機

玩家完成目的地為終點的旅程時使用。

---

## 7.11 determineWinner

### 用途

判定遊戲勝負。

### 輸入

* gameId

### 輸出

* winnerPlayerId
* rankingList
* isTie

### 使用時機

所有玩家抵達終點後使用。

### 主要規則

* 依照實際抵達時間判定。
* 最早抵達者獲勝。
* 若多人同時抵達，比較剩餘金錢。
* 金錢較多者獲勝。
* 金錢相同則平手。

---

## 7.12 getRanking

### 用途

取得玩家排名。

### 輸入

* gameId

### 輸出

* rankingList

### 使用時機

遊戲結束畫面、審查畫面使用。

---

## 7.13 processGameTimeEvents

### 用途

依照現實時間處理遊戲內所有時間事件。

### 輸入

* gameId
* currentTime

### 輸出

* processedEvents

### 使用時機

系統定時檢查時使用。

### 處理內容

* 旅程開始
* 旅程完成
* 一般商店免費刷新
* 競標開始
* 競標結束
* 遊戲事件

### 主要規則

玩家離線不影響：

* 已開始旅程
* 已建立旅程
* 商店
* 競標

所有事件仍依照現實時間繼續。

---

# 8. 時間系統 Time System

時間系統負責提供現實時間與時間相關判斷。

---

## 8.1 getCurrentTime

### 用途

取得伺服器目前時間。

### 輸入

無

### 輸出

* currentTime

### 使用時機

所有時間判定時使用。

---

## 8.2 isOnTheHour

### 用途

判斷目前時間是否為整點。

### 輸入

* currentTime

### 輸出

* isOnTheHour

### 使用時機

判定遊戲是否可以整點開始時使用。

---

## 8.3 isOnAuctionStartTime

### 用途

判斷目前時間是否為競標開始時間。

### 輸入

* currentTime

### 輸出

* isAuctionStartTime

### 使用時機

競標商店每 30 分鐘開啟競標時使用。

### 主要規則

競標開始時間固定為整點與半點。

---

## 8.4 isWithinTimeRange

### 用途

判斷時間是否位於指定範圍內。

### 輸入

* currentTime
* startTime
* endTime

### 輸出

* isWithinRange

### 使用時機

判斷商店營業時間、競標期間、旅程時間時使用。

---

## 8.5 calculateDurationMinutes

### 用途

計算兩個時間之間的分鐘差。

### 輸入

* startTime
* endTime

### 輸出

* durationMinutes

### 使用時機

計算旅程時間、車票可用時間、刷新間隔、競標時間時使用。

---

## 8.6 hasReachedTime

### 用途

判斷目前時間是否已達指定時間。

### 輸入

* currentTime
* targetTime

### 輸出

* hasReached

### 使用時機

旅程開始、旅程完成、競標結束等判斷時使用。

---

# 9. 權限與可見性系統 Visibility System

權限與可見性系統負責控制遊戲進行中與遊戲結束後可查看的資料。

---

## 9.1 canViewPlayerExactLocation

### 用途

判斷是否可以查看玩家確切位置。

### 輸入

* gameId
* requestingPlayerId
* targetPlayerId

### 輸出

* canView

### 使用時機

玩家查看其他玩家資訊時使用。

### 主要規則

遊戲進行中其他玩家不可查看玩家目前確切位置。

---

## 9.2 canViewPlayerFullRoute

### 用途

判斷是否可以查看玩家完整路徑。

### 輸入

* gameId
* requestingPlayerId
* targetPlayerId

### 輸出

* canView

### 使用時機

玩家查看路線紀錄時使用。

### 主要規則

遊戲進行中不可查看完整路徑；遊戲結束後可查看。

---

## 9.3 canViewPublicJourney

### 用途

判斷是否可以查看玩家目前旅程公開資料。

### 輸入

* gameId
* requestingPlayerId
* targetPlayerId

### 輸出

* canView

### 使用時機

遊戲進行中查看其他玩家公開旅程資訊時使用。

---

## 9.4 filterPlayerDataByVisibility

### 用途

依照可見性規則過濾玩家資料。

### 輸入

* gameId
* requestingPlayerId
* targetPlayerData
* visibilityMode

### 輸出

* filteredPlayerData

### 使用時機

回傳玩家資料給前端前使用。

---

## 9.5 filterRecordDataByVisibility

### 用途

依照可見性規則過濾紀錄資料。

### 輸入

* gameId
* requestingPlayerId
* recordData
* visibilityMode

### 輸出

* filteredRecordData

### 使用時機

查詢遊戲紀錄或審查資料時使用。

---

# 10. PocketBase 資料存取層 Data Access Layer

本層只描述資料操作用途，不描述 PocketBase 實作方式。

---

## 10.1 createRecordInCollection

### 用途

在指定 collection 建立資料。

### 輸入

* collectionName
* data

### 輸出

* createdRecord

### 使用時機

建立玩家、遊戲、地圖、車票、旅程、商店、紀錄等資料時使用。

---

## 10.2 getRecordById

### 用途

依照 ID 取得資料。

### 輸入

* collectionName
* recordId

### 輸出

* recordData

### 使用時機

讀取指定資料時使用。

---

## 10.3 updateRecordById

### 用途

依照 ID 更新資料。

### 輸入

* collectionName
* recordId
* data

### 輸出

* updatedRecord

### 使用時機

修改玩家狀態、旅程狀態、車票狀態、商店狀態時使用。

---

## 10.4 deleteRecordById

### 用途

依照 ID 刪除資料。

### 輸入

* collectionName
* recordId

### 輸出

* success

### 使用時機

刪除地圖、地點、未使用資料或管理者操作時使用。

---

## 10.5 listRecords

### 用途

列出指定 collection 的資料。

### 輸入

* collectionName
* filterOptions
* sortOptions
* paginationOptions

### 輸出

* recordList

### 使用時機

顯示列表資料時使用。

---

## 10.6 findOneRecord

### 用途

依照條件查詢單筆資料。

### 輸入

* collectionName
* filterOptions

### 輸出

* recordData

### 使用時機

查詢目前旅程、目前競標、目前商店狀態時使用。

---

## 10.7 runTransactionLikeOperation

### 用途

處理需要一致性的複合操作。

### 輸入

* operationName
* operationData

### 輸出

* operationResult

### 使用時機

購買車票、出價扣款、旅程建立預約車票、競標結算等需要避免資料衝突的操作時使用。

---

# 11. 系統事件函數 System Event Functions

此類函數負責處理由時間驅動的自動事件。

---

## 11.1 processAllScheduledEvents

### 用途

處理指定遊戲目前應發生的所有系統事件。

### 輸入

* gameId
* currentTime

### 輸出

* processedEventList

### 使用時機

伺服器定時任務執行時使用。

---

## 11.2 processShopScheduledEvents

### 用途

處理商店相關時間事件。

### 輸入

* gameId
* currentTime

### 輸出

* processedShopEvents

### 使用時機

每日 06:00 免費刷新、競標開始、競標結束時使用。

---

## 11.3 processJourneyScheduledEvents

### 用途

處理旅程相關時間事件。

### 輸入

* gameId
* currentTime

### 輸出

* processedJourneyEvents

### 使用時機

旅程開始與完成時間到達時使用。

---

## 11.4 processGameEndEvent

### 用途

檢查並處理遊戲結束事件。

### 輸入

* gameId
* currentTime

### 輸出

* gameEndResult

### 使用時機

玩家完成旅程後或系統定時檢查時使用。

---

# 12. API 使用方式建議

以下為前端或其他系統呼叫函數時的主要流程。

---

## 12.1 建立遊戲流程

1. createGame
2. joinGame
3. updateGameSettings
4. canStartGame
5. startGame
6. initializePlayerForGame
7. refreshGeneralShop
8. createAuctionRound
9. recordPlayerAction

---

## 12.2 一般商店購買流程

1. getGeneralShopItems
2. isGeneralShopOpen
3. canAfford
4. purchaseGeneralShopTicket
5. deductPlayerMoney
6. addTicketToPlayer
7. removeGeneralShopItem
8. recordTicketAcquisition
9. recordShopAction

---

## 12.3 一般商店刷新流程

1. isGeneralShopOpen
2. canRefreshGeneralShop
3. canAfford
4. deductPlayerMoney
5. refreshGeneralShop
6. generateTicketBatch
7. recordShopAction

---

## 12.4 競標流程

1. getCurrentAuction
2. hasPlayerBid
3. canAfford
4. placeBid
5. deductPlayerMoney
6. recordShopAction
7. getAuctionBids
8. resolveAuction
9. awardAuctionTicket 或 destroyAuctionTicket
10. recordTicketAcquisition

---

## 12.5 建立旅程流程

1. getPlayer
2. getPlayerReservedJourney
3. validateJourneyTime
4. validateJourneyConnection
5. validateWalkingJourney 或 validateTicketCombination
6. validateTicketOwnership
7. validateTicketNotReserved
8. validateTicketTimeEnoughForJourney
9. createJourney
10. reserveTickets
11. recordJourney

---

## 12.6 修改旅程流程

1. getJourney
2. validateUpdateJourney
3. releaseReservedTickets
4. validateJourneyTime
5. validateJourneyConnection
6. validateTicketCombination
7. validateTicketOwnership
8. validateTicketNotReserved
9. validateTicketTimeEnoughForJourney
10. reserveTickets
11. updateJourney
12. recordJourney

---

## 12.7 取消旅程流程

1. getJourney
2. cancelJourney
3. releaseReservedTickets
4. recordJourney

---

## 12.8 旅程開始流程

1. processJourneyScheduledEvents
2. getJourney
3. startJourney
4. consumeTickets
5. lockJourney
6. recordTicketUsage
7. recordJourney

---

## 12.9 旅程完成流程

1. processJourneyScheduledEvents
2. completeJourney
3. setPlayerLocation
4. hasReachedGoal
5. recordPlayerArrival
6. checkGameEndCondition
7. recordJourney

---

## 12.10 交通異常重新計算流程

1. submitTrafficIncidentRequest
2. validateTrafficIncidentRequest
3. calculateReturnedTicketTime
4. approveTrafficIncidentRequest 或 rejectTrafficIncidentRequest
5. createReturnedTicket
6. applyTrafficIncidentResult
7. recordTrafficIncidentRequest

---

## 12.11 遊戲結束流程

1. checkGameEndCondition
2. endGame
3. determineWinner
4. getRanking
5. getPostGameReviewData
6. recordPlayerAction

---

# 13. 主要資料狀態建議

---

## 13.1 Game Status

* waiting
* started
* ended

---

## 13.2 Player Game Status

* waiting
* active
* arrived
* offline

---

## 13.3 Ticket Status

* generated
* shop_available
* auction_available
* owned
* reserved
* consumed
* destroyed

---

## 13.4 Journey Status

* reserved
* started
* completed
* cancelled
* incident_pending
* incident_resolved

---

## 13.5 Auction Status

* scheduled
* active
* ended
* resolved
* destroyed

---

## 13.6 Shop Status

* open
* closed

---

# 14. 盲盒 Blind Box System

盲盒系統負責盲盒設定、盲盒公開資訊、盲盒開啟、盲盒效果執行與盲盒紀錄。

---

## 14.1 createBlindBox

### 用途

建立一個盲盒。

### 輸入

* gameId
* locationId
* effectData
* createdBy

### 輸出

* blindBoxId
* blindBoxData

### 使用時機

遊戲開始前，裁判設定盲盒時使用。

### 主要規則

* 只能在遊戲開始前建立。
* 每個盲盒必須有指定位置。
* 每個盲盒必須有指定效果。
* 盲盒效果預設不公開給玩家。

---

## 14.2 createBlindBoxBatch

### 用途

一次建立多個盲盒。

### 輸入

* gameId
* blindBoxConfigList
* createdBy

### 輸出

* blindBoxList

### 使用時機

裁判於遊戲開始前設定盲盒數量、位置與效果時使用。

---

## 14.3 updateBlindBox

### 用途

修改盲盒設定。

### 輸入

* gameId
* blindBoxId
* locationId
* effectData
* updatedBy

### 輸出

* updatedBlindBoxData

### 使用時機

遊戲開始前裁判修改盲盒設定時使用。

### 主要規則

* 遊戲開始後不可修改盲盒。
* 已開啟盲盒不可修改。

---

## 14.4 deleteBlindBox

### 用途

刪除盲盒。

### 輸入

* gameId
* blindBoxId
* deletedBy

### 輸出

* success
* deletedBlindBoxId

### 使用時機

遊戲開始前裁判移除盲盒時使用。

### 主要規則

* 遊戲開始後不可刪除盲盒。
* 已開啟盲盒不可刪除。

---

## 14.5 getBlindBox

### 用途

取得指定盲盒完整資料。

### 輸入

* gameId
* blindBoxId
* requesterId
* visibilityMode

### 輸出

* blindBoxData

### 使用時機

裁判查看盲盒設定，或遊戲結束後審查時使用。

---

## 14.6 listBlindBoxes

### 用途

取得遊戲中的盲盒列表。

### 輸入

* gameId
* requesterId
* visibilityMode

### 輸出

* blindBoxList

### 使用時機

玩家查看地圖上的盲盒位置，或裁判查看所有盲盒設定時使用。

### 主要規則

遊戲進行中，玩家只能看到：

* blindBoxId
* locationId
* openedStatus

玩家不可看到：

* effectData

---

## 14.7 getPublicBlindBoxInfo

### 用途

取得玩家可查看的盲盒公開資訊。

### 輸入

* gameId
* playerId

### 輸出

* publicBlindBoxList

### 使用時機

前端顯示盲盒位置時使用。

### 回傳內容

* 盲盒 ID
* 盲盒位置
* 是否已被開啟

### 不回傳內容

* 盲盒效果

---

## 14.8 validateBlindBoxSetup

### 用途

驗證盲盒設定是否合法。

### 輸入

* gameId
* blindBoxConfigList

### 輸出

* isValid
* reasonList

### 使用時機

遊戲開始前，裁判完成盲盒設定時使用。

### 主要檢查

* 盲盒數量是否合法。
* 每個盲盒都有位置。
* 每個盲盒位置存在於地圖中。
* 每個盲盒都有合法效果。
* 每個盲盒都是唯一資料。
* 效果條件格式合法。

---

## 14.9 canOpenBlindBox

### 用途

檢查玩家是否可以開啟指定盲盒。

### 輸入

* gameId
* playerId
* blindBoxId
* currentTime

### 輸出

* canOpen
* reason

### 使用時機

玩家嘗試開啟盲盒前使用。

### 主要檢查

* 遊戲已開始。
* 盲盒存在。
* 盲盒尚未被開啟。
* 玩家目前位置等於盲盒位置。
* 玩家不是移動途中位置。
* 玩家狀態允許操作。

---

## 14.10 openBlindBox

### 用途

玩家開啟盲盒。

### 輸入

* gameId
* playerId
* blindBoxId
* currentTime

### 輸出

* success
* openedBlindBoxData
* effectResult

### 使用時機

玩家位於盲盒位置並選擇開啟盲盒時使用。

### 主要規則

* 同一盲盒只能被開啟一次。
* 開啟後盲盒立即消失。
* 多人同時開啟時，以伺服器收到請求時間先後判定。
* 開啟成功後立即執行盲盒效果。
* 開啟失敗時不執行效果。

---

## 14.11 markBlindBoxAsOpened

### 用途

將盲盒標記為已開啟。

### 輸入

* gameId
* blindBoxId
* playerId
* openedAt

### 輸出

* openedBlindBoxData

### 使用時機

玩家成功開啟盲盒時使用。

---

## 14.12 removeOpenedBlindBox

### 用途

移除或隱藏已開啟盲盒。

### 輸入

* gameId
* blindBoxId

### 輸出

* success

### 使用時機

盲盒開啟成功後使用。

---

## 14.13 executeBlindBoxEffect

### 用途

執行盲盒效果。

### 輸入

* gameId
* playerId
* blindBoxId
* effectData

### 輸出

* effectResult

### 使用時機

盲盒成功開啟後使用。

### 可執行效果

* 金錢效果
* 車票效果
* 商店效果
* 競標效果
* 條件式效果

---

## 14.14 validateBlindBoxEffect

### 用途

驗證盲盒效果設定是否合法。

### 輸入

* effectData

### 輸出

* isValid
* reasonList

### 使用時機

裁判設定盲盒時使用。

---

## 14.15 executeMoneyEffect

### 用途

執行金錢類盲盒效果。

### 輸入

* gameId
* playerId
* operator
* value

### 輸出

* oldMoney
* newMoney
* moneyChange

### 使用時機

盲盒效果為金錢運算時使用。

### 支援運算

* `+=`
* `-=`
* `*=`
* `/=`
* `=`

### 主要規則

* 玩家金錢不得小於 0。
* 若結果小於 0，依遊戲設定處理為設為 0 或效果無效。

---

## 14.16 executeRandomTicketGainEffect

### 用途

執行獲得隨機車票效果。

### 輸入

* gameId
* playerId
* generationTableType

### 輸出

* gainedTicketData

### 使用時機

盲盒效果為獲得隨機車票時使用。

### 主要規則

* 使用競標生成車票機率表。
* 車票立即加入玩家持有車票列表。

---

## 14.17 executeRandomTicketLossEffect

### 用途

執行失去隨機車票效果。

### 輸入

* gameId
* playerId

### 輸出

* lostTicketData
* effectApplied

### 使用時機

盲盒效果為失去隨機車票時使用。

### 主要規則

* 只能移除玩家持有且未預約的車票。
* 若沒有可移除車票，效果不產生作用。

---

## 14.18 executeFreeShopTicketEffect

### 用途

執行從一般商店架上免費取得車票效果。

### 輸入

* gameId
* playerId
* shopItemSelectionMode

### 輸出

* gainedTicketData
* removedShopItemData

### 使用時機

盲盒效果為免費取得商店車票時使用。

### 主要規則

* 不扣除玩家金錢。
* 車票從一般商店架上消失。
* 車票立即加入玩家持有車票列表。
* 若商店架上沒有可取得車票，效果不產生作用。

---

## 14.19 executeGainNextAuctionBidPoolEffect

### 用途

給予玩家「獲得下一次競標總投標金幣」狀態。

### 輸入

* gameId
* playerId
* blindBoxId

### 輸出

* playerSpecialState

### 使用時機

盲盒效果為獲得下一次競標總投標金幣時使用。

---

## 14.20 applyNextAuctionBidPoolReward

### 用途

在下一次競標結束後，將該輪競標總出價金額給予玩家。

### 輸入

* gameId
* auctionId
* playerId

### 輸出

* totalBidAmount
* updatedPlayerMoney
* consumedSpecialState

### 使用時機

競標結算完成後，檢查是否有玩家持有此特殊狀態時使用。

### 主要規則

* 只觸發一次。
* 觸發後狀態消失。
* 不影響競標得標判定。
* 不退還任何玩家出價。

---

## 14.21 executeFreeShopRefreshEffect

### 用途

給予玩家免費刷新一般商店次數。

### 輸入

* gameId
* playerId
* freeRefreshCount

### 輸出

* updatedFreeRefreshCount

### 使用時機

盲盒效果為獲得免費刷新商店 X 次時使用。

---

## 14.22 useFreeShopRefresh

### 用途

使用一次免費刷新一般商店機會。

### 輸入

* gameId
* playerId
* currentTime

### 輸出

* success
* remainingFreeRefreshCount
* refreshedShopData

### 使用時機

玩家選擇使用免費刷新時使用。

### 主要規則

* 玩家必須擁有剩餘免費刷新次數。
* 免費刷新不扣金錢。
* 仍須符合一般商店刷新限制。
* 仍須符合一般商店營業時間。
* 使用成功後次數減少 1。

---

## 14.23 evaluateBlindBoxCondition

### 用途

判斷條件式盲盒效果的條件是否成立。

### 輸入

* gameId
* playerId
* conditionData

### 輸出

* conditionMatched
* evaluatedValue

### 使用時機

執行條件式盲盒效果前使用。

---

## 14.24 executeConditionalBlindBoxEffect

### 用途

執行條件式盲盒效果。

### 輸入

* gameId
* playerId
* conditionData
* thenEffectData
* elseEffectData

### 輸出

* conditionMatched
* executedEffect
* effectResult

### 使用時機

盲盒效果包含 if / then / else 條件時使用。

---

## 14.25 getPlayerBlindBoxSpecialStates

### 用途

取得玩家目前持有的盲盒特殊狀態。

### 輸入

* gameId
* playerId

### 輸出

* specialStateList

### 使用時機

競標結算、刷新商店、玩家查看自身狀態時使用。

---

## 14.26 addPlayerBlindBoxSpecialState

### 用途

新增玩家盲盒特殊狀態。

### 輸入

* gameId
* playerId
* stateType
* stateData
* sourceBlindBoxId

### 輸出

* specialStateData

### 使用時機

盲盒給予延後觸發效果時使用。

---

## 14.27 consumePlayerBlindBoxSpecialState

### 用途

消耗玩家盲盒特殊狀態。

### 輸入

* gameId
* playerId
* stateId
* reason

### 輸出

* consumedStateData

### 使用時機

特殊狀態成功觸發後使用。

---

## 14.28 recordBlindBoxAction

### 用途

記錄盲盒相關操作。

### 輸入

* gameId
* playerId
* blindBoxId
* actionType
* actionData

### 輸出

* recordData

### 使用時機

盲盒建立、修改、刪除、開啟、效果執行、特殊狀態觸發時使用。

---

## 14.29 getBlindBoxReviewData

### 用途

取得遊戲結束後盲盒審查資料。

### 輸入

* gameId

### 輸出

* blindBoxReviewData

### 使用時機

遊戲結束後審查使用。

### 包含資料

* 所有盲盒位置
* 所有盲盒效果
* 所有開啟紀錄
* 所有效果執行結果
* 所有相關金錢變化
* 所有相關車票變化
* 所有特殊狀態觸發紀錄

---

## 14.30 filterBlindBoxDataByVisibility

### 用途

依照遊戲狀態與玩家權限過濾盲盒資料。

### 輸入

* gameId
* requesterId
* blindBoxData
* visibilityMode

### 輸出

* filteredBlindBoxData

### 使用時機

回傳盲盒資料給前端前使用。

### 主要規則

遊戲進行中玩家不可看到未開啟盲盒效果。

遊戲結束後可查看完整盲盒資料。

---

# 14.31 盲盒相關流程

---

## 14.31.1 裁判設定盲盒流程

1. createBlindBox 或 createBlindBoxBatch
2. validateBlindBoxEffect
3. validateBlindBoxSetup
4. recordBlindBoxAction

---

## 14.31.2 玩家查看盲盒流程

1. listBlindBoxes
2. filterBlindBoxDataByVisibility
3. getPublicBlindBoxInfo

---

## 14.31.3 玩家開啟盲盒流程

1. canOpenBlindBox
2. openBlindBox
3. markBlindBoxAsOpened
4. executeBlindBoxEffect
5. removeOpenedBlindBox
6. recordBlindBoxAction

---

## 14.31.4 金錢效果流程

1. executeBlindBoxEffect
2. executeMoneyEffect
3. recordBlindBoxAction

---

## 14.31.5 獲得隨機車票流程

1. executeBlindBoxEffect
2. executeRandomTicketGainEffect
3. generateRandomTicket
4. addTicketToPlayer
5. recordTicketAcquisition
6. recordBlindBoxAction

---

## 14.31.6 失去隨機車票流程

1. executeBlindBoxEffect
2. executeRandomTicketLossEffect
3. destroyTicket
4. recordBlindBoxAction

---

## 14.31.7 免費取得商店車票流程

1. executeBlindBoxEffect
2. executeFreeShopTicketEffect
3. removeGeneralShopItem
4. addTicketToPlayer
5. recordTicketAcquisition
6. recordBlindBoxAction

---

## 14.31.8 下一次競標總投標金幣流程

1. executeBlindBoxEffect
2. executeGainNextAuctionBidPoolEffect
3. addPlayerBlindBoxSpecialState
4. resolveAuction
5. applyNextAuctionBidPoolReward
6. consumePlayerBlindBoxSpecialState
7. recordBlindBoxAction

---

## 14.31.9 免費刷新商店流程

1. executeBlindBoxEffect
2. executeFreeShopRefreshEffect
3. useFreeShopRefresh
4. canRefreshGeneralShop
5. refreshGeneralShop
6. recordBlindBoxAction

---

## 14.31.10 條件式盲盒流程

1. executeBlindBoxEffect
2. evaluateBlindBoxCondition
3. executeConditionalBlindBoxEffect
4. 執行 thenEffectData 或 elseEffectData
5. recordBlindBoxAction

---

# 14.32 盲盒資料狀態建議

---

## 14.32.1 Blind Box Status

* hidden_effect
* available
* opened
* removed

---

## 14.32.2 Blind Box Effect Type

* money
* gain_random_ticket
* lose_random_ticket
* gain_shop_ticket
* gain_next_auction_bid_pool
* gain_free_shop_refresh
* conditional

---

## 14.32.3 Blind Box Special State Type

* next_auction_bid_pool_reward
* free_shop_refresh_count

---

# 14.33 必要資料集合建議

---

## 14.33.1 blind_boxes

存放盲盒資料。

建議包含：

* gameId
* locationId
* effectData
* status
* openedBy
* openedAt
* createdBy

---

## 14.33.2 blind_box_effect_logs

存放盲盒效果執行紀錄。

建議包含：

* gameId
* blindBoxId
* playerId
* effectType
* effectData
* effectResult
* createdAt

---

## 14.33.3 player_special_states

存放玩家因盲盒取得的延後觸發狀態。

建議包含：

* gameId
* playerId
* stateType
* stateData
* sourceBlindBoxId
* isConsumed
* consumedAt

---

# 14.34 需要同步更新的既有系統

---

## 14.34.1 遊戲流程系統

遊戲開始前需要加入：

* validateBlindBoxSetup

遊戲開始後需要禁止：

* createBlindBox
* updateBlindBox
* deleteBlindBox

---

## 14.34.2 玩家系統

玩家資料需要支援：

* 盲盒特殊狀態
* 免費刷新商店次數
* 下一次競標總投標金幣狀態

---

## 14.34.3 商店系統

一般商店刷新需要支援：

* 玩家使用免費刷新次數
* 免費刷新不扣錢
* 免費刷新仍遵守刷新限制

一般商店車票取得需要支援：

* 盲盒免費取得商店架上車票

---

## 14.34.4 競標系統

競標結算後需要檢查：

* 是否有玩家持有下一次競標總投標金幣狀態

若有，需執行：

* applyNextAuctionBidPoolReward

---

## 14.34.5 車票系統

車票系統需要支援：

* 盲盒隨機生成車票
* 盲盒銷毀玩家隨機車票
* 盲盒從商店轉移車票給玩家

---

## 14.34.6 紀錄系統

紀錄系統需要新增：

* recordBlindBoxAction
* blindBoxEffectLog
* playerSpecialStateLog

---

## 14.34.7 權限與可見性系統

可見性系統需要支援：

* 遊戲中公開盲盒位置
* 遊戲中隱藏未開啟盲盒效果
* 遊戲結束後公開完整盲盒資料


## 14.35 補充規則

### 車票評級

* 車票評級需支援 `normal_shop` 與 `auction` 兩種評級型態。
* 一般商店評級同時考慮時長與價格。
* 競標商店評級只考慮時長，不得使用價格。
* 車票評級分數應對應 `S / A / B / C / D / E / SHIT`。

### 一般商店優先購買權

* 一般商店刷新後需記錄優先購買權持有者、開始時間、結束時間與來源。
* 06:00 免費刷新不產生優先購買權。
* 玩家主動使用免費刷新效果時，視為主動刷新並產生優先購買權。
* 被一般商店下架的車票不得進入競標商店。

### 競標商店

* 競標商品必須是 A 或 S 長票。
* 競標商品生成時只使用基礎時長判定評級。
* 競標車票價格僅作參考，不作為購買價格。

### 遊戲流程

* 若遊戲於 06:00 開始，需同時執行 06:00 免費刷新與第一輪競標。
* 06:00 到 06:10 期間不可手動刷新一般商店。
* 第一輪競標在 06:00 開始並於 06:10 結束。

# 14. 必要資料集合建議

以下僅為資料集合名稱建議，不包含實作細節。

---

## 15.1 maps

存放地圖資料。

---

## 15.2 locations

存放地點資料。

---

## 15.3 games

存放遊戲房間與遊戲狀態。

---

## 15.4 game_players

存放玩家在指定遊戲中的狀態。

---

## 15.5 players

存放玩家基本資料。

建議包含：

* `userId`
* `authUserId`
* `displayName`
* `avatar`
* `metadata`

---

## 15.6 tickets

存放車票資料。

建議包含：

* `base_duration`
* `base_price`
* `rating_score`
* `rating_grade`
* `rating_type`

其中：

* `rating_type = normal_shop | auction`

若評級採即時計算，可不持久化 `rating_score` 與 `rating_grade`，但前後端需共用同一套計算邏輯。

---

## 15.7 player_tickets

存放玩家持有車票關係。

---

## 15.8 journeys

存放旅程資料。

---

## 15.9 shops

存放一般商店狀態。

建議包含：

* `priority_buyer_player_id`
* `priority_started_at`
* `priority_ends_at`
* `priority_source`

其中：

* `priority_source = paid_refresh | free_refresh_effect | none`

`06:00` 免費刷新時：

* `priority_buyer_player_id = null`
* `priority_started_at = null`
* `priority_ends_at = null`
* `priority_source = none`

玩家付費刷新或主動使用免費刷新效果時：

* `priority_buyer_player_id = playerId`
* `priority_started_at = refreshedAt`
* `priority_ends_at = refreshedAt + 5分鐘`
* `priority_source = paid_refresh | free_refresh_effect`

---

## 15.10 shop_items

存放一般商店上架車票。

---

## 15.11 auctions

存放競標資料。

建議包含：

* `ticket_rating_score`
* `ticket_rating_grade`
* `ticket_rating_type`

並需能判定：

* 基礎時長
* 競標長度分數
* 競標評級是否為 `A` 或 `S`

---

## 15.12 auction_bids

存放競標出價資料。

---

## 15.13 traffic_incident_requests

存放交通異常重新計算申請。

---

## 15.14 records

存放所有遊戲紀錄。

---

# 16. 核心限制總結

所有系統都必須遵守以下核心限制：

1. 玩家金錢不得小於 0。
2. 玩家不得互相轉讓或借貸金錢。
3. 車票購買時不消耗。
4. 車票建立旅程時只會預約。
5. 車票旅程開始時才會消耗。
6. 預約車票不可用於其他旅程。
7. 玩家同時只能有一個尚未開始的預約旅程。
8. 旅程開始後不可取消或修改。
9. 玩家位置只在原位置與旅程完成後目的地之間切換。
10. 系統不追蹤即時 GPS 位置。
11. 系統不驗證真實路線、班次或交通可行性。
12. 遊戲進行中不得公開其他玩家確切位置與完整路徑。
13. 遊戲結束後可查看完整紀錄供審查。
14. 玩家離線不影響已建立旅程、已開始旅程、商店與競標。
15. 所有時間事件依照現實時間與伺服器時間處理。
16. 遊戲開始後不得加入遊戲。
17. 遊戲開始後不得退出遊戲。
18. 所有玩家抵達終點後遊戲才正式結束。
19. 勝負依照實際抵達時間判定。
20. 同時抵達時以剩餘金錢較多者獲勝，仍相同則平手。







