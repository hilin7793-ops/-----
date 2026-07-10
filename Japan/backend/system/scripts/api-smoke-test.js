import { createServiceContext } from "../src/api/createServiceContext.js";
import { createAppServer } from "../src/api/createAppServer.js";
import { TransportType } from "../src/index.js";

async function main() {
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

    const fallbackGameAccessResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/access?operatorPlayerId=${playerId}&targetPlayerId=${playerId}`);
    const fallbackGameAccessPayload = await fallbackGameAccessResponse.json();
    console.log("gameAccessFallback", fallbackGameAccessPayload.data?.usedOperatorFallback === true && fallbackGameAccessPayload.data?.isJoinedGame === true);

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

    const checklistResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/checklist?currentTime=2026-07-09T06:35:00%2B08:00&operatorPlayerId=${playerId}`);
    const checklistPayload = await checklistResponse.json();
    console.log("checklistData", Boolean(checklistPayload.data?.checklist?.summary));
    console.log("checklistIncidents", Array.isArray(checklistPayload.data?.checklist?.pendingTrafficIncidentRequestList));

    const forbiddenChecklistResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/checklist?currentTime=2026-07-09T06:35:00%2B08:00&operatorPlayerId=not-host`);
    const forbiddenChecklistPayload = await forbiddenChecklistResponse.json();
    console.log("hostAccessGuard", forbiddenChecklistPayload.success === false && forbiddenChecklistPayload.errorCode === "FORBIDDEN");

    const trafficIncidentListResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/traffic-incidents?operatorPlayerId=${playerId}`);
    const trafficIncidentListPayload = await trafficIncidentListResponse.json();
    console.log("trafficIncidentList", Array.isArray(trafficIncidentListPayload.requestList ?? trafficIncidentListPayload.data?.requestList));

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

    const playerRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/records?operatorPlayerId=${playerId}`);
    const playerRecordsPayload = await playerRecordsResponse.json();
    console.log("playerRecords", Array.isArray(playerRecordsPayload.data?.recordList));

    const playerRecordsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/records?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const playerRecordsQueryPayload = await playerRecordsQueryResponse.json();
    console.log("playerRecordsQueryOptions", Array.isArray(playerRecordsQueryPayload.data?.recordList) && playerRecordsQueryPayload.data.recordList.length <= 1);

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

    const specialStatesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/special-states?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const specialStatesQueryPayload = await specialStatesQueryResponse.json();
    console.log(
      "specialStatesQueryOptions",
      Array.isArray(specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList)
        && (specialStatesQueryPayload.specialStateList ?? specialStatesQueryPayload.data?.specialStateList).length <= 1,
    );

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

    const hostJourneySummaryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/summary?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00`);
    const hostJourneySummaryPayload = await hostJourneySummaryResponse.json();
    console.log("hostJourneySummary", hostJourneySummaryPayload.success === true && typeof hostJourneySummaryPayload.data?.totalJourneyCount === "number");
    console.log("hostJourneySummaryCancelled", (hostJourneySummaryPayload.data?.statusCounts?.cancelled ?? 0) >= 1);
    console.log("hostJourneySummaryDueToStart", (hostJourneySummaryPayload.data?.dueToStartCount ?? 0) >= 0);

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

    const hostJourneyActionQueueResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/action-queue?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00&sortBy=departureTime&sortDirection=asc&limit=10`);
    const hostJourneyActionQueuePayload = await hostJourneyActionQueueResponse.json();
    console.log("hostJourneyActionQueue", Array.isArray(hostJourneyActionQueuePayload.data?.actionQueue));
    console.log("hostJourneyActionQueueAction", hostJourneyActionQueuePayload.data?.actionQueue?.some((item) => item.journeyId === exceptionJourneyId && item.suggestedActionList?.includes("start_journey")) === true);

    const hostJourneyDashboardResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/journeys/dashboard?operatorPlayerId=${playerId}&currentTime=2026-07-09T07:20:00%2B08:00`);
    const hostJourneyDashboardPayload = await hostJourneyDashboardResponse.json();
    console.log("hostJourneyDashboard", hostJourneyDashboardPayload.success === true && typeof hostJourneyDashboardPayload.data?.dashboard?.summary?.totalJourneyCount === "number");
    console.log("hostJourneyDashboardExceptions", Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.exceptionJourneyList));
    console.log("hostJourneyDashboardActionQueue", Array.isArray(hostJourneyDashboardPayload.data?.dashboard?.actionQueue));

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

    const publicRecordsAuthResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records/public`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const publicRecordsAuthPayload = await publicRecordsAuthResponse.json();
    console.log("publicRecordsAuthContext", Array.isArray(publicRecordsAuthPayload.data?.publicRecordList));

    const publicRecordsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records/public?requestingPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=2`);
    const publicRecordsQueryPayload = await publicRecordsQueryResponse.json();
    console.log(
      "publicRecordsQueryOptions",
      Array.isArray(publicRecordsQueryPayload.data?.publicRecordList)
        && publicRecordsQueryPayload.data.publicRecordList.length <= 2,
    );

    const blindBoxesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes?sortBy=openedAt&sortDirection=desc&limit=2`);
    const blindBoxesQueryPayload = await blindBoxesQueryResponse.json();
    console.log("blindBoxesQueryOptions", Array.isArray(blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList) && (blindBoxesQueryPayload.blindBoxList ?? blindBoxesQueryPayload.data?.blindBoxList).length <= 2);

    const publicBlindBoxesQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes/public?sortBy=openedAt&sortDirection=desc&limit=2`);
    const publicBlindBoxesQueryPayload = await publicBlindBoxesQueryResponse.json();
    console.log(
      "publicBlindBoxesQueryOptions",
      Array.isArray(publicBlindBoxesQueryPayload.data?.publicBlindBoxList)
        && publicBlindBoxesQueryPayload.data.publicBlindBoxList.length <= 2,
    );

    const blindBoxesAuthQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/blind-boxes?sortBy=openedAt&sortDirection=desc&limit=2`, {
      headers: {
        "x-auth-user-id": "auth-api-smoke-player",
      },
    });
    const blindBoxesAuthQueryPayload = await blindBoxesAuthQueryResponse.json();
    console.log("blindBoxesAuthContext", Array.isArray(blindBoxesAuthQueryPayload.blindBoxList ?? blindBoxesAuthQueryPayload.data?.blindBoxList));

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

    const initializeAuctionResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapId, operatorPlayerId: playerId }),
    });
    const initializeAuctionPayload = await initializeAuctionResponse.json();
    console.log("initializeAuction", Boolean(initializeAuctionPayload.data?.id));

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

    const auctionId = createAuctionRoundPayload.data.id;

    const currentAuctionResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/current?currentTime=2026-07-09T06:31:00%2B08:00`);
    const currentAuctionPayload = await currentAuctionResponse.json();
    console.log("currentAuction", Boolean(currentAuctionPayload.data?.currentAuction?.id));
    console.log("currentAuctionTicket", Boolean(currentAuctionPayload.data?.currentAuction?.ticket?.id));
    console.log("currentAuctionTicketRating", typeof currentAuctionPayload.data?.currentAuction?.ticketRating?.ratingType === "string");

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

    const bidListResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/auction-shop/${auctionId}/bids`);
    const bidListPayload = await bidListResponse.json();
    console.log("bidList", bidListPayload.data?.bidList?.length ?? 0);

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

    const playerTicketsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}`);
    const playerTicketsPayload = await playerTicketsResponse.json();
    const playerTicketList = playerTicketsPayload.ticketList ?? playerTicketsPayload.data?.ticketList ?? [];
    const playerTicketsQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/tickets?operatorPlayerId=${playerId}&sortBy=createdAt&sortDirection=desc&limit=1`);
    const playerTicketsQueryPayload = await playerTicketsQueryResponse.json();
    const queriedTicketList = playerTicketsQueryPayload.ticketList ?? playerTicketsQueryPayload.data?.ticketList ?? [];
    const journeyTicket = playerTicketList.find((entry) => entry.ticket?.transportType !== TransportType.UNIVERSAL)?.ticket
      ?? playerTicketList[0]?.ticket
      ?? null;
    console.log("playerTickets", playerTicketList.length);
    console.log("playerTicketsQueryOptions", Array.isArray(queriedTicketList) && queriedTicketList.length <= 1);
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

      const playerJourneysQueryResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys?operatorPlayerId=${playerId}&sortBy=departureTime&sortDirection=desc&limit=1`);
      const playerJourneysQueryPayload = await playerJourneysQueryResponse.json();
      const queriedJourneyList = playerJourneysQueryPayload.data?.journeyList ?? playerJourneysQueryPayload.journeyList;
      console.log("playerJourneysQueryOptions", Array.isArray(queriedJourneyList) && queriedJourneyList.length <= 1);

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

      const currentJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys/current?operatorPlayerId=${playerId}`);
      const currentJourneyPayload = await currentJourneyResponse.json();
      console.log("currentJourney", Boolean(currentJourneyPayload.data?.currentJourney?.id));

      const publicJourneyResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/public-journey?requestingPlayerId=${playerId}`);
      const publicJourneyPayload = await publicJourneyResponse.json();
      console.log("publicJourney", Boolean(publicJourneyPayload.data?.publicJourneyInfo?.journeyId));

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

          const incidentJourneyResponse = await fetch(`http://127.0.0.1:8788/journeys/${incidentJourneyId}`);
          const incidentJourneyPayload = await incidentJourneyResponse.json();
          console.log("incidentJourneyResolved", incidentJourneyPayload.data?.status === "incident_resolved");

          const currentJourneyAfterIncidentResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/players/${playerId}/journeys/current?operatorPlayerId=${playerId}`);
          const currentJourneyAfterIncidentPayload = await currentJourneyAfterIncidentResponse.json();
          console.log("incidentCurrentJourneyCleared", !currentJourneyAfterIncidentPayload.data?.currentJourney?.id);

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

    const pagedGameRecordsResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/records?sortBy=createdAt&sortDirection=desc&limit=2`);
    const pagedGameRecordsPayload = await pagedGameRecordsResponse.json();
    console.log("gameRecordsQueryOptions", Array.isArray(pagedGameRecordsPayload.data?.recordList) && pagedGameRecordsPayload.data.recordList.length <= 2);

    const reviewResponse = await fetch(`http://127.0.0.1:8788/games/${gameId}/review`);
    const reviewPayload = await reviewResponse.json();
    console.log("reviewData", Array.isArray(reviewPayload.data?.reviewData?.recordList));
    console.log("reviewRanking", Array.isArray(reviewPayload.data?.reviewData?.ranking));
    console.log("reviewGame", Boolean(reviewPayload.data?.reviewData?.game?.id));
    console.log("reviewBlindBoxes", Array.isArray(reviewPayload.data?.reviewData?.blindBoxReviewData?.blindBoxList));
    console.log("reviewSummary", Boolean(reviewPayload.data?.reviewData?.summary?.recordTypeCounts));
    console.log("reviewTrafficSummary", typeof reviewPayload.data?.reviewData?.summary?.trafficIncidentSummary?.approveCount === "number");

    const deleteMapResponse = await fetch(`http://127.0.0.1:8788/maps/${mapId}`, {
      method: "DELETE",
    });
    const deleteMapPayload = await deleteMapResponse.json();
    console.log("deleteMap", deleteMapPayload.data?.success === true);
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
