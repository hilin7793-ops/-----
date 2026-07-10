import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import { CollectionName, GameStatus, createGame, createPlayer, createRecord } from "../src/index.js";
import {
  createJourney,
  getJourney,
  getPlayerCurrentJourney,
  getPlayerReservedJourney,
  listGameJourneys,
  getGameJourneyManagementSummary,
  getGameJourneyActionQueueSummary,
  canViewPublicJourney,
  validateCreateJourney,
  validateJourneyTime,
  validateTaxiJourney,
  validateWalkingJourney,
} from "../src/services/journeys/journeyService.js";
import {
  consumePlayerBlindBoxSpecialState,
  executeFreeShopRefreshEffect,
  getPlayerBlindBoxSpecialStates,
} from "../src/services/blindBoxes/blindBoxService.js";
import { addPlayerMoney, addTicketToPlayer, canAfford, deductPlayerMoney, getPlayerTickets, initializePlayerForGame } from "../src/services/players/playerService.js";
import { resolveAuction } from "../src/services/shops/auctionShopService.js";
import { canRefreshGeneralShop, initializeGeneralShop, purchaseGeneralShopTicket } from "../src/services/shops/generalShopService.js";
import { getGameChecklist } from "../src/services/overview/checklistService.js";
import { getGameManagementSnapshot, getGameOverview } from "../src/services/overview/overviewService.js";
import { canViewPlayerExactLocation, filterPlayerDataByVisibility, filterRecordDataByVisibility } from "../src/services/visibility/visibilityService.js";
import { filterBlindBoxDataByVisibility } from "../src/services/visibility/visibilityService.js";
import { getPlayerRecords, getGameRecords } from "../src/services/records/recordService.js";
import { getBlindBoxReviewData } from "../src/services/blindBoxes/blindBoxService.js";
import { listTrafficIncidentRequests } from "../src/services/trafficIncidents/trafficIncidentService.js";
import { getAuctionBids } from "../src/services/shops/auctionShopService.js";

async function main() {
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });

  const hostPlayer = await createPlayer({
    dataAccessLayer,
    userId: "rules-host",
    authUserId: "auth-rules-host",
    displayName: "Host",
  });

  const memberPlayer = await createPlayer({
    dataAccessLayer,
    userId: "rules-member",
    authUserId: "auth-rules-member",
    displayName: "Member",
  });

  const mapData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.MAPS,
    data: {
      name: "Rules Smoke Map",
      description: "",
      countryOrRegion: "Japan",
      customRules: {},
      availableTransportTypes: [],
    },
  });

  const startLocation = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.LOCATIONS,
    data: {
      mapId: mapData.id,
      name: "Start",
      locationType: "city",
      metadata: {},
    },
  });

  const goalLocation = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.LOCATIONS,
    data: {
      mapId: mapData.id,
      name: "Goal",
      locationType: "city",
      metadata: {},
    },
  });

  const gameData = await createGame({
    dataAccessLayer,
    hostPlayerId: hostPlayer.id,
    mapId: mapData.id,
    startLocationId: startLocation.id,
    goalLocationId: goalLocation.id,
    initialMoney: 1000,
    name: "Rules Smoke Game",
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[1] },
  });

  await initializePlayerForGame({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    startLocationId: startLocation.id,
    initialMoney: 1000,
  });
  await initializePlayerForGame({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: hostPlayer.id,
    startLocationId: startLocation.id,
    initialMoney: 1000,
  });

  const canAffordEnough = await canAfford({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    amount: 500,
  });
  const canAffordTooMuch = await canAfford({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    amount: 1500,
  });
  assert.equal(canAffordEnough, true);
  assert.equal(canAffordTooMuch, false);

  const deductedMoney = await deductPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    amount: 120,
  });
  assert.equal(deductedMoney, 880);

  const journeyListByFilters = await listGameJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      departureAfter: "2026-07-10T10:30:00+08:00",
      arrivalBefore: "2026-07-10T12:00:00+08:00",
    },
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(Array.isArray(journeyListByFilters.journeyList), true);
  assert.equal(journeyListByFilters.journeyList.length, 1);
  assert.equal(journeyListByFilters.journeyList[0]?.status, "reserved");

  const incidentRequest = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      journeyId: reservedJourneyData.id,
      status: "pending",
      evidenceList: ["service smoke evidence"],
      actualEndLocationId: goalLocation.id,
      actualEndedAt: "2026-07-10T11:20:00+08:00",
      description: "service smoke",
    },
  });
  const trafficIncidentListByFilters = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      status: "pending",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
      createdAtBefore: "2026-07-10T23:59:59+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(Array.isArray(trafficIncidentListByFilters.requestList), true);
  assert.equal(trafficIncidentListByFilters.requestList.length, 1);
  assert.equal(trafficIncidentListByFilters.requestList[0]?.id, incidentRequest.id);

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.RECORDS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      recordType: "blind_box",
      action: "open",
      payload: {
        openedStatus: true,
        visibleNote: "blind-box-record",
      },
      createdAt: "2026-07-10T10:40:00+08:00",
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.BLIND_BOXES,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      locationId: goalLocation.id,
      status: "opened",
      openedStatus: true,
      openedBy: memberPlayer.id,
      openedAt: "2026-07-10T10:40:00+08:00",
      effectData: {
        effectType: "money",
        operator: "+=",
        value: 10,
      },
      metadata: {},
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      stateType: "free_shop_refresh_count",
      stateData: { count: 1 },
      sourceBlindBoxId: null,
      isConsumed: false,
      createdAt: "2026-07-10T10:45:00+08:00",
    },
  });

  const blindBoxReviewData = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      blindBoxList: { sortBy: "openedAt", sortDirection: "desc", limit: 1 },
      blindBoxEffectLogList: { sortBy: "createdAt", sortDirection: "desc", limit: 1 },
      recordList: { sortBy: "createdAt", sortDirection: "desc", limit: 1 },
    },
  });
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxList.length, 1);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxEffectLogList.length, 0);
  assert.equal(blindBoxReviewData.blindBoxReviewData.recordList.length, 1);

  const playerSpecialStates = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtAfter: "2026-07-10T10:00:00+08:00",
      createdAtBefore: "2026-07-10T23:59:59+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(playerSpecialStates.specialStateList.length, 1);
  assert.equal(playerSpecialStates.specialStateList[0]?.stateType, "free_shop_refresh_count");

  const journeySummary = await getGameJourneySummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeySummary.totalJourneyCount, 2);
  assert.equal(journeySummary.statusCounts.started, 1);
  assert.equal(journeySummary.statusCounts.reserved, 1);
  assert.equal(journeySummary.dueToStartCount, 0);
  assert.equal(journeySummary.dueToCompleteCount, 1);

  const journeyManagementSummary = await getGameJourneyManagementSummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeyManagementSummary.managementSummary.summary.totalJourneyCount, 2);
  assert.equal(journeyManagementSummary.managementSummary.exceptionJourneyCount, 0);
  assert.equal(journeyManagementSummary.managementSummary.actionQueueCount >= 0, true);
  assert.equal(journeyManagementSummary.managementSummary.dueJourneyCompleteCount, 1);

  const journeyActionQueueSummary = await getGameJourneyActionQueueSummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeyActionQueueSummary.actionQueueSummary.actionQueueCount >= 0, true);
  assert.equal(Array.isArray(journeyActionQueueSummary.actionQueueSummary.journeyIdList), true);
  assert.equal(
    journeyActionQueueSummary.actionQueueSummary.journeyIdList.length,
    journeyActionQueueSummary.actionQueueSummary.actionQueueCount,
  );

  const checklist = await getGameChecklist({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(checklist.checklist.pendingTrafficIncidentRequestList.length, 0);
  assert.equal(checklist.checklist.dueReservedJourneyList.length, 0);
  assert.equal(checklist.checklist.dueStartedJourneyList.length, 1);
  assert.equal(checklist.checklist.summary.pendingTrafficIncidentCount, 0);
  assert.equal(checklist.checklist.summary.dueJourneyStartCount, 0);
  assert.equal(checklist.checklist.summary.dueJourneyCompleteCount, 1);
  assert.equal(checklist.checklist.summary.resolvableAuctionCount, 0);

  const overview = await getGameOverview({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(overview.overview.summary.playerCount, 2);
  assert.equal(overview.overview.summary.generalShopItemCount, 0);
  assert.equal(overview.overview.summary.pendingTrafficIncidentCount, 1);
  assert.equal(overview.overview.summary.journeyExceptionCount, 0);

  const managementSnapshot = await getGameManagementSnapshot({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(managementSnapshot.managementSnapshot.summary.playerCount, 2);
  assert.equal(managementSnapshot.managementSnapshot.summary.pendingTrafficIncidentCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.dueJourneyStartCount, 0);
  assert.equal(managementSnapshot.managementSnapshot.summary.dueJourneyCompleteCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.trafficIncidentPendingCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.journeyActionQueueCount >= 0, true);

  await initializeGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    mapId: mapData.id,
  });

  const shopRecord = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.SHOPS,
    filterOptions: { gameId: gameData.id, shopType: "general" },
  });
  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOPS,
    recordId: shopRecord.id,
    data: {
      lastRefreshAt: "2026-07-10T10:00:00+08:00",
      lastRefreshType: "manual",
      priorityBuyerPlayerId: memberPlayer.id,
      priorityStartedAt: "2026-07-10T10:00:00+08:00",
      priorityEndsAt: "2026-07-10T10:05:00+08:00",
      prioritySource: "paid_refresh",
    },
  });

  const timeCheck = await validateJourneyTime({
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:30:00+08:00",
    currentTime: "2026-07-10T09:59:59+08:00",
  });
  const invalidTimeCheck = await validateJourneyTime({
    departureTime: "2026-07-10T10:30:00+08:00",
    arrivalTime: "2026-07-10T10:00:00+08:00",
    currentTime: "2026-07-10T09:59:59+08:00",
  });
  assert.equal(timeCheck.isValid, true);
  assert.equal(invalidTimeCheck.isValid, false);

  const walkingCheck = await validateWalkingJourney({
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:30:00+08:00",
  });
  assert.equal(walkingCheck.isValid, true);

  const taxiCheck = await validateTaxiJourney({
    transportType: "taxi",
    toLocationId: goalLocation.id,
    ticketIdList: ["taxi-ticket"],
  });
  assert.equal(taxiCheck.isValid, true);

  const currentJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T10:00:00+08:00",
      arrivalTime: "2026-07-10T10:30:00+08:00",
      status: "started",
      transportType: "taxi",
      ticketIdList: [],
    },
  });
  const reservedJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T11:00:00+08:00",
      arrivalTime: "2026-07-10T11:30:00+08:00",
      status: "reserved",
      transportType: "walking",
      ticketIdList: [],
    },
  });

  const currentJourneyResult = await getPlayerCurrentJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const reservedJourneyResult = await getPlayerReservedJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  assert.equal(currentJourneyResult.currentJourney?.id, currentJourneyData.id);
  assert.equal(reservedJourneyResult.reservedJourney?.id, reservedJourneyData.id);

  const shopCooldownCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    currentTime: "2026-07-10T10:05:00+08:00",
    refreshType: "manual",
    playerCount: 1,
  });
  assert.equal(shopCooldownCheck.canRefresh, false);

  const priorityShopTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 25,
      basePrice: 80,
      usableMinutes: 25,
      price: 80,
      ratingScore: 1,
      ratingGrade: "C",
      ratingType: "normal_shop",
      status: "listed",
      ticketSource: "shop_refresh",
      metadata: {},
    },
  });

  const priorityShopItem = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.SHOP_ITEMS,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      shopType: "general",
      ticketId: priorityShopTicket.id,
      price: 80,
      status: "listed",
      listedAt: "2026-07-10T10:00:00+08:00",
    },
  });

  let priorityPurchaseBlocked = false;
  try {
    await purchaseGeneralShopTicket({
      dataAccessLayer,
      gameId: gameData.id,
      playerId: hostPlayer.id,
      shopItemId: priorityShopItem.id,
      currentTime: "2026-07-10T10:02:00+08:00",
      canAfford,
      deductPlayerMoney,
      addTicketToPlayer,
    });
  } catch (error) {
    priorityPurchaseBlocked = error?.message === "Shop item is currently reserved for the refresh owner";
  }
  assert.equal(priorityPurchaseBlocked, true);

  const exactLocationSelf = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const exactLocationOther = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(exactLocationSelf.canView, true);
  assert.equal(exactLocationOther.canView, false);

  const publicJourneySelf = await canViewPublicJourney({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const publicJourneyOther = await canViewPublicJourney({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(publicJourneySelf.canView, true);
  assert.equal(publicJourneyOther.canView, false);

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[2] },
  });

  const exactLocationReview = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const publicJourneyReview = await canViewPublicJourney({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(exactLocationReview.canView, true);
  assert.equal(publicJourneyReview.canView, true);

  const recordData = await createRecord({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    recordType: "journey",
    action: "create",
    payload: {
      currentLocationId: "secret-location",
      fullRoute: ["A", "B"],
      privateState: { hidden: true },
      visibleNote: "ok",
    },
  });

  const filteredRecord = await filterRecordDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    recordData,
    visibilityMode: "during_game",
  });

  assert.equal(filteredRecord.payload?.visibleNote, "ok");
  assert.equal(filteredRecord.payload?.currentLocationId, undefined);
  assert.equal(filteredRecord.payload?.fullRoute, undefined);
  assert.equal(filteredRecord.payload?.privateState, undefined);

  const playerRecordsDuringGame = await getPlayerRecords({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    visibilityMode: "during_game",
  });
  const playerRecordsReview = await getPlayerRecords({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(playerRecordsDuringGame.recordList), true);
  assert.equal(Array.isArray(playerRecordsReview.recordList), true);
  assert.equal(playerRecordsDuringGame.recordList.length >= 1, true);
  assert.equal(playerRecordsReview.recordList.length >= 1, true);
  assert.equal(playerRecordsDuringGame.recordList[0]?.payload?.currentLocationId, undefined);
  assert.equal(playerRecordsReview.recordList[0]?.payload?.currentLocationId, "secret-location");

  const gameRecordsDuringGame = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    visibilityMode: "during_game",
  });
  const gameRecordsReview = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(gameRecordsDuringGame.recordList), true);
  assert.equal(Array.isArray(gameRecordsReview.recordList), true);
  assert.equal(gameRecordsDuringGame.recordList.length >= 1, true);
  assert.equal(gameRecordsReview.recordList.length >= 1, true);
  assert.equal(gameRecordsDuringGame.recordList[0]?.payload?.currentLocationId, undefined);
  assert.equal(gameRecordsReview.recordList[0]?.payload?.currentLocationId, "secret-location");

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[2] },
  });

  const reviewRecord = await filterRecordDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    recordData,
    visibilityMode: "post_game_review",
  });
  const adminRecord = await filterRecordDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    recordData,
    visibilityMode: "admin",
  });
  assert.equal(reviewRecord.payload?.currentLocationId, "secret-location");
  assert.equal(reviewRecord.payload?.fullRoute?.length, 2);
  assert.equal(reviewRecord.payload?.privateState?.hidden, true);
  assert.equal(adminRecord.payload?.visibleNote, "ok");
  assert.equal(adminRecord.payload?.currentLocationId, "secret-location");

  const targetPlayerData = {
    playerId: memberPlayer.id,
    currentLocationId: "secret-location",
    privateState: { hidden: true },
    displayName: "Member",
  };
  const filteredPlayerData = await filterPlayerDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerData,
    visibilityMode: "during_game",
  });
  const reviewPlayerData = await filterPlayerDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerData,
    visibilityMode: "post_game_review",
  });
  assert.equal(filteredPlayerData.currentLocationId, undefined);
  assert.equal(filteredPlayerData.privateState, undefined);
  assert.equal(reviewPlayerData.currentLocationId, "secret-location");
  assert.equal(reviewPlayerData.privateState?.hidden, true);

  const hiddenBlindBoxData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.BLIND_BOXES,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      locationId: startLocation.id,
      status: "hidden_effect",
      openedStatus: false,
      openedBy: null,
      openedAt: null,
      effectData: {
        effectType: "money",
        operator: "+=",
        value: 50,
      },
      metadata: {},
    },
  });

  const filteredBlindBox = await filterBlindBoxDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requesterId: hostPlayer.id,
    blindBoxData: hiddenBlindBoxData,
    visibilityMode: "during_game",
  });
  const openedBlindBoxData = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: hiddenBlindBoxData.id,
    data: {
      status: "opened",
      openedStatus: true,
      openedBy: memberPlayer.id,
      openedAt: "2026-07-10T10:20:00+08:00",
    },
  });
  const openedFilteredBlindBox = await filterBlindBoxDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requesterId: hostPlayer.id,
    blindBoxData: openedBlindBoxData,
    visibilityMode: "during_game",
  });
  assert.equal(filteredBlindBox.effectData, undefined);
  assert.equal(openedFilteredBlindBox.openedStatus, true);
  assert.equal(openedFilteredBlindBox.effectData?.effectType, "money");

  const reviewBlindBox = await filterBlindBoxDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requesterId: hostPlayer.id,
    blindBoxData: hiddenBlindBoxData,
    visibilityMode: "post_game_review",
  });
  const adminBlindBox = await filterBlindBoxDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requesterId: hostPlayer.id,
    blindBoxData: hiddenBlindBoxData,
    visibilityMode: "admin",
  });
  assert.equal(reviewBlindBox.openedStatus, false);
  assert.equal(adminBlindBox.openedStatus, false);
  assert.equal(reviewBlindBox.effectData?.value, 50);
  assert.equal(adminBlindBox.effectData?.value, 50);

  const ownedTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 30,
      basePrice: 100,
      usableMinutes: 30,
      price: 100,
      ratingScore: 1,
      ratingGrade: "C",
      ratingType: "normal_shop",
      status: "owned",
      ticketSource: "shop_purchase",
      metadata: {},
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: ownedTicket.id,
      source: "shop_purchase",
      createdAt: "2026-07-10T10:00:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: ownedTicket.id,
      source: "shop_purchase",
      createdAt: "2026-07-09T10:00:00+08:00",
    },
  });

  const playerTickets = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
      ticketId: ownedTicket.id,
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(playerTickets.ticketList.length, 1);

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      stateType: "free_shop_refresh_count",
      stateData: { count: 1 },
      sourceBlindBoxId: null,
      isConsumed: false,
      createdAt: "2026-07-10T10:10:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      stateType: "free_shop_refresh_count",
      stateData: { count: 2 },
      sourceBlindBoxId: null,
      isConsumed: false,
      createdAt: "2026-07-09T10:10:00+08:00",
    },
  });

  const specialStates = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(specialStates.specialStateList.length, 1);

  const freeRefreshEffectResult = await executeFreeShopRefreshEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    freeRefreshCount: 1,
    blindBoxId: null,
  });
  const specialStateToConsume = freeRefreshEffectResult.specialStateData;
  const consumedSpecialState = await consumePlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    stateId: specialStateToConsume.id,
    reason: "service_rules_smoke",
  });
  const consumedSpecialStates = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(Boolean(freeRefreshEffectResult.specialStateData.id), true);
  assert.equal(consumedSpecialState.isConsumed, true);
  assert.equal(consumedSpecialStates.specialStateList.length, 1);
  assert.equal(consumedSpecialStates.specialStateList[0]?.isConsumed, true);

  const auctionTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 90,
      basePrice: 300,
      usableMinutes: 180,
      price: 300,
      ratingScore: 4,
      ratingGrade: "A",
      ratingType: "auction",
      status: "listed",
      ticketSource: "auction_generated",
      metadata: {},
    },
  });

  const auctionRecord = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTIONS,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      shopType: "auction",
      ticketId: auctionTicket.id,
      ticketRatingScore: 4,
      ticketRatingGrade: "A",
      ticketRatingType: "auction",
      startTime: "2026-07-10T12:00:00+08:00",
      endTime: "2026-07-10T12:30:00+08:00",
      status: "active",
      bidCount: 0,
      totalBidAmount: 0,
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTION_BIDS,
    data: {
      gameId: gameData.id,
      auctionId: auctionRecord.id,
      playerId: memberPlayer.id,
      bidAmount: 200,
      createdAt: "2026-07-10T12:10:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTION_BIDS,
    data: {
      gameId: gameData.id,
      auctionId: auctionRecord.id,
      playerId: hostPlayer.id,
      bidAmount: 200,
      createdAt: "2026-07-10T12:11:00+08:00",
    },
  });

  const tieResolvedAuction = await resolveAuction({
    dataAccessLayer,
    gameId: gameData.id,
    auctionId: auctionRecord.id,
    currentTime: "2026-07-10T12:30:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  const destroyedAuctionTicket = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: auctionTicket.id,
  });
  const auctionBidList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.AUCTION_BIDS,
    filterOptions: { auctionId: auctionRecord.id },
  });
  const filteredAuctionBids = await getAuctionBids({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    filterOptions: {
      createdAtAfter: "2026-07-10T12:05:00+08:00",
      createdAtBefore: "2026-07-10T12:30:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(tieResolvedAuction.winnerPlayerId, null);
  assert.equal(tieResolvedAuction.wasDestroyed, true);
  assert.equal(destroyedAuctionTicket.status, "destroyed");
  assert.equal(auctionBidList.length, 2);
  assert.equal(Array.isArray(filteredAuctionBids.bidList), true);
  assert.equal(filteredAuctionBids.bidList.length, 1);
  assert.equal(filteredAuctionBids.bidList[0]?.playerId, hostPlayer.id);

  const journeyTicketData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 45,
      basePrice: 120,
      usableMinutes: 120,
      price: 120,
      ratingScore: 2,
      ratingGrade: "B",
      ratingType: "normal_shop",
      status: "owned",
      ticketSource: "smoke_test",
      metadata: {},
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: journeyTicketData.id,
      source: "smoke_test",
      createdAt: "2026-07-10T11:00:00+08:00",
    },
  });

  const createJourneyCheck = await validateCreateJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: "local_train",
    ticketIdList: [journeyTicketData.id],
    departureTime: "2026-07-10T11:30:00+08:00",
    arrivalTime: "2026-07-10T12:00:00+08:00",
    currentTime: "2026-07-10T11:00:00+08:00",
  });
  assert.equal(createJourneyCheck.isValid, true);
  const invalidCreateJourneyCheck = await validateCreateJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: "local_train",
    ticketIdList: [journeyTicketData.id],
    departureTime: "2026-07-10T12:10:00+08:00",
    arrivalTime: "2026-07-10T12:00:00+08:00",
    currentTime: "2026-07-10T11:00:00+08:00",
  });
  assert.equal(invalidCreateJourneyCheck.isValid, false);

  const createdJourney = await createJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: "local_train",
    ticketIdList: [journeyTicketData.id],
    departureTime: "2026-07-10T11:30:00+08:00",
    arrivalTime: "2026-07-10T12:00:00+08:00",
    currentTime: "2026-07-10T11:00:00+08:00",
    metadata: { source: "service_rules_smoke" },
  });
  assert.equal(Boolean(createdJourney.id), true);

  const fetchedJourney = await getJourney({
    dataAccessLayer,
    journeyId: createdJourney.id,
  });
  assert.equal(fetchedJourney.id, createdJourney.id);

  console.log("journeyTimeCheck", timeCheck.isValid);
  console.log("invalidJourneyTimeCheck", invalidTimeCheck.isValid);
  console.log("walkingJourneyCheck", walkingCheck.isValid);
  console.log("taxiJourneyCheck", taxiCheck.isValid);
  console.log("shopCooldownCheck", shopCooldownCheck.canRefresh);
  console.log("priorityPurchaseBlocked", priorityPurchaseBlocked);
  console.log("exactLocationSelf", exactLocationSelf.canView);
  console.log("exactLocationOther", exactLocationOther.canView);
  console.log("recordVisibilityFiltered", filteredRecord.payload?.visibleNote === "ok");
  console.log("recordVisibilityReview", reviewRecord.payload?.currentLocationId === "secret-location");
  console.log("recordVisibilityAdmin", adminRecord.payload?.currentLocationId === "secret-location");
  console.log("playerRecordsVisibilityReview", playerRecordsReview.recordList[0]?.payload?.currentLocationId === "secret-location");
  console.log("gameRecordsVisibilityReview", gameRecordsReview.recordList[0]?.payload?.currentLocationId === "secret-location");
  console.log("playerVisibilityFiltered", filteredPlayerData.currentLocationId === undefined);
  console.log("playerVisibilityReview", reviewPlayerData.currentLocationId === "secret-location");
  console.log("blindBoxVisibilityFiltered", filteredBlindBox.effectData === undefined);
  console.log("blindBoxVisibilityOpened", openedFilteredBlindBox.effectData?.effectType === "money");
  console.log("blindBoxVisibilityReview", reviewBlindBox.effectData?.value === 50);
  console.log("blindBoxVisibilityAdmin", adminBlindBox.effectData?.value === 50);
  console.log("playerTicketsFiltered", playerTickets.ticketList.length === 1);
  console.log("specialStatesFiltered", specialStates.specialStateList.length === 1);
  console.log("freeRefreshEffectResult", Boolean(freeRefreshEffectResult.specialStateData.id));
  console.log("consumedSpecialState", consumedSpecialState.isConsumed);
  console.log("createJourneyCheck", createJourneyCheck.isValid);
  console.log("invalidCreateJourneyCheck", invalidCreateJourneyCheck.isValid);
  console.log("createdJourney", Boolean(createdJourney.id));
  console.log("fetchedJourney", fetchedJourney.id === createdJourney.id);
  assert.equal(timeCheck.isValid, true);
  assert.equal(invalidTimeCheck.isValid, false);
  assert.equal(walkingCheck.isValid, true);
  assert.equal(taxiCheck.isValid, true);
  assert.equal(shopCooldownCheck.canRefresh, false);
  assert.equal(priorityPurchaseBlocked, true);
  assert.equal(exactLocationSelf.canView, true);
  assert.equal(exactLocationOther.canView, false);
  assert.equal(recordVisibilityFiltered.payload?.visibleNote, "ok");
  assert.equal(recordVisibilityReview.payload?.currentLocationId, "secret-location");
  assert.equal(recordVisibilityAdmin.payload?.currentLocationId, "secret-location");
  assert.equal(playerRecordsVisibilityReview, true);
  assert.equal(gameRecordsVisibilityReview, true);
  assert.equal(filteredPlayerData.currentLocationId, undefined);
  assert.equal(reviewPlayerData.currentLocationId, "secret-location");
  assert.equal(filteredBlindBox.effectData, undefined);
  assert.equal(openedFilteredBlindBox.effectData?.effectType, "money");
  assert.equal(reviewBlindBox.effectData?.value, 50);
  assert.equal(adminBlindBox.effectData?.value, 50);
  assert.equal(playerTickets.ticketList.length, 1);
  assert.equal(specialStates.specialStateList.length, 1);
  assert.equal(Boolean(freeRefreshEffectResult.specialStateData.id), true);
  assert.equal(consumedSpecialState.isConsumed, true);
  assert.equal(createJourneyCheck.isValid, true);
  assert.equal(invalidCreateJourneyCheck.isValid, false);
  assert.equal(Boolean(createdJourney.id), true);
  assert.equal(fetchedJourney.id, createdJourney.id);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
