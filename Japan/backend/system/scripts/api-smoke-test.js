import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import { createAppServer } from "../src/api/createAppServer.js";
import { TransportType } from "../src/index.js";

async function main() {
  process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK ??= "1";
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK ??= "1";
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });
  const server = createAppServer({ dataAccessLayer });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(8788, "127.0.0.1", resolve);
  });

  try {
    const healthResponse = await fetch("http://127.0.0.1:8788/health");
    const healthPayload = await healthResponse.json();
    console.log("health", healthPayload.success);

    const createMapResponse = await fetch("http://127.0.0.1:8788/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapName: "API Smoke Map",
        description: "API smoke test map",
        countryOrRegion: "Japan",
        availableTransportTypes: [
          TransportType.LOCAL_TRAIN,
        ],
        customRules: {},
      }),
    });
    const createMapPayload = await createMapResponse.json();
    console.log("createMap", Boolean(createMapPayload.data?.id));
    const mapId = createMapPayload.data.id;

    const getMapResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}`);
    const getMapPayload = await getMapResponse.json();
    console.log("getMap", getMapPayload.data?.id === mapId);

    const updateMapResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapName: "API Smoke Map Updated",
        description: "updated map",
      }),
    });
    const updateMapPayload = await updateMapResponse.json();
    console.log("updateMap", updateMapPayload.data?.name === "API Smoke Map Updated");

    const createPlayerResponse = await fetch("http://127.0.0.1:8788/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "api-smoke-player",
        authUserId: "auth-api-smoke-player",
        displayName: "API Smoke Player",
      }),
    });
    const createPlayerPayload = await createPlayerResponse.json();
    console.log("createPlayer", Boolean(createPlayerPayload.data?.id));

    const sortedMapsResponse = await fetch("http://127.0.0.1:8788/maps?sortBy=name&sortDirection=desc&limit=1");
    const sortedMapsPayload = await sortedMapsResponse.json();
    console.log("listMapsQueryOptions", Array.isArray(sortedMapsPayload.mapList) && sortedMapsPayload.mapList.length === 1);
    assert.equal(Array.isArray(sortedMapsPayload.mapList), true);
    assert.equal(sortedMapsPayload.mapList.length, 1);

    const playerId = createPlayerPayload.data.id;

    const anonymousSessionResponse = await fetch("http://127.0.0.1:8788/auth/session");
    const anonymousSessionPayload = await anonymousSessionResponse.json();
    console.log("authSessionAnonymous", anonymousSessionPayload.data?.playerId === null && anonymousSessionPayload.data?.source === "anonymous");

    const mappedSessionResponse = await fetch("http://127.0.0.1:8788/auth/session", {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const mappedSessionPayload = await mappedSessionResponse.json();
    console.log("authSessionMapped", mappedSessionPayload.data?.playerId === playerId && mappedSessionPayload.data?.source === "dev_auth_user_mapping");

    const fallbackSessionResponse = await fetch(`http://127.0.0.1:8788/auth/session?operatorPlayerId=${playerId}`);
    const fallbackSessionPayload = await fallbackSessionResponse.json();
    console.log("authSessionFallback", fallbackSessionPayload.data?.playerId === playerId && fallbackSessionPayload.data?.usedOperatorFallback === true);

    const addStartLocationResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationName: "Tokyo",
        locationType: "city",
        metadata: {},
      }),
    });
    const addStartLocationPayload = await addStartLocationResponse.json();
    console.log("addStartLocation", Boolean(addStartLocationPayload.data?.id));

    const updateStartLocationResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations/${addStartLocationPayload.data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationName: "Tokyo Updated",
      }),
    });
    const updateStartLocationPayload = await updateStartLocationResponse.json();
    console.log("updateLocation", updateStartLocationPayload.data?.name === "Tokyo Updated");

    const addGoalLocationResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationName: "Osaka",
        locationType: "city",
        metadata: {},
      }),
    });
    const addGoalLocationPayload = await addGoalLocationResponse.json();
    console.log("addGoalLocation", Boolean(addGoalLocationPayload.data?.id));

    const filteredLocationsResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations?locationType=city&locationName=Tokyo Updated`);
    const filteredLocationsPayload = await filteredLocationsResponse.json();
    console.log("locationFilters", Array.isArray(filteredLocationsPayload.locationList ?? filteredLocationsPayload.data?.locationList));
    assert.equal(Array.isArray(filteredLocationsPayload.locationList ?? filteredLocationsPayload.data?.locationList), true);
    assert.equal((filteredLocationsPayload.locationList ?? filteredLocationsPayload.data?.locationList).length >= 1, true);

    const tempLocationResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationName: "Temp Delete",
        locationType: "city",
        metadata: {},
      }),
    });
    const tempLocationPayload = await tempLocationResponse.json();

    const deleteTempLocationResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}/locations/${tempLocationPayload.data.id}`, {
      method: "DELETE",
    });
    const deleteTempLocationPayload = await deleteTempLocationResponse.json();
    console.log("removeLocation", deleteTempLocationPayload.data?.success === true);

    await fetch(`http://127.0.0.1:8788/maps/${mapId}/start-location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: addStartLocationPayload.data.id }),
    });
    await fetch(`http://127.0.0.1:8788/maps/${mapId}/goal-location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: addGoalLocationPayload.data.id }),
    });

    const filteredMapsResponse = await fetch("http://127.0.0.1:8788/maps?countryOrRegion=Japan&hasStartLocation=true&hasGoalLocation=true");
    const filteredMapsPayload = await filteredMapsResponse.json();
    console.log("mapFilters", Array.isArray(filteredMapsPayload.data?.mapList) && filteredMapsPayload.data.mapList.some((item) => item.id === mapId));
    assert.equal(Array.isArray(filteredMapsPayload.data?.mapList), true);
    assert.equal(filteredMapsPayload.data.mapList.some((item) => item.id === mapId), true);
    assert.equal(filteredMapsPayload.data.mapList.length >= 1, true);

    const createGameResponse = await fetch("http://127.0.0.1:8788/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": "auth-api-smoke-player",
      },
      body: JSON.stringify({
        name: "API Smoke Game",
        hostPlayerId: playerId,
        operatorPlayerId: playerId,
        mapId,
        startLocationId: addStartLocationPayload.data.id,
        goalLocationId: addGoalLocationPayload.data.id,
        initialMoney: 10000,
        gameSettings: {},
      }),
    });
    const createGamePayload = await createGameResponse.json();
    console.log("createGame", Boolean(createGamePayload.data?.id));

    const gameId = createGamePayload.data.id;

    const anonymousGameAccessResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/access`);
    const anonymousGameAccessPayload = await anonymousGameAccessResponse.json();
    console.log("gameAccessAnonymous", anonymousGameAccessPayload.data?.isAuthenticated === false && anonymousGameAccessPayload.data?.isHost === false);
    assert.equal(anonymousGameAccessPayload.data?.isAuthenticated, false);
    assert.equal(anonymousGameAccessPayload.data?.isHost, false);
    assert.equal(anonymousGameAccessPayload.data?.canObserveGame, false);
    assert.equal(anonymousGameAccessPayload.data?.canReviewGame, false);
    assert.equal(anonymousGameAccessPayload.data?.canManageGame, false);

    const joinGameResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-user-id": "auth-api-smoke-player",
      },
      body: JSON.stringify({ playerId, operatorPlayerId: playerId }),
    });
    const joinGamePayload = await joinGameResponse.json();
    console.log("joinGame", Boolean(joinGamePayload.data?.id));

    const mappedGameAccessResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/access?targetPlayerId=${playerId}`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const mappedGameAccessPayload = await mappedGameAccessResponse.json();
    console.log("gameAccessMapped", mappedGameAccessPayload.data?.isAuthenticated === true && mappedGameAccessPayload.data?.isHost === true && mappedGameAccessPayload.data?.canAccessTargetPlayerSelfData === true);
    assert.equal(mappedGameAccessPayload.data?.canObserveGame, true);
    assert.equal(mappedGameAccessPayload.data?.canReviewGame, true);
    assert.equal(mappedGameAccessPayload.data?.canManageGame, true);

    const fallbackGameAccessResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/access?operatorPlayerId=${playerId}&targetPlayerId=${playerId}`);
    const fallbackGameAccessPayload = await fallbackGameAccessResponse.json();
    console.log("gameAccessFallback", fallbackGameAccessPayload.data?.usedOperatorFallback === true && fallbackGameAccessPayload.data?.isJoinedGame === true);
    assert.equal(fallbackGameAccessPayload.data?.usedOperatorFallback, true);
    assert.equal(fallbackGameAccessPayload.data?.isJoinedGame, true);
    assert.equal(fallbackGameAccessPayload.data?.canObserveGame, true);
    assert.equal(fallbackGameAccessPayload.data?.canReviewGame, true);

    const initializeShopResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/general-shop/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, operatorPlayerId: playerId }),
    });
    const initializeShopPayload = await initializeShopResponse.json();
    console.log("initializeShop", Boolean(initializeShopPayload.data?.id));

    const refreshShopResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/general-shop/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        operatorPlayerId: playerId,
        refreshType: "manual",
        currentTime: "2026-07-09T06:10:00+08:00",
        playerCount: 1,
        mapId,
        availableTransportTypes: [
          TransportType.LOCAL_TRAIN,
        ],
      }),
    });
    const refreshShopPayload = await refreshShopResponse.json();
    console.log("refreshShop", refreshShopPayload.data?.newShopTicketList?.length ?? 0);

    const listShopItemsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/general-shop/items`);
    const listShopItemsPayload = await listShopItemsResponse.json();
    console.log("listShopItems", listShopItemsPayload.data?.shopTicketList?.length ?? 0);
    console.log("shopPriorityState", typeof listShopItemsPayload.data?.priorityState?.prioritySource === "string");
    console.log("shopTicketRating", typeof listShopItemsPayload.data?.shopTicketList?.[0]?.ticket?.ratingType === "string");
    console.log("shopItemPriorityAccess", typeof listShopItemsPayload.data?.shopTicketList?.[0]?.priorityAccess?.prioritySource === "string");
    const shopTicketList = listShopItemsPayload.data?.shopTicketList ?? [];

    const purchasableShopItem = shopTicketList.find(
      (item) => item.price <= 5000,
    ) ?? shopTicketList.find((item) => item.ticket?.price <= 5000)
      ?? shopTicketList[0];

    let purchasedShopTicketId = null;
    if (purchasableShopItem && purchasableShopItem.price <= 5000) {
      const purchaseShopTicketResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/general-shop/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          operatorPlayerId: playerId,
          shopItemId: purchasableShopItem.shopItemId ?? purchasableShopItem.id,
          currentTime: "2026-07-09T06:11:00+08:00",
        }),
      });
      const purchaseShopTicketPayload = await purchaseShopTicketResponse.json();
      purchasedShopTicketId = purchaseShopTicketPayload.data?.purchasedTicket?.id ?? null;
    }
    console.log("purchaseShopTicket", purchasedShopTicketId ? "purchased" : "skipped");

    const rankingResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/ranking`);
    const rankingPayload = await rankingResponse.json();
    console.log("ranking", rankingPayload.data?.ranking?.length ?? 0);

    const anonymousLocationResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/location`);
    const anonymousLocationPayload = await anonymousLocationResponse.json();
    console.log("playerLocationAnonymousHidden", anonymousLocationPayload.data?.locationId === null);

    const selfLocationResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/location`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const selfLocationPayload = await selfLocationResponse.json();
    console.log("playerLocationSelfVisible", selfLocationPayload.data?.locationId === addStartLocationPayload.data.id);

    const moneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/money?operatorPlayerId=${playerId}`);
    const moneyPayload = await moneyResponse.json();
    console.log("playerMoney", moneyPayload.data?.money ?? -1);

    const updatePlayerProfileResponse = await fetch(`http://127.0.0.1:8788/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        displayName: "API Smoke Player Updated",
        avatar: "avatar-smoke.png",
        metadata: {
          source: "api_smoke_test",
        },
      }),
    });
    const updatePlayerProfilePayload = await updatePlayerProfileResponse.json();
    console.log("updatePlayerProfile", updatePlayerProfilePayload.data?.displayName === "API Smoke Player Updated");

    const overviewResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/overview?currentTime=2026-07-09T06:35:00%2B08:00&operatorPlayerId=${playerId}`);
    const overviewPayload = await overviewResponse.json();
    console.log("overviewGame", Boolean(overviewPayload.data?.overview?.game?.id));
    console.log("overviewPlayers", Array.isArray(overviewPayload.data?.overview?.playerList));
    console.log("overviewShopItems", Array.isArray(overviewPayload.data?.overview?.generalShopItemList));
    console.log("overviewShopItemRating", typeof overviewPayload.data?.overview?.generalShopItemList?.[0]?.ticket?.ratingType === "string");
    console.log("overviewShopItemPriority", typeof overviewPayload.data?.overview?.generalShopItemList?.[0]?.priorityAccess?.prioritySource === "string");
    console.log("overviewJourneyDashboard", typeof overviewPayload.data?.overview?.journeyDashboard?.summary?.totalJourneyCount === "number");
    assert.equal(Boolean(overviewPayload.data?.overview?.game?.id), true);
    assert.equal(Array.isArray(overviewPayload.data?.overview?.playerList), true);
    assert.equal(Array.isArray(overviewPayload.data?.overview?.generalShopItemList), true);
    assert.equal(typeof overviewPayload.data?.overview?.generalShopItemList?.[0]?.ticket?.ratingType === "string", true);
    assert.equal(typeof overviewPayload.data?.overview?.generalShopItemList?.[0]?.priorityAccess?.prioritySource === "string", true);
    assert.equal(typeof overviewPayload.data?.overview?.journeyDashboard?.summary?.totalJourneyCount === "number", true);

    const checklistResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/checklist?currentTime=2026-07-09T06:35:00%2B08:00&operatorPlayerId=${playerId}`);
    const checklistPayload = await checklistResponse.json();
    console.log("checklistData", Boolean(checklistPayload.data?.checklist?.summary));
    console.log("checklistIncidents", Array.isArray(checklistPayload.data?.checklist?.pendingTrafficIncidentRequestList));
    assert.equal(Boolean(checklistPayload.data?.checklist?.summary), true);
    assert.equal(Array.isArray(checklistPayload.data?.checklist?.pendingTrafficIncidentRequestList), true);
    assert.equal(typeof checklistPayload.data?.checklist?.summary?.totalJourneyCount === "number", true);
    assert.equal(typeof checklistPayload.data?.checklist?.summary?.pendingTrafficIncidentCount === "number", true);
    assert.equal(typeof checklistPayload.data?.checklist?.summary?.dueToStartCount === "number", true);

    const forbiddenChecklistResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/checklist?currentTime=2026-07-09T06:35:00%2B08:00&operatorPlayerId=not-host`);
    const forbiddenChecklistPayload = await forbiddenChecklistResponse.json();
    console.log("hostAccessGuard", forbiddenChecklistPayload.success === false && forbiddenChecklistPayload.errorCode === "FORBIDDEN");
    assert.equal(forbiddenChecklistPayload.success, false);
    assert.equal(forbiddenChecklistPayload.errorCode, "FORBIDDEN");

    const trafficIncidentListResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents?operatorPlayerId=${playerId}`);
    const trafficIncidentListPayload = await trafficIncidentListResponse.json();
    console.log("trafficIncidentList", Array.isArray(trafficIncidentListPayload.requestList ?? trafficIncidentListPayload.data?.requestList));
    assert.equal(Array.isArray(trafficIncidentListPayload.requestList ?? trafficIncidentListPayload.data?.requestList), true);

    const processChecklistResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/checklist/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentTime: "2026-07-09T06:35:00+08:00",
        operatorPlayerId: playerId,
      }),
    });
    const processChecklistPayload = await processChecklistResponse.json();
    console.log("processChecklist", Boolean(processChecklistPayload.data?.checklistBefore) && Boolean(processChecklistPayload.data?.checklistAfter));
    assert.equal(Boolean(processChecklistPayload.data?.checklistBefore), true);
    assert.equal(Boolean(processChecklistPayload.data?.checklistAfter), true);
    assert.equal(typeof processChecklistPayload.data?.checklistBefore?.summary?.totalJourneyCount === "number", true);
    assert.equal(typeof processChecklistPayload.data?.checklistAfter?.summary?.totalJourneyCount === "number", true);

    const playerRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/records?operatorPlayerId=${playerId}`);
    const playerRecordsPayload = await playerRecordsResponse.json();
    console.log("playerRecords", Array.isArray(playerRecordsPayload.data?.recordList));
    assert.equal(Array.isArray(playerRecordsPayload.data?.recordList), true);
    assert.equal(playerRecordsPayload.data?.recordList.length >= 1, true);

    const playerRecordsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/records?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const playerRecordsQueryPayload = await playerRecordsQueryResponse.json();
    console.log("playerRecordsQueryOptions", Array.isArray(playerRecordsQueryPayload.data?.recordList) && playerRecordsQueryPayload.data.recordList.length <= 1);
    assert.equal(Array.isArray(playerRecordsQueryPayload.data?.recordList), true);
    assert.equal(playerRecordsQueryPayload.data?.recordList.length <= 1, true);

    const forbiddenPlayerRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/records?operatorPlayerId=not-player`);
    const forbiddenPlayerRecordsPayload = await forbiddenPlayerRecordsResponse.json();
    console.log("playerAccessGuard", forbiddenPlayerRecordsPayload.success === false && forbiddenPlayerRecordsPayload.errorCode === "FORBIDDEN");

    const forbiddenUpdatePlayerResponse = await fetch(`http://127.0.0.1:8788/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: "not-player",
        displayName: "should fail",
      }),
    });
    const forbiddenUpdatePlayerPayload = await forbiddenUpdatePlayerResponse.json();
    console.log("playerProfileAccessGuard", forbiddenUpdatePlayerPayload.success === false && forbiddenUpdatePlayerPayload.errorCode === "FORBIDDEN");

    const specialStatesResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/special-states?operatorPlayerId=${playerId}`);
    const specialStatesPayload = await specialStatesResponse.json();
    console.log("specialStates", Array.isArray(specialStatesPayload.specialStateList ?? specialStatesPayload.data?.specialStateList));
    assert.equal(Array.isArray(specialStatesPayload.specialStateList ?? specialStatesPayload.data?.specialStateList), true);

    const specialStatesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/special-states?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const specialStatesQueryPayload = await specialStatesQueryResponse.json();
    const specialStatesFilteredResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/special-states?operatorPlayerId=${playerId}&stateType=free_shop_refresh_count&createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
    const specialStatesFilteredPayload = await specialStatesFilteredResponse.json();
    console.log(
      "specialStatesQueryOptions",
      Array.isArray(specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList)
        && (specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList).length <= 1,
    );
    console.log("specialStatesFilters", Array.isArray(specialStatesFilteredPayload.specialStateList ?? specialStatesFilteredPayload.data?.specialStateList));
    assert.equal(Array.isArray(specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList), true);
    assert.equal((specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList).length <= 1, true);
    assert.equal(Array.isArray(specialStatesFilteredPayload.specialStateList ?? specialStatesFilteredPayload.data?.specialStateList), true);
    assert.equal((specialStatesFilteredPayload.specialStateList ?? specialStatesFilteredPayload.data?.specialStateList).length >= 1, true);
    assert.equal((specialStatesFilteredPayload.specialStateList ?? specialStatesFilteredPayload.data?.specialStateList).every((entry) => entry.stateType === "free_shop_refresh_count"), true);

    const createFreeJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        operatorPlayerId: playerId,
        fromLocationId: addStartLocationPayload.data.id,
        toLocationId: addGoalLocationPayload.data.id,
        transportType: TransportType.WALKING,
        ticketIdList: [],
        departureTime: "2026-07-09T07:10:00+08:00",
        arrivalTime: "2026-07-09T07:30:00+08:00",
        currentTime: "2026-07-09T06:20:00+08:00",
        metadata: {
          source: "api_smoke_test",
        },
      }),
    });
    const createFreeJourneyPayload = await createFreeJourneyResponse.json();
    const reservedJourneyId = createFreeJourneyPayload.data?.id ?? null;
    console.log("createJourney", Boolean(reservedJourneyId));

    const batchCancelJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/cancel-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        cancelledBy: playerId,
        journeyIdList: [reservedJourneyId],
        reason: "host_batch_cleanup",
      }),
    });
    const batchCancelJourneyPayload = await batchCancelJourneyResponse.json();
    console.log("cancelJourneyBatch", batchCancelJourneyPayload.data?.cancelledCount === 1);

    const reservedJourneyAfterCancelResponse = await fetch(`http://127.0.0.1:8788/journeys/${reservedJourneyId}`);
    const reservedJourneyAfterCancelPayload = await reservedJourneyAfterCancelResponse.json();
    console.log("cancelJourneyBatchState", reservedJourneyAfterCancelPayload.data?.status === "cancelled");

    const hostJourneysResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys?operatorPlayerId=${playerId}&status=cancelled&sortBy=departureTime&sortDirection=desc&limit=5`);
    const hostJourneysPayload = await hostJourneysResponse.json();
    console.log("hostJourneyList", Array.isArray(hostJourneysPayload.journeyList));
    console.log("hostJourneyListQueryOptions", (hostJourneysPayload.journeyList?.length ?? 0) <= 5);
    console.log("hostJourneyListFilter", hostJourneysPayload.journeyList?.some((item) => item.id === reservedJourneyId && item.status === "cancelled") === true);
    assert.equal(Array.isArray(hostJourneysPayload.journeyList), true);
    assert.equal((hostJourneysPayload.journeyList?.length ?? 0) <= 5, true);
    assert.equal(hostJourneysPayload.journeyList?.some((item) => item.id === reservedJourneyId && item.status === "cancelled") === true, true);
    const lockedJourneyFilterResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys?operatorPlayerId=${playerId}&isLocked=false&status=cancelled&limit=5`);
    const lockedJourneyFilterPayload = await lockedJourneyFilterResponse.json();
    console.log("journeyFilters", Array.isArray(lockedJourneyFilterPayload.journeyList) && lockedJourneyFilterPayload.journeyList.some((item) => item.status === "cancelled"));
    assert.equal(Array.isArray(lockedJourneyFilterPayload.journeyList), true);
    assert.equal(lockedJourneyFilterPayload.journeyList.some((item) => item.status === "cancelled"), true);
    const journeyDateFilterResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys?operatorPlayerId=${playerId}&departureAfter=2026-07-09T00:00:00%2B08:00&arrivalBefore=2026-07-10T23:59:59%2B08:00`);
    const journeyDateFilterPayload = await journeyDateFilterResponse.json();
    console.log("journeyDateFilters", Array.isArray(journeyDateFilterPayload.journeyList));
    assert.equal(Array.isArray(journeyDateFilterPayload.journeyList), true);
    assert.equal(journeyDateFilterPayload.journeyList.length >= 1, true);

    const hostJourneySummaryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/summary?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00`);
    const hostJourneySummaryPayload = await hostJourneySummaryResponse.json();
    console.log("hostJourneySummary", hostJourneySummaryPayload.success === true && typeof hostJourneySummaryPayload.data?.totalJourneyCount === "number");
    console.log("hostJourneySummaryCancelled", (hostJourneySummaryPayload.data?.statusCounts?.cancelled ?? 0) >= 1);
    console.log("hostJourneySummaryDueToStart", (hostJourneySummaryPayload.data?.dueToStartCount ?? 0) >= 0);
    assert.equal(hostJourneySummaryResponse.ok, true);
    assert.equal(typeof hostJourneySummaryPayload.data?.totalJourneyCount === "number", true);
    assert.equal(typeof hostJourneySummaryPayload.data?.statusCounts?.cancelled === "number", true);
    assert.equal(typeof hostJourneySummaryPayload.data?.dueToStartCount === "number", true);
    assert.equal((hostJourneySummaryPayload.data?.statusCounts?.cancelled ?? 0) >= 1, true);
    assert.equal((hostJourneySummaryPayload.data?.dueToStartCount ?? 0) >= 0, true);

    const createExceptionJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        operatorPlayerId: playerId,
        fromLocationId: addStartLocationPayload.data.id,
        toLocationId: addGoalLocationPayload.data.id,
        transportType: TransportType.WALKING,
        ticketIdList: [],
        departureTime: "2026-07-09T07:00:00+08:00",
        arrivalTime: "2026-07-09T07:25:00+08:00",
        currentTime: "2026-07-09T06:20:00+08:00",
        metadata: {
          source: "api_smoke_test_exception_list",
        },
      }),
    });
    const createExceptionJourneyPayload = await createExceptionJourneyResponse.json();
    const exceptionJourneyId = createExceptionJourneyPayload.data?.id ?? null;
    console.log("createExceptionJourney", Boolean(exceptionJourneyId));

    const hostJourneyExceptionsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/exceptions?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00&sortBy=departureTime&sortDirection=asc&limit=10`);
    const hostJourneyExceptionsPayload = await hostJourneyExceptionsResponse.json();
    console.log("hostJourneyExceptions", Array.isArray(hostJourneyExceptionsPayload.data?.exceptionJourneyList));
    console.log("hostJourneyExceptionsFilter", hostJourneyExceptionsPayload.data?.exceptionJourneyList?.some((item) => item.id === exceptionJourneyId && item.exceptionReasonList?.includes("due_to_start")) === true);
    assert.equal(hostJourneyExceptionsResponse.ok, true);
    assert.equal(Array.isArray(hostJourneyExceptionsPayload.data?.exceptionJourneyList), true);
    assert.equal(hostJourneyExceptionsPayload.data?.exceptionJourneyList?.some((item) => item.id === exceptionJourneyId && item.exceptionReasonList?.includes("due_to_start")) === true, true);

    const hostJourneyActionQueueResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/action-queue?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00&sortBy=departureTime&sortDirection=asc&limit=10`);
    const hostJourneyActionQueuePayload = await hostJourneyActionQueueResponse.json();
    console.log("hostJourneyActionQueue", Array.isArray(hostJourneyActionQueuePayload.data?.actionQueue));
    console.log("hostJourneyActionQueueAction", hostJourneyActionQueuePayload.data?.actionQueue?.some((item) => item.journeyId === exceptionJourneyId && item.suggestedActionList?.includes("start_journey")) === true);
    assert.equal(hostJourneyActionQueueResponse.ok, true);
    assert.equal(Array.isArray(hostJourneyActionQueuePayload.data?.actionQueue), true);
    assert.equal(hostJourneyActionQueuePayload.data?.actionQueue?.some((item) => item.journeyId === exceptionJourneyId && item.suggestedActionList?.includes("start_journey")) === true, true);

    const hostJourneyDashboardResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/dashboard?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00`);
    const hostJourneyDashboardPayload = await hostJourneyDashboardResponse.json();
    console.log("hostJourneyDashboard", hostJourneyDashboardPayload.success === true && typeof hostJourneyDashboardPayload.data?.dashboard?.summary?.totalJourneyCount === "number");
    console.log("hostJourneyDashboardExceptions", Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.exceptionJourneyList));
    console.log("hostJourneyDashboardActionQueue", Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.actionQueue));
    assert.equal(hostJourneyDashboardResponse.ok, true);
    assert.equal(typeof hostJourneyDashboardPayload.data?.dashboard?.summary?.totalJourneyCount === "number", true);
    assert.equal(Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.exceptionJourneyList), true);
    assert.equal(Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.actionQueue), true);
    assert.equal(hostJourneyDashboardPayload.data?.dashboard?.summary?.totalJourneyCount >= 1, true);

    const cleanupExceptionJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/cancel-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        cancelledBy: playerId,
        journeyIdList: [exceptionJourneyId],
        reason: "cleanup_exception_reserved_journey",
      }),
    });
    const cleanupExceptionJourneyPayload = await cleanupExceptionJourneyResponse.json();
    console.log("cleanupExceptionJourney", cleanupExceptionJourneyPayload.data?.cancelledCount === 1);
    assert.equal(cleanupExceptionJourneyResponse.ok, true);
    assert.equal(cleanupExceptionJourneyPayload.data?.cancelledCount === 1, true);
    assert.equal(Array.isArray(cleanupExceptionJourneyPayload.data?.resultList), true);

    const createLockedJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        operatorPlayerId: playerId,
        fromLocationId: addStartLocationPayload.data.id,
        toLocationId: addGoalLocationPayload.data.id,
        transportType: TransportType.WALKING,
        ticketIdList: [],
        departureTime: "2026-07-09T07:40:00+08:00",
        arrivalTime: "2026-07-09T08:00:00+08:00",
        currentTime: "2026-07-09T06:20:00+08:00",
        metadata: {
          source: "api_smoke_test_lock_batch",
        },
      }),
    });
    const createLockedJourneyPayload = await createLockedJourneyResponse.json();
    const lockedJourneyId = createLockedJourneyPayload.data?.id ?? null;
    console.log("createLockTargetJourney", Boolean(lockedJourneyId));

    const lockJourneyBatchResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/lock-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        lockedBy: playerId,
        journeyIdList: [lockedJourneyId],
        reason: "host_review_lock",
      }),
    });
    const lockJourneyBatchPayload = await lockJourneyBatchResponse.json();
    console.log("lockJourneyBatch", lockJourneyBatchPayload.data?.lockedCount === 1);
    assert.equal(lockJourneyBatchResponse.ok, true);
    assert.equal(lockJourneyBatchPayload.data?.lockedCount === 1, true);
    assert.equal(Array.isArray(lockJourneyBatchPayload.data?.resultList), true);

    const lockedJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${lockedJourneyId}`);
    const lockedJourneyPayload = await lockedJourneyResponse.json();
    console.log("lockJourneyBatchState", lockedJourneyPayload.data?.isLocked === true);

    const updateLockedJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${lockedJourneyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        operatorPlayerId: playerId,
        fromLocationId: addStartLocationPayload.data.id,
        toLocationId: addGoalLocationPayload.data.id,
        transportType: TransportType.WALKING,
        ticketIdList: [],
        departureTime: "2026-07-09T07:41:00+08:00",
        arrivalTime: "2026-07-09T08:01:00+08:00",
        currentTime: "2026-07-09T06:20:00+08:00",
        metadata: {
          source: "should_fail_when_locked",
        },
      }),
    });
    const updateLockedJourneyPayload = await updateLockedJourneyResponse.json();
    console.log("lockJourneyPreventsUpdate", updateLockedJourneyPayload.success === false && updateLockedJourneyPayload.message === "Journey is not editable");

    const unlockJourneyBatchResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/unlock-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        unlockedBy: playerId,
        journeyIdList: [lockedJourneyId],
        reason: "host_review_unlock",
      }),
    });
    const unlockJourneyBatchPayload = await unlockJourneyBatchResponse.json();
    console.log("unlockJourneyBatch", unlockJourneyBatchPayload.data?.unlockedCount === 1);
    assert.equal(unlockJourneyBatchResponse.ok, true);
    assert.equal(unlockJourneyBatchPayload.data?.unlockedCount === 1, true);
    assert.equal(Array.isArray(unlockJourneyBatchPayload.data?.resultList), true);

    const unlockedJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${lockedJourneyId}`);
    const unlockedJourneyPayload = await unlockedJourneyResponse.json();
    console.log("unlockJourneyBatchState", unlockedJourneyPayload.data?.isLocked === false);

    const updateUnlockedJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${lockedJourneyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        operatorPlayerId: playerId,
        fromLocationId: addStartLocationPayload.data.id,
        toLocationId: addGoalLocationPayload.data.id,
        transportType: TransportType.WALKING,
        ticketIdList: [],
        departureTime: "2026-07-09T07:41:00+08:00",
        arrivalTime: "2026-07-09T08:01:00+08:00",
        currentTime: "2026-07-09T06:20:00+08:00",
        metadata: {
          source: "updated_after_unlock",
        },
      }),
    });
    const updateUnlockedJourneyPayload = await updateUnlockedJourneyResponse.json();
    console.log("unlockJourneyRestoresUpdate", updateUnlockedJourneyPayload.success === true && updateUnlockedJourneyPayload.data?.metadata?.source === "updated_after_unlock");

    const cleanupLockedJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/cancel-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        cancelledBy: playerId,
        journeyIdList: [lockedJourneyId],
        reason: "cleanup_locked_reserved_journey",
      }),
    });
    const cleanupLockedJourneyPayload = await cleanupLockedJourneyResponse.json();
    console.log("cleanupLockedJourney", cleanupLockedJourneyPayload.data?.cancelledCount === 1);
    assert.equal(cleanupLockedJourneyResponse.ok, true);
    assert.equal(cleanupLockedJourneyPayload.data?.cancelledCount === 1, true);
    assert.equal(Array.isArray(cleanupLockedJourneyPayload.data?.resultList), true);

    const batchBlindBoxesValidateResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        blindBoxConfigList: [
          {
            locationId: addStartLocationPayload.data.id,
            effectData: {
              effectType: "money",
              operator: "+=",
              value: 100,
            },
          },
          {
            locationId: addGoalLocationPayload.data.id,
            effectData: {
              effectType: "gain_free_shop_refresh",
              freeRefreshCount: 1,
            },
          },
        ],
      }),
    });
    const batchBlindBoxesValidatePayload = await batchBlindBoxesValidateResponse.json();
    console.log("validateBlindBoxBatch", batchBlindBoxesValidatePayload.data?.isValid === true);

    const batchBlindBoxesCreateResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        createdBy: playerId,
        blindBoxConfigList: [
          {
            locationId: addStartLocationPayload.data.id,
            effectData: {
              effectType: "money",
              operator: "+=",
              value: 100,
            },
          },
          {
            locationId: addGoalLocationPayload.data.id,
            effectData: {
              effectType: "gain_free_shop_refresh",
              freeRefreshCount: 1,
            },
          },
        ],
      }),
    });
    const batchBlindBoxesCreatePayload = await batchBlindBoxesCreateResponse.json();
    const createdBlindBoxBatch = batchBlindBoxesCreatePayload.data?.blindBoxList ?? [];
    console.log("createBlindBoxBatch", createdBlindBoxBatch.length === 2);
    const filteredBlindBoxesResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes?status=hidden_effect&openedStatus=false&limit=10`);
    const filteredBlindBoxesPayload = await filteredBlindBoxesResponse.json();
    console.log("blindBoxFilters", Array.isArray(filteredBlindBoxesPayload.data?.blindBoxList) && filteredBlindBoxesPayload.data.blindBoxList.length > 0);
    assert.equal(Array.isArray(filteredBlindBoxesPayload.data?.blindBoxList), true);
    assert.equal(filteredBlindBoxesPayload.data.blindBoxList.length > 0, true);

    const batchBlindBoxesUpdateResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        updatedBy: playerId,
        blindBoxUpdateList: createdBlindBoxBatch.map((item, index) => ({
          blindBoxId: item.id,
          effectData: index === 0
            ? {
                effectType: "money",
                operator: "+=",
                value: 200,
              }
            : {
                effectType: "gain_free_shop_refresh",
                freeRefreshCount: 2,
              },
        })),
      }),
    });
    const batchBlindBoxesUpdatePayload = await batchBlindBoxesUpdateResponse.json();
    console.log("updateBlindBoxBatch", batchBlindBoxesUpdatePayload.data?.updatedCount === 2);

    const batchBlindBoxesDeleteResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/batch`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        deletedBy: playerId,
        blindBoxIdList: createdBlindBoxBatch.map((item) => item.id),
      }),
    });
    const batchBlindBoxesDeletePayload = await batchBlindBoxesDeleteResponse.json();
    console.log("deleteBlindBoxBatch", batchBlindBoxesDeletePayload.data?.deletedCount === 2);

    const authHeaderMoneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/money`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const authHeaderMoneyPayload = await authHeaderMoneyResponse.json();
    console.log("authHeaderSelfAccess", authHeaderMoneyPayload.success === true && typeof authHeaderMoneyPayload.data?.money === "number");

    const publicRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records/public?requestingPlayerId=${playerId}`);
    const publicRecordsPayload = await publicRecordsResponse.json();
    console.log("publicRecords", Array.isArray(publicRecordsPayload.data?.publicRecordList));
    assert.equal(Array.isArray(publicRecordsPayload.data?.publicRecordList), true);
    assert.equal(publicRecordsPayload.data?.publicRecordList.length >= 1, true);

    const publicRecordsAuthResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records/public`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const publicRecordsAuthPayload = await publicRecordsAuthResponse.json();
    console.log("publicRecordsAuthContext", Array.isArray(publicRecordsAuthPayload.data?.publicRecordList));
    assert.equal(Array.isArray(publicRecordsAuthPayload.data?.publicRecordList), true);
    assert.equal(publicRecordsAuthPayload.data?.publicRecordList.length >= 1, true);

    const publicRecordsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records/public?requestingPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=2`);
    const publicRecordsQueryPayload = await publicRecordsQueryResponse.json();
    console.log(
      "publicRecordsQueryOptions",
      Array.isArray(publicRecordsQueryPayload.data?.publicRecordList)
        && publicRecordsQueryPayload.data.publicRecordList.length <= 2,
    );
    assert.equal(Array.isArray(publicRecordsQueryPayload.data?.publicRecordList), true);
    assert.equal(publicRecordsQueryPayload.data.publicRecordList.length <= 2, true);
    assert.equal(publicRecordsQueryPayload.data.publicRecordList.length >= 1, true);
    const createdAtFilteredRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records?createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
    const createdAtFilteredRecordsPayload = await createdAtFilteredRecordsResponse.json();
    console.log("recordDateFilters", Array.isArray(createdAtFilteredRecordsPayload.data?.recordList));
    assert.equal(Array.isArray(createdAtFilteredRecordsPayload.data?.recordList), true);
    assert.equal(createdAtFilteredRecordsPayload.data?.recordList.length >= 1, true);

    const blindBoxesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes?sortBy=openedAt&sortDirection=desc&limit=2`);
    const blindBoxesQueryPayload = await blindBoxesQueryResponse.json();
    console.log("blindBoxesQueryOptions", Array.isArray(blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList) && (blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList).length <= 2);
    assert.equal(Array.isArray(blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList), true);
    assert.equal((blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList).length <= 2, true);
    assert.equal((blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList).length >= 1, true);

    const publicBlindBoxesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/public?sortBy=openedAt&sortDirection=desc&limit=2`);
    const publicBlindBoxesQueryPayload = await publicBlindBoxesQueryResponse.json();
    console.log(
      "publicBlindBoxesQueryOptions",
      Array.isArray(publicBlindBoxesQueryPayload.data?.publicBlindBoxList)
        && publicBlindBoxesQueryPayload.data.publicBlindBoxList.length <= 2,
    );
    assert.equal(Array.isArray(publicBlindBoxesQueryPayload.data?.publicBlindBoxList), true);
    assert.equal(publicBlindBoxesQueryPayload.data?.publicBlindBoxList.length <= 2, true);
    assert.equal(publicBlindBoxesQueryPayload.data?.publicBlindBoxList.every((entry) => typeof entry.openedStatus === "boolean"), true);

    const blindBoxesAuthQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes?sortBy=openedAt&sortDirection=desc&limit=2`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const blindBoxesAuthQueryPayload = await blindBoxesAuthQueryResponse.json();
    console.log("blindBoxesAuthContext", Array.isArray(blindBoxesAuthQueryPayload.blindBoxList ?? blindBoxesAuthQueryPayload.data?.blindBoxList));
    assert.equal(Array.isArray(blindBoxesAuthQueryPayload.blindBoxList ?? blindBoxesAuthQueryPayload.data?.blindBoxList), true);
    assert.equal((blindBoxesAuthQueryPayload.blindBoxList ?? blindBoxesAuthQueryPayload.data?.blindBoxList).length <= 2, true);
    assert.equal((blindBoxesAuthQueryPayload.blindBoxList ?? blindBoxesAuthQueryPayload.data?.blindBoxList).length >= 1, true);

    const blindBoxReviewQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/review?operatorPlayerId=${playerId}&blindBoxLimit=2&effectLogLimit=2&recordLimit=2`);
    const blindBoxReviewQueryPayload = await blindBoxReviewQueryResponse.json();
    console.log(
      "blindBoxReviewQueryOptions",
      Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxList)
        && blindBoxReviewQueryPayload.data.blindBoxReviewData.blindBoxList.length <= 2
        && Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxEffectLogList)
        && blindBoxReviewQueryPayload.data.blindBoxReviewData.blindBoxEffectLogList.length <= 2
      && Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.recordList)
      && blindBoxReviewQueryPayload.data.blindBoxReviewData.recordList.length <= 2,
    );
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxList), true);
    assert.equal(blindBoxReviewQueryPayload.data.blindBoxReviewData.blindBoxList.length <= 2, true);
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxEffectLogList), true);
    assert.equal(blindBoxReviewQueryPayload.data.blindBoxReviewData.blindBoxEffectLogList.length <= 2, true);
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.recordList), true);
    assert.equal(blindBoxReviewQueryPayload.data.blindBoxReviewData.recordList.length <= 2, true);
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxList), true);
    assert.equal(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxList.length <= 2, true);
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxEffectLogList), true);
    assert.equal(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.blindBoxEffectLogList.length <= 2, true);
    assert.equal(Array.isArray(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.recordList), true);
    assert.equal(blindBoxReviewQueryPayload.data?.blindBoxReviewData?.recordList.length <= 2, true);

    const initializeAuctionResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, operatorPlayerId: playerId }),
    });
    const initializeAuctionPayload = await initializeAuctionResponse.json();
    console.log("initializeAuction", Boolean(initializeAuctionPayload.data?.id));
    assert.equal(Boolean(initializeAuctionPayload.data?.id), true);

    const createAuctionRoundResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        mapId,
        startTime: "2026-07-09T06:30:00+08:00",
        endTime: "2026-07-09T06:40:00+08:00",
        availableTransportTypes: [
          TransportType.LOCAL_TRAIN,
        ],
      }),
    });
    const createAuctionRoundPayload = await createAuctionRoundResponse.json();
    console.log("createAuctionRound", Boolean(createAuctionRoundPayload.data?.id));
    assert.equal(Boolean(createAuctionRoundPayload.data?.id), true);

    const auctionId = createAuctionRoundPayload.data.id;

    const currentAuctionResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/current?currentTime=2026-07-09T06:31:00%2B08:00`);
    const currentAuctionPayload = await currentAuctionResponse.json();
    console.log("currentAuction", Boolean(currentAuctionPayload.data?.currentAuction?.id));
    console.log("currentAuctionTicket", Boolean(currentAuctionPayload.data?.currentAuction?.ticket?.id));
    console.log("currentAuctionTicketRating", typeof currentAuctionPayload.data?.currentAuction?.ticketRating?.ratingType === "string");
    assert.equal(Boolean(currentAuctionPayload.data?.currentAuction?.id), true);
    assert.equal(Boolean(currentAuctionPayload.data?.currentAuction?.ticket?.id), true);
    assert.equal(typeof currentAuctionPayload.data?.currentAuction?.ticketRating?.ratingType === "string", true);

    const placeBidResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/${auctionId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        operatorPlayerId: playerId,
        bidAmount: 500,
        currentTime: "2026-07-09T06:31:00+08:00",
      }),
    });
    const placeBidPayload = await placeBidResponse.json();
    console.log("placeBid", placeBidPayload.data?.success ?? false);
    assert.equal(placeBidPayload.data?.success, true);

    const bidListResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/${auctionId}/bids`);
    const bidListPayload = await bidListResponse.json();
    console.log("bidList", bidListPayload.data?.bidList?.length ?? 0);
    assert.equal(Array.isArray(bidListPayload.data?.bidList), true);
    assert.equal(bidListPayload.data.bidList.length >= 1, true);
    assert.equal(bidListPayload.data?.bidList.every((entry) => entry.auctionId === auctionId), true);
    const bidDateFilterResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/${auctionId}/bids?createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
    const bidDateFilterPayload = await bidDateFilterResponse.json();
    console.log("bidDateFilters", Array.isArray(bidDateFilterPayload.data?.bidList) && bidDateFilterPayload.data.bidList.length >= 1);
    assert.equal(Array.isArray(bidDateFilterPayload.data?.bidList), true);
    assert.equal(bidDateFilterPayload.data.bidList.length >= 1, true);

    const resolveAuctionResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/${auctionId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorPlayerId: playerId,
        currentTime: "2026-07-09T06:40:00+08:00",
      }),
    });
    const resolveAuctionPayload = await resolveAuctionResponse.json();
    console.log("resolveAuction", Boolean(resolveAuctionPayload.data?.winnerPlayerId));
    assert.equal(resolveAuctionResponse.ok, true);
    assert.equal(typeof resolveAuctionPayload.data?.winnerPlayerId === "string" || resolveAuctionPayload.data?.winnerPlayerId === null, true);
    assert.equal(Boolean(resolveAuctionPayload.data?.winnerPlayerId), true);

    const processScheduledEventsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/scheduled-events/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentTime: "2026-07-09T07:00:00+08:00",
        operatorPlayerId: playerId,
      }),
    });
    const processScheduledEventsPayload = await processScheduledEventsResponse.json();
    console.log(
      "processScheduledEvents",
      Boolean(processScheduledEventsPayload.data?.shopResult)
        && Boolean(processScheduledEventsPayload.data?.journeyResult)
        && Boolean(processScheduledEventsPayload.data?.gameResult),
    );
    assert.equal(Boolean(processScheduledEventsPayload.data?.shopResult), true);
    assert.equal(Boolean(processScheduledEventsPayload.data?.journeyResult), true);
    assert.equal(Boolean(processScheduledEventsPayload.data?.gameResult), true);

    const playerTicketsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}`);
    const playerTicketsPayload = await playerTicketsResponse.json();
    const playerTicketList = playerTicketsPayload.ticketList ?? playerTicketsPayload.data?.ticketList ?? [];
    const playerTicketsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const playerTicketsQueryPayload = await playerTicketsQueryResponse.json();
    const queriedTicketList = playerTicketsQueryPayload.ticketList ?? playerTicketsQueryPayload.data?.ticketList ?? [];
    const playerTicketsFilteredResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}&source=shop_purchase&createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
    const playerTicketsFilteredPayload = await playerTicketsFilteredResponse.json();
    const playerTicketsFilteredList = playerTicketsFilteredPayload.ticketList ?? playerTicketsFilteredPayload.data?.ticketList ?? [];
    const journeyTicket = playerTicketList.find((entry) => entry.ticket?.transportType !== TransportType.UNIVERSAL)?.ticket
      ?? playerTicketList[0]?.ticket
      ?? null;
    console.log("playerTickets", playerTicketList.length);
    console.log("playerTicketsQueryOptions", Array.isArray(queriedTicketList) && queriedTicketList.length <= 1);
    console.log("playerTicketsFilters", Array.isArray(playerTicketsFilteredList));
    assert.equal(Array.isArray(playerTicketList), true);
    assert.equal(playerTicketList.length >= 1, true);
    assert.equal(Array.isArray(queriedTicketList), true);
    assert.equal(queriedTicketList.length <= 1, true);
    assert.equal(Array.isArray(playerTicketsFilteredList), true);
    assert.equal(playerTicketsFilteredList.length >= 1, true);
    assert.equal(playerTicketsFilteredList.every((entry) => entry.source === "shop_purchase"), true);
    assert.equal(queriedTicketList.length === 1, true);
    const departureTime = "2026-07-09T06:50:00+08:00";
    const arrivalTime = "2026-07-09T06:55:00+08:00";

    let journeyId = null;
    if (journeyTicket && journeyTicket.transportType !== TransportType.UNIVERSAL) {
      const createJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerId,
          operatorPlayerId: playerId,
          fromLocationId: addStartLocationPayload.data.id,
          toLocationId: addGoalLocationPayload.data.id,
          transportType: journeyTicket.transportType,
          ticketIdList: [journeyTicket.id],
          departureTime,
          arrivalTime,
          currentTime: "2026-07-09T06:20:00+08:00",
          metadata: { source: "api_smoke_test" },
        }),
      });
      const createJourneyPayload = await createJourneyResponse.json();
      console.log("createJourney", Boolean(createJourneyPayload.data?.id));
      journeyId = createJourneyPayload.data?.id ?? null;
    } else {
      console.log("createJourney", "skipped");
    }

    if (journeyId) {
      const reservedJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys/reserved?operatorPlayerId=${playerId}`);
      const reservedJourneyPayload = await reservedJourneyResponse.json();
      console.log("reservedJourney", Boolean(reservedJourneyPayload.data?.reservedJourney?.id));
      assert.equal(reservedJourneyResponse.ok, true);
      assert.equal(Boolean(reservedJourneyPayload.data?.reservedJourney?.id), true);

      const playerJourneysQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys?operatorPlayerId=${playerId}&sortBy=departureTime&sortDirection=desc&limit=1`);
      const playerJourneysQueryPayload = await playerJourneysQueryResponse.json();
      const queriedJourneyList = playerJourneysQueryPayload.data?.journeyList ?? playerJourneysQueryPayload.journeyList;
      console.log("playerJourneysQueryOptions", Array.isArray(queriedJourneyList) && queriedJourneyList.length <= 1);
      assert.equal(Array.isArray(queriedJourneyList), true);
      assert.equal(queriedJourneyList.length <= 1, true);
      assert.equal(queriedJourneyList.length >= 1, true);

      const startJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${journeyId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            playerId,
            operatorPlayerId: playerId,
            startedAt: "2026-07-09T06:50:00+08:00",
          }),
      });
      const startJourneyPayload = await startJourneyResponse.json();
      console.log("startJourney", startJourneyPayload.data?.status === "started");
      assert.equal(startJourneyPayload.data?.status, "started");

      const currentJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys/current?operatorPlayerId=${playerId}`);
      const currentJourneyPayload = await currentJourneyResponse.json();
      console.log("currentJourney", Boolean(currentJourneyPayload.data?.currentJourney?.id));
      assert.equal(currentJourneyResponse.ok, true);
      assert.equal(Boolean(currentJourneyPayload.data?.currentJourney?.id), true);
      assert.equal(currentJourneyPayload.data?.currentJourney?.id, journeyId);

      const publicJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/public-journey?requestingPlayerId=${playerId}`);
      const publicJourneyPayload = await publicJourneyResponse.json();
      console.log("publicJourney", Boolean(publicJourneyPayload.data?.publicJourneyInfo?.journeyId));
      assert.equal(Boolean(publicJourneyPayload.data?.publicJourneyInfo?.journeyId), true);
      assert.equal(publicJourneyPayload.data?.publicJourneyInfo?.journeyId, journeyId);

      const completeJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${journeyId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            playerId,
            operatorPlayerId: playerId,
            completedAt: arrivalTime,
          }),
      });
      const completeJourneyPayload = await completeJourneyResponse.json();
      console.log("completeJourney", completeJourneyPayload.data?.status === "completed");
      assert.equal(completeJourneyPayload.data?.status, "completed");
    } else {
      console.log("reservedJourney", "skipped");
      console.log("playerJourneysQueryOptions", "skipped");
      console.log("startJourney", "skipped");
      console.log("currentJourney", "skipped");
      console.log("publicJourney", "skipped");
      console.log("completeJourney", "skipped");
    }

    const playerTicketsAfterJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}`);
    const playerTicketsAfterJourneyPayload = await playerTicketsAfterJourneyResponse.json();
    const playerTicketsAfterJourneyList = playerTicketsAfterJourneyPayload.ticketList ?? playerTicketsAfterJourneyPayload.data?.ticketList ?? [];
    const incidentJourneyTicket = playerTicketsAfterJourneyList.find((entry) => entry.ticket?.transportType !== TransportType.UNIVERSAL)?.ticket
      ?? null;
    assert.equal(Array.isArray(playerTicketsAfterJourneyList), true);
    assert.equal(playerTicketsAfterJourneyList.length >= 1, true);

    if (incidentJourneyTicket) {
      const createIncidentJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerId,
          operatorPlayerId: playerId,
          fromLocationId: addGoalLocationPayload.data.id,
          toLocationId: addStartLocationPayload.data.id,
          transportType: incidentJourneyTicket.transportType,
          ticketIdList: [incidentJourneyTicket.id],
          departureTime: "2026-07-09T07:20:00+08:00",
          arrivalTime: "2026-07-09T07:30:00+08:00",
          currentTime: "2026-07-09T07:00:00+08:00",
          metadata: { source: "traffic_incident_test" },
        }),
      });
      const createIncidentJourneyPayload = await createIncidentJourneyResponse.json();
      console.log("createIncidentJourney", Boolean(createIncidentJourneyPayload.data?.id));
      assert.equal(Boolean(createIncidentJourneyPayload.data?.id), true);

      const incidentJourneyId = createIncidentJourneyPayload.data?.id ?? null;

      if (incidentJourneyId) {
        const startIncidentJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${incidentJourneyId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId,
            playerId,
            operatorPlayerId: playerId,
            startedAt: "2026-07-09T07:20:00+08:00",
          }),
        });
        const startIncidentJourneyPayload = await startIncidentJourneyResponse.json();
        console.log("startIncidentJourney", startIncidentJourneyPayload.data?.status === "started");
        assert.equal(startIncidentJourneyPayload.data?.status, "started");

        const submitIncidentResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            operatorPlayerId: playerId,
            journeyId: incidentJourneyId,
            evidenceList: ["operator announcement"],
            actualEndLocationId: addGoalLocationPayload.data.id,
            actualEndedAt: "2026-07-09T07:25:00+08:00",
            description: "service interrupted early",
          }),
        });
        const submitIncidentPayload = await submitIncidentResponse.json();
        console.log("submitIncident", Boolean(submitIncidentPayload.data?.id));
        assert.equal(Boolean(submitIncidentPayload.data?.id), true);
        const pendingIncidentListResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents?operatorPlayerId=${playerId}&status=pending&playerId=${playerId}`);
        const pendingIncidentListPayload = await pendingIncidentListResponse.json();
        console.log("trafficIncidentFilters", Array.isArray(pendingIncidentListPayload.requestList) && pendingIncidentListPayload.requestList.some((item) => item.id === submitIncidentPayload.data?.id));
        assert.equal(Array.isArray(pendingIncidentListPayload.requestList), true);
        assert.equal(pendingIncidentListPayload.requestList.some((item) => item.id === submitIncidentPayload.data?.id), true);
        const pendingIncidentCreatedAtResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents?operatorPlayerId=${playerId}&createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
        const pendingIncidentCreatedAtPayload = await pendingIncidentCreatedAtResponse.json();
        console.log("trafficIncidentDateFilters", Array.isArray(pendingIncidentCreatedAtPayload.requestList) && pendingIncidentCreatedAtPayload.requestList.some((item) => item.id === submitIncidentPayload.data?.id));
        assert.equal(Array.isArray(pendingIncidentCreatedAtPayload.requestList), true);
        assert.equal(pendingIncidentCreatedAtPayload.requestList.some((item) => item.id === submitIncidentPayload.data?.id), true);

        const reviewSummaryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents/review-summary?operatorPlayerId=${playerId}`);
        const reviewSummaryPayload = await reviewSummaryResponse.json();
        console.log("trafficIncidentReviewSummary", Boolean(reviewSummaryPayload.data?.summary));
        assert.equal(reviewSummaryResponse.ok, true);
        assert.equal(Boolean(reviewSummaryPayload.data?.summary), true);
        assert.equal(typeof reviewSummaryPayload.data?.summary?.pendingCount === "number", true);
        assert.equal(typeof reviewSummaryPayload.data?.summary?.approveCount === "number", true);
        assert.equal(typeof reviewSummaryPayload.data?.summary?.rejectCount === "number", true);

        const requestId = submitIncidentPayload.data?.id ?? null;
        let firstApprovedReturnedTicket = null;
        if (requestId) {
          const approveIncidentResponse = await fetch(`http://127.0.0.1:8788/traffic-incidents/${requestId}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operatorPlayerId: playerId,
              reviewerId: "system-reviewer",
              reviewNote: "approved in api smoke test",
            }),
          });
          const approveIncidentPayload = await approveIncidentResponse.json();
          firstApprovedReturnedTicket = approveIncidentPayload.data?.returnedTicket ?? null;
          console.log("approveIncident", Boolean(approveIncidentPayload.data?.returnedTicket?.id));
          assert.equal(Boolean(approveIncidentPayload.data?.returnedTicket?.id), true);

          const incidentJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${incidentJourneyId}`);
          const incidentJourneyPayload = await incidentJourneyResponse.json();
          console.log("incidentJourneyResolved", incidentJourneyPayload.data?.status === "incident_resolved");
          assert.equal(incidentJourneyPayload.data?.status, "incident_resolved");

          const currentJourneyAfterIncidentResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys/current?operatorPlayerId=${playerId}`);
          const currentJourneyAfterIncidentPayload = await currentJourneyAfterIncidentResponse.json();
          console.log("incidentCurrentJourneyCleared", !currentJourneyAfterIncidentPayload.data?.currentJourney?.id);
          assert.equal(currentJourneyAfterIncidentResponse.ok, true);
          assert.equal(Boolean(currentJourneyAfterIncidentPayload.data?.currentJourney?.id), false);

          const secondIncidentTicket = firstApprovedReturnedTicket;

          if (secondIncidentTicket) {
            const createSecondIncidentJourneyResponse = await fetch("http://127.0.0.1:8788/journeys", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameId,
                playerId,
                operatorPlayerId: playerId,
                fromLocationId: addGoalLocationPayload.data.id,
                toLocationId: addStartLocationPayload.data.id,
                transportType: secondIncidentTicket.transportType,
                ticketIdList: [secondIncidentTicket.id],
                departureTime: "2026-07-09T07:40:00+08:00",
                arrivalTime: "2026-07-09T07:45:00+08:00",
                currentTime: "2026-07-09T07:30:00+08:00",
                metadata: { source: "traffic_incident_batch_test" },
              }),
            });
            const createSecondIncidentJourneyPayload = await createSecondIncidentJourneyResponse.json();
            const secondIncidentJourneyId = createSecondIncidentJourneyPayload.data?.id ?? null;

            if (secondIncidentJourneyId) {
              await fetch(`http://127.0.0.1:8788/journeys/${secondIncidentJourneyId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    gameId,
                    playerId,
                    operatorPlayerId: playerId,
                    startedAt: "2026-07-09T07:40:00+08:00",
                  }),
              });

              const submitSecondIncidentResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  playerId,
                  operatorPlayerId: playerId,
                  journeyId: secondIncidentJourneyId,
                  evidenceList: ["batch review evidence"],
                  actualEndLocationId: addGoalLocationPayload.data.id,
                  actualEndedAt: "2026-07-09T07:42:00+08:00",
                  description: "batch review test",
                }),
              });
              const submitSecondIncidentPayload = await submitSecondIncidentResponse.json();
              const secondRequestId = submitSecondIncidentPayload.data?.id ?? null;

              if (secondRequestId) {
                const batchReviewResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents/review-batch`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    operatorPlayerId: playerId,
                    requestIdList: [secondRequestId],
                    decision: "reject",
                    reviewerId: "system-reviewer",
                    rejectReason: "batch rejected in api smoke test",
                  }),
                });
                const batchReviewPayload = await batchReviewResponse.json();
                console.log("batchRejectIncident", batchReviewPayload.data?.reviewedCount === 1);
                assert.equal(batchReviewResponse.ok, true);
                assert.equal(batchReviewPayload.data?.reviewedCount === 1, true);
                assert.equal(Array.isArray(batchReviewPayload.data?.resultList), true);
                assert.equal(batchReviewPayload.data?.resultList.length >= 1, true);
              } else {
                console.log("batchRejectIncident", "skipped");
              }
            } else {
              console.log("batchRejectIncident", "skipped");
            }
          } else {
            console.log("batchRejectIncident", "skipped");
          }
        } else {
          console.log("approveIncident", "skipped");
          console.log("incidentJourneyResolved", "skipped");
          console.log("incidentCurrentJourneyCleared", "skipped");
          console.log("batchRejectIncident", "skipped");
        }
      } else {
        console.log("startIncidentJourney", "skipped");
        console.log("submitIncident", "skipped");
        console.log("approveIncident", "skipped");
        console.log("incidentJourneyResolved", "skipped");
        console.log("incidentCurrentJourneyCleared", "skipped");
        console.log("batchRejectIncident", "skipped");
      }
    } else {
      console.log("createIncidentJourney", "skipped");
      console.log("startIncidentJourney", "skipped");
      console.log("submitIncident", "skipped");
      console.log("approveIncident", "skipped");
      console.log("incidentJourneyResolved", "skipped");
      console.log("incidentCurrentJourneyCleared", "skipped");
      console.log("batchRejectIncident", "skipped");
    }

    const gameRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records`);
    const gameRecordsPayload = await gameRecordsResponse.json();
    console.log("gameRecords", Array.isArray(gameRecordsPayload.data?.recordList));
    assert.equal(Array.isArray(gameRecordsPayload.data?.recordList), true);
    assert.equal(gameRecordsPayload.data?.recordList.length >= 1, true);

    const pagedGameRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records?sortBy=createdAt&sortDirection=desc&limit=2`);
    const pagedGameRecordsPayload = await pagedGameRecordsResponse.json();
    console.log("gameRecordsQueryOptions", Array.isArray(pagedGameRecordsPayload.data?.recordList) && pagedGameRecordsPayload.data.recordList.length <= 2);
    assert.equal(Array.isArray(pagedGameRecordsPayload.data?.recordList), true);
    assert.equal(pagedGameRecordsPayload.data?.recordList.length <= 2, true);

    const createdAtFilteredGameRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records?createdAtAfter=2026-07-09T00:00:00%2B08:00&createdAtBefore=2026-07-10T23:59:59%2B08:00`);
    const createdAtFilteredGameRecordsPayload = await createdAtFilteredGameRecordsResponse.json();
    console.log("gameRecordsDateFilters", Array.isArray(createdAtFilteredGameRecordsPayload.data?.recordList) && createdAtFilteredGameRecordsPayload.data.recordList.length >= 1);
    assert.equal(Array.isArray(createdAtFilteredGameRecordsPayload.data?.recordList), true);
    assert.equal(createdAtFilteredGameRecordsPayload.data?.recordList.length >= 1, true);

    const reviewResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/review`);
    const reviewPayload = await reviewResponse.json();
    console.log("reviewData", Array.isArray(reviewPayload.data?.reviewData?.recordList));
    console.log("reviewRanking", Array.isArray(reviewPayload.data?.reviewData?.ranking));
    console.log("reviewGame", Boolean(reviewPayload.data?.reviewData?.game?.id));
    console.log("reviewBlindBoxes", Array.isArray(reviewPayload.data?.reviewData?.blindBoxReviewData?.blindBoxList));
    console.log("reviewSummary", Boolean(reviewPayload.data?.reviewData?.summary?.recordTypeCounts));
    console.log("reviewTrafficSummary", typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.approveCount === "number");
    assert.equal(Array.isArray(reviewPayload.data?.reviewData?.recordList), true);
    assert.equal(Array.isArray(reviewPayload.data?.reviewData?.ranking), true);
    assert.equal(Boolean(reviewPayload.data?.reviewData?.game?.id), true);
    assert.equal(Array.isArray(reviewPayload.data?.reviewData?.blindBoxReviewData?.blindBoxList), true);
    assert.equal(Boolean(reviewPayload.data?.reviewData?.summary?.recordTypeCounts), true);
    assert.equal(typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.submitCount === "number", true);
    assert.equal(typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.approveCount === "number", true);
    assert.equal(typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.rejectCount === "number", true);
    assert.equal(typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.pendingCount === "number", true);
    assert.equal(reviewPayload.data?.reviewData?.recordList.length >= 1, true);
    assert.equal(reviewPayload.data?.reviewData?.ranking.length >= 1, true);
    assert.equal(reviewPayload.data?.reviewData?.blindBoxReviewData?.blindBoxList.length >= 1, true);

    const deleteMapResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}`, {
      method: "DELETE",
    });
    const deleteMapPayload = await deleteMapResponse.json();
    console.log("deleteMap", deleteMapPayload.data?.success === true);
    assert.equal(deleteMapPayload.data?.success, true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
