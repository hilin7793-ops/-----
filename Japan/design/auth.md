# Japan Auth Design

本文件定義目前的 request auth 與 legacy `operatorPlayerId` 相容骨架，並記錄如何平順接到 PocketBase 正式身份驗證。

目標不是一次做完所有 auth，而是先把：

- 身份來源
- 角色判定
- request 內可用的 operator 資訊
- API 權限檢查方式

整理成一致規格，避免後續重工。

## 1. 目前狀態

目前後端已經有兩種可用的權限檢查：

- `assertGameHostAccess`
- `assertSelfAccess`

目前正式路徑已經可以透過 auth context 驗證，但 legacy 相容模式下仍可能讀到：

- `operatorPlayerId`

這代表：

1. 後端已經有權限邊界骨架
2. 正式身份來源已可走 `Authorization` + PocketBase `auth-refresh`
3. `operatorPlayerId` 與 `x-auth-user-id` 僅在明確開啟的開發相容模式下保留

## 2. 目標狀態

最終要改成：

1. 前端先用 PocketBase auth 完成登入
2. API request 自帶可信的 auth token
3. 後端從 token 還原 `authUser`
4. 後端再把 `authUser` 對應到本系統 `player`
5. 權限檢查不再信任 body/query 的 `operatorPlayerId`

## 3. 建議身份模型

建議保留兩層身份：

### 3.1 PocketBase auth user

用途：

- 登入身份
- token 來源
- session 管理

建議 collection：

- PocketBase 內建 auth collection，或獨立 `users`

### 3.2 Game player

用途：

- 遊戲內玩家資料
- 金錢、票券、旅程、位置

目前已存在 collection：

- `players`

## 4. 建議資料對應

建議在 `players` collection 中，明確保存 auth 關聯欄位，例如：

- `authUserId`

建議規則：

1. 一個 auth user 對應一個 `players` 記錄
2. API 驗證完成後，先找到 `authUserId -> playerId`
3. 後續所有 `player-self` / `host` 權限判定都以這個 `playerId` 為準

## 5. 建議 request 驗證流程

每次 API request 建議流程如下：

1. 從 `Authorization` header 取得 PocketBase token
2. 驗證 token
3. 取得 `authUser`
4. 用 `authUser.id` 查 `players.authUserId`
5. 建立 request context

建議 request context 內容：

```js
{
  authUserId: "...",
  playerId: "...",
  roleSet: ["player"],
}
```

若未登入：

```js
{
  authUserId: null,
  playerId: null,
  roleSet: [],
}
```

## 6. 權限判定規則

### 6.1 `public`

可未登入。

### 6.2 `player-self`

條件：

- request context 必須有 `playerId`
- `playerId === targetPlayerId`

### 6.3 `host`

條件：

- request context 必須有 `playerId`
- 該玩家必須等於 `games.hostPlayerId`

### 6.4 未來可擴充角色

後續可加：

- `admin`
- `referee`
- `observer`

但這一輪先不做。

## 7. 對目前骨架的替換策略

目前已進入過渡收斂期：

- `Authorization` token 會優先進入正式驗證流程
- `x-auth-user-id` 與 `operatorPlayerId` 只在明確開啟的開發相容模式下保留
- production / strict 模式下可關閉這兩種 fallback

## 8. 後端實作建議

建議新增以下模組：

### 8.1 `src/services/auth/requestAuthService.js`

用途：

- 解析 request token
- 還原 auth user
- 查 player 對應

建議介面：

```js
async function resolveRequestAuthContext({ request, dataAccessLayer })
```

### 8.2 `src/services/auth/accessControlService.js`

目前已存在。

後續調整方向：

- `assertSelfAccess` 改吃 `authContext`
- `assertGameHostAccess` 改吃 `authContext`

例如：

```js
await assertSelfAccess({
  authContext,
  targetPlayerId,
})
```

### 8.3 `src/api/createAppServer.js`

後續建議在 route handler 執行前先建立：

```js
const authContext = await resolveRequestAuthContext({ request, dataAccessLayer })
```

再把 `authContext` 傳進 handler。

## 9. PocketBase adapter 調整建議

目前 `createPocketBaseRestAdapter` 主要使用 admin auth / auth token。

後續 auth 接軌要注意兩件事：

1. 系統資料層仍可保留 server-side admin token
2. 使用者登入驗證不應混成同一個 token 流程

也就是：

- `dataAccessLayer`：系統端資料讀寫
- `request auth`：玩家登入身份驗證

兩者要分離。

不要把玩家 token 直接拿來當整個 dataAccessLayer 的管理權限。

## 10. 與前端的契約

前端接上正式 auth 後，應改成：

1. 先登入 PocketBase
2. 保存 auth token
3. 呼叫 API 時附上 `Authorization`
4. 不再依賴 `operatorPlayerId`

前端仍可保存 `playerId` 作為 UI 狀態，但不應把它當成權限依據。

## 11. 過渡期建議

過渡期建議保留：

- `operatorPlayerId`
- `Authorization`

但以環境控制：

- `development`：允許 fallback
- `production`：禁止 fallback

## 12. 建議實作順序

1. 在 `players` schema 補 `authUserId`
2. 新增 `requestAuthService`
3. 在 `createAppServer` 建立 `authContext`
4. 改寫 `assertSelfAccess` / `assertGameHostAccess` 讓它們優先吃 `authContext`
5. 保留 `operatorPlayerId` 作為 dev fallback
6. 更新 smoke test 為可切換模式
7. 最後移除 production 對 `operatorPlayerId` 的依賴

## 13. 目前已完成到哪裡

截至目前，階段 1 已完成以下內容：

- `players` schema draft 已補 `authUserId`
- 已新增 `src/services/auth/requestAuthService.js`
- `createAppServer` 已會在 route handler 前建立 `authContext`
- `assertSelfAccess` / `assertGameHostAccess` 已優先使用 `authContext.playerId`
- 若無 auth context，仍允許 fallback 到 `operatorPlayerId`

目前仍未完成：

- 更完整的前端登入 / 登出 / token 刷新流程
- 更完整的 auth / permission 拒絕案例測試
- 若要完全移除相容模式，仍需逐步清掉所有舊式 query/body 依賴

## 14. 目前的 token 驗證過渡規則

目前 server 端已支援三種 auth 來源：

1. `Authorization: Bearer ...`
2. `x-auth-user-id`
3. `operatorPlayerId`

目前行為：

- 若設定 `POCKETBASE_AUTH_COLLECTION`，後端會嘗試呼叫 PocketBase `auth-refresh` 驗證 bearer token
- 驗證成功後，會使用回傳的 auth record id 對應 `players.authUserId`
- 若未設定 auth collection，或驗證失敗，開發期仍可用 `x-auth-user-id`
- `operatorPlayerId` 只在明確開啟的相容模式下作為最後 fallback

這表示目前已進入「可接真 token，但仍保留 dev bridge」的過渡階段。

## 15. 建議的 PocketBase auth collection

目前專案採用的建議 auth collection 為：

- `users`

用途：

- PocketBase 密碼登入
- bearer token 發放
- 後端透過 `auth-refresh` 驗證 token
- 再以 `users.id -> players.authUserId` 對應遊戲玩家

目前已補：

- `POST /auth/login`
- `users` auth collection migration
- `pocketbase-auth-smoke-test.js`
