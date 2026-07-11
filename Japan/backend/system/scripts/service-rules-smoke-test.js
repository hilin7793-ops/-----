import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import { CollectionName, GameStatus, createGame, createPlayer, createRecord } from "../src/index.js";
import {
  createMap,
  updateMap,
  deleteMap,
  getMap,
  listMaps,
  addLocation,
  updateLocation,
  removeLocation,
  listLocations,
  setStartLocation,
  setGoalLocation,
  setAvailableTransportTypes,
  getStartLocation,
  getGoalLocation,
  getAvailableTransportTypes,
  setSpecialRules,
  getSpecialRules,
} from "../src/services/maps/mapService.js";
import {
  canStartGame,
  startGame,
  checkGameEndCondition,
  recordPlayerArrival,
  endGame,
  getRanking,
  determineWinner,
  processGameTimeEvents,
} from "../src/services/games/gameService.js";
import {
  processAllScheduledEvents,
  processGameChecklistActions,
  processShopScheduledEvents,
} from "../src/services/events/scheduledEventService.js";
import {
  getCurrentTime,
  isOnTheHour,
  isOnAuctionStartTime,
  isWithinTimeRange,
  calculateDurationMinutes,
  hasReachedTime,
} from "../src/services/time/timeService.js";
import {
  createJourney,
  getJourney,
  getGameJourneyDashboard,
  getPlayerCurrentJourney,
  getPlayerReservedJourney,
  getGameJourneyExceptionList,
  cancelJourney,
  completeJourney,
  validateTicketOwnership,
  validateTicketCombination,
  validateTicketNotReserved,
  validateTicketTimeEnoughForJourney,
  reserveTickets,
  releaseReservedTickets,
  listPlayerJourneys,
  listGameJourneys,
  getGameJourneyManagementSummary,
  getGameJourneyActionQueueSummary,
  processJourneyTimeEvents,
  canViewPublicJourney,
  validateCreateJourney,
  validateJourneyTime,
  validateTaxiJourney,
  validateWalkingJourney,
} from "../src/services/journeys/journeyService.js";
import {
  consumeTickets,
  createReturnedTicket,
  calculateNormalShopTicketRating,
  calculateAuctionTicketRating,
  getTicketGenerationRules,
  calculateTicketUsableMinutes,
  calculateTicketPrice,
  calculateTicketRating,
  generateTicketBatch,
  destroyTicket,
} from "../src/services/tickets/ticketGenerationService.js";
import {
  consumePlayerBlindBoxSpecialState,
  executeFreeShopRefreshEffect,
  getPlayerBlindBoxSpecialStates,
  addPlayerBlindBoxSpecialState,
  createBlindBoxBatch,
  deleteBlindBoxBatch,
  updateBlindBoxBatch,
  openBlindBox,
  getPublicBlindBoxInfo,
  evaluateBlindBoxCondition,
  executeMoneyEffect,
  executeConditionalBlindBoxEffect,
  executeRandomTicketGainEffect,
  executeRandomTicketLossEffect,
  canOpenBlindBox,
  executeFreeShopTicketEffect,
  executeGainNextAuctionBidPoolEffect,
  listBlindBoxes,
} from "../src/services/blindBoxes/blindBoxService.js";
import { addPlayerMoney, addTicketToPlayer, canAfford, deductPlayerMoney, getPlayerMoney, getPlayerTickets, initializePlayerForGame, hasReachedGoal } from "../src/services/players/playerService.js";
import { assertGameHostAccess, assertSelfAccess } from "../src/services/auth/accessControlService.js";
import { getGameAccessProfile } from "../src/services/auth/accessControlService.js";
import { resolveAuction, awardAuctionTicket, destroyAuctionTicket, hasPlayerBid, placeBid } from "../src/services/shops/auctionShopService.js";
import { canRefreshGeneralShop, clearGeneralShopPriorityState, getGeneralShopPriorityState, initializeGeneralShop, isGeneralShopOpen, purchaseGeneralShopTicket } from "../src/services/shops/generalShopService.js";
import { removeGeneralShopItem } from "../src/services/shops/generalShopService.js";
import { getGameChecklist } from "../src/services/overview/checklistService.js";
import { getGameManagementSnapshot, getGameOverview } from "../src/services/overview/overviewService.js";
import { getAggregatedGameReviewData } from "../src/services/review/reviewService.js";
import {
  getTrafficIncidentReviewSummary,
  submitTrafficIncidentRequest,
  approveTrafficIncidentRequest,
  calculateReturnedTicketTime,
} from "../src/services/trafficIncidents/trafficIncidentService.js";
import { canViewPlayerExactLocation, canViewPlayerFullRoute, filterPlayerDataByVisibility, filterRecordDataByVisibility } from "../src/services/visibility/visibilityService.js";
import { filterBlindBoxDataByVisibility, getPublicJourneyInfo } from "../src/services/visibility/visibilityService.js";
import { getPlayerRecords, getGameRecords } from "../src/services/records/recordService.js";
import { getPublicRecordsDuringGame, getPostGameReviewData } from "../src/services/records/recordService.js";
import { getBlindBoxReviewData } from "../src/services/blindBoxes/blindBoxService.js";
import { listTrafficIncidentRequests } from "../src/services/trafficIncidents/trafficIncidentService.js";
import { canCreateAuctionRound, getAuctionBids, getCurrentAuction, initializeAuctionShop, isAuctionShopOpenForNewAuction } from "../src/services/shops/auctionShopService.js";
import { getGeneralShopItems } from "../src/services/shops/generalShopService.js";

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

  const canStartBeforePlayerJoinCheck = await canStartGame({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T06:00:00+08:00",
  });
  assert.equal(canStartBeforePlayerJoinCheck.canStart, true);

  const startedGameData = await startGame({
    dataAccessLayer,
    gameId: gameData.id,
    startTime: "2026-07-10T06:00:00+08:00",
  });
  const canStartAfterStartCheck = await canStartGame({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T06:00:00+08:00",
  });
  assert.equal(startedGameData.status, "started");
  assert.equal(canStartAfterStartCheck.canStart, false);

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
  const playerMoney = await getPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  assert.equal(canAffordEnough, true);
  assert.equal(canAffordTooMuch, false);
  assert.equal(playerMoney.money, 1000);

  const currentTimeData = await getCurrentTime();
  const onTheHourCheck = await isOnTheHour({
    currentTime: "2026-07-10T06:00:00+08:00",
    timeZone: "Asia/Taipei",
  });
  const auctionStartCheck = await isOnAuctionStartTime({
    currentTime: "2026-07-10T06:30:00+08:00",
    timeZone: "Asia/Taipei",
  });
  const timeRangeCheck = await isWithinTimeRange({
    currentTime: "2026-07-10T06:15:00+08:00",
    startTime: "2026-07-10T06:00:00+08:00",
    endTime: "2026-07-10T06:30:00+08:00",
  });
  const durationCheck = await calculateDurationMinutes({
    startTime: "2026-07-10T06:00:00+08:00",
    endTime: "2026-07-10T06:45:00+08:00",
  });
  const reachedTimeCheck = await hasReachedTime({
    currentTime: "2026-07-10T06:45:00+08:00",
    targetTime: "2026-07-10T06:30:00+08:00",
  });
  assert.equal(typeof currentTimeData.currentTime, "string");
  assert.equal(onTheHourCheck.isOnTheHour, true);
  assert.equal(auctionStartCheck.isAuctionStartTime, true);
  assert.equal(timeRangeCheck.isWithinRange, true);
  assert.equal(durationCheck.durationMinutes, 45);
  assert.equal(reachedTimeCheck.hasReached, true);

  const hostAccessProfile = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { playerId: hostPlayer.id, source: "test" },
    targetPlayerId: memberPlayer.id,
  });
  const memberAccessProfile = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { playerId: memberPlayer.id, source: "test" },
    targetPlayerId: memberPlayer.id,
  });
  const anonymousAccessProfile = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: null,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(hostAccessProfile.canObserveGame, true);
  assert.equal(hostAccessProfile.canReviewGame, true);
  assert.equal(hostAccessProfile.canManageGame, true);
  assert.equal(memberAccessProfile.canObserveGame, true);
  assert.equal(memberAccessProfile.canReviewGame, true);
  assert.equal(memberAccessProfile.canManageGame, false);
  assert.equal(memberAccessProfile.canAccessTargetPlayerSelfData, true);
  assert.equal(anonymousAccessProfile.canObserveGame, false);
  assert.equal(anonymousAccessProfile.canReviewGame, false);

  const createdMap = await createMap({
    dataAccessLayer,
    mapName: "Created Rules Map",
    description: "created map",
    countryOrRegion: "Japan",
    customRules: { speed: 1 },
    availableTransportTypes: ["walking", "local_train", "walking"],
  });
  assert.equal(createdMap.name, "Created Rules Map");
  assert.deepEqual(createdMap.availableTransportTypes, ["walking", "local_train"]);

  const updatedMap = await updateMap({
    dataAccessLayer,
    mapId: createdMap.id,
    mapName: "Updated Rules Map",
    description: "updated map",
    countryOrRegion: "Taiwan",
    customRules: { speed: 2 },
    availableTransportTypes: ["taxi"],
  });
  assert.equal(updatedMap.name, "Updated Rules Map");
  assert.equal(updatedMap.countryOrRegion, "Taiwan");
  assert.deepEqual(updatedMap.availableTransportTypes, ["taxi"]);

  const fetchedMap = await getMap({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  assert.equal(fetchedMap.id, createdMap.id);
  assert.equal(fetchedMap.customRules.speed, 2);

  const availableTransportTypesResult = await getAvailableTransportTypes({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  assert.deepEqual(availableTransportTypesResult.transportTypeList, ["taxi"]);

  const updatedSpecialRules = await setSpecialRules({
    dataAccessLayer,
    mapId: createdMap.id,
    specialRules: { weather: "rainy", speed: 3 },
  });
  const specialRulesResult = await getSpecialRules({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  assert.equal(updatedSpecialRules.customRules.speed, 3);
  assert.equal(specialRulesResult.specialRules.weather, "rainy");
  assert.equal(specialRulesResult.specialRules.speed, 3);

  const listMapsResult = await listMaps({
    dataAccessLayer,
    filterOptions: {
      countryOrRegion: "Taiwan",
    },
    queryOptions: {
      sortBy: "name",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(listMapsResult.mapList.length >= 1, true);
  assert.equal(listMapsResult.mapList[0]?.id, createdMap.id);

  const addedLocation = await addLocation({
    dataAccessLayer,
    mapId: createdMap.id,
    locationName: "Created Location",
    locationType: "city",
    metadata: { zone: "A" },
  });
  const updatedLocation = await updateLocation({
    dataAccessLayer,
    locationId: addedLocation.id,
    locationName: "Updated Location",
    locationType: "station",
    metadata: { zone: "B" },
  });
  assert.equal(updatedLocation.name, "Updated Location");
  assert.equal(updatedLocation.locationType, "station");
  assert.equal(updatedLocation.metadata.zone, "B");

  const listedLocations = await listLocations({
    dataAccessLayer,
    mapId: createdMap.id,
    filterOptions: {
      locationName: "Updated Location",
      locationType: "station",
    },
    queryOptions: {
      sortBy: "name",
      sortDirection: "asc",
      limit: 1,
    },
  });
  assert.equal(listedLocations.locationList.length, 1);
  assert.equal(listedLocations.locationList[0]?.id, addedLocation.id);

  const setStartLocationResult = await setStartLocation({
    dataAccessLayer,
    mapId: createdMap.id,
    locationId: addedLocation.id,
  });
  const setGoalLocationResult = await setGoalLocation({
    dataAccessLayer,
    mapId: createdMap.id,
    locationId: goalLocation.id,
  });
  const setAvailableTransportTypesResult = await setAvailableTransportTypes({
    dataAccessLayer,
    mapId: createdMap.id,
    transportTypeList: ["taxi", "walking", "taxi"],
  });
  assert.equal(setStartLocationResult.startLocation, addedLocation.id);
  assert.equal(setGoalLocationResult.goalLocation, goalLocation.id);
  assert.deepEqual(setAvailableTransportTypesResult.availableTransportTypes, ["taxi", "walking"]);
  const startLocationResult = await getStartLocation({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  const goalLocationResult = await getGoalLocation({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  assert.equal(startLocationResult.startLocation, addedLocation.id);
  assert.equal(goalLocationResult.goalLocation, goalLocation.id);

  const removedLocation = await removeLocation({
    dataAccessLayer,
    mapId: createdMap.id,
    locationId: addedLocation.id,
  });
  assert.equal(removedLocation.success, true);
  assert.equal(removedLocation.removedLocationId, addedLocation.id);

  const deletedMap = await deleteMap({
    dataAccessLayer,
    mapId: createdMap.id,
  });
  assert.equal(deletedMap.success, true);
  assert.equal(deletedMap.deletedMapId, createdMap.id);

  let forbiddenHostAccess = null;
  try {
    await assertGameHostAccess({
      dataAccessLayer,
      gameId: gameData.id,
      authContext: { playerId: memberPlayer.id, source: "test" },
    });
  } catch (error) {
    forbiddenHostAccess = error;
  }
  assert.equal(forbiddenHostAccess?.code, "FORBIDDEN");

  let forbiddenSelfAccess = null;
  try {
    await assertSelfAccess({
      authContext: { playerId: memberPlayer.id, source: "test" },
      targetPlayerId: hostPlayer.id,
      detail: { gameId: gameData.id },
    });
  } catch (error) {
    forbiddenSelfAccess = error;
  }
  assert.equal(forbiddenSelfAccess?.code, "FORBIDDEN");

  let anonymousHostAccess = null;
  try {
    await assertGameHostAccess({
      dataAccessLayer,
      gameId: gameData.id,
      authContext: null,
    });
  } catch (error) {
    anonymousHostAccess = error;
  }
  assert.equal(anonymousHostAccess?.code, "FORBIDDEN");

  let anonymousSelfAccess = null;
  try {
    await assertSelfAccess({
      authContext: null,
      targetPlayerId: hostPlayer.id,
      detail: { gameId: gameData.id },
    });
  } catch (error) {
    anonymousSelfAccess = error;
  }
  assert.equal(anonymousSelfAccess?.code, "FORBIDDEN");

  const deductedMoney = await deductPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    amount: 120,
  });
  const addedMoney = await addPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    amount: 70,
  });
  const playerMoneyAfterAdjustments = await getPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  assert.equal(deductedMoney, 880);
  assert.equal(addedMoney, 950);
  assert.equal(playerMoneyAfterAdjustments.money, 950);

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
  const journeyListByCompositeFilters = await listGameJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      status: "reserved",
      transportType: "walking",
      departureAfter: "2026-07-10T10:30:00+08:00",
      arrivalBefore: "2026-07-10T12:30:00+08:00",
    },
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(journeyListByCompositeFilters.journeyList), true);
  assert.equal(journeyListByCompositeFilters.journeyList.length, 1);
  assert.equal(journeyListByCompositeFilters.journeyList[0]?.status, "reserved");
  assert.equal(journeyListByCompositeFilters.journeyList[0]?.transportType, "walking");
  const journeyListByFullCompositeFilters = await listGameJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      status: "reserved",
      transportType: "walking",
      departureAfter: "2026-07-10T10:30:00+08:00",
      departureBefore: "2026-07-10T11:15:00+08:00",
      arrivalAfter: "2026-07-10T11:00:00+08:00",
      arrivalBefore: "2026-07-10T12:30:00+08:00",
    },
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(journeyListByFullCompositeFilters.journeyList), true);
  assert.equal(journeyListByFullCompositeFilters.journeyList.length, 1);
  assert.equal(journeyListByFullCompositeFilters.journeyList[0]?.status, "reserved");
  assert.equal(journeyListByFullCompositeFilters.journeyList[0]?.transportType, "walking");
  const journeyListWithUpperBound = await listGameJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      departureBefore: "2026-07-10T10:45:00+08:00",
    },
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(journeyListWithUpperBound.journeyList), true);
  assert.equal(journeyListWithUpperBound.journeyList.length >= 1, true);
  assert.equal(journeyListWithUpperBound.journeyList[0]?.departureTime <= "2026-07-10T10:45:00+08:00", true);

  const pagedJourneyList = await listGameJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
  });
  assert.equal(Array.isArray(pagedJourneyList.journeyList), true);
  assert.equal(pagedJourneyList.journeyList.length, 1);
  assert.equal(pagedJourneyList.journeyList[0]?.status, "started");

  const playerJourneyListByFilters = await listPlayerJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      departureAfter: "2026-07-10T10:30:00+08:00",
      arrivalBefore: "2026-07-10T12:00:00+08:00",
    },
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "desc",
      limit: 1,
      offset: 0,
    },
  });
  assert.equal(Array.isArray(playerJourneyListByFilters.journeyList), true);
  assert.equal(playerJourneyListByFilters.journeyList.length, 1);
  assert.equal(playerJourneyListByFilters.journeyList[0]?.status, "reserved");
  const playerJourneyListWithArrivalLowerBound = await listPlayerJourneys({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      arrivalAfter: "2026-07-10T11:45:00+08:00",
    },
    queryOptions: {
      sortBy: "arrivalTime",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(playerJourneyListWithArrivalLowerBound.journeyList), true);
  assert.equal(playerJourneyListWithArrivalLowerBound.journeyList.length >= 1, true);
  assert.equal(playerJourneyListWithArrivalLowerBound.journeyList[0]?.arrivalTime >= "2026-07-10T11:45:00+08:00", true);

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
    collectionName: CollectionName.BLIND_BOX_EFFECT_LOGS,
    data: {
      gameId: gameData.id,
      blindBoxId: hiddenBlindBoxData.id,
      playerId: memberPlayer.id,
      actionType: "create_effect",
      actionData: {
        effectType: "money",
        value: 50,
      },
      createdAt: "2026-07-10T10:41:00+08:00",
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
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxEffectLogList.length, 1);
  assert.equal(blindBoxReviewData.blindBoxReviewData.recordList.length, 1);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxList[0]?.gameId, gameData.id);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxList[0]?.openedStatus, true);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxList[0]?.locationId, goalLocation.id);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxEffectLogList[0]?.gameId, gameData.id);
  assert.equal(blindBoxReviewData.blindBoxReviewData.blindBoxEffectLogList[0]?.actionType, "create_effect");
  assert.equal(blindBoxReviewData.blindBoxReviewData.recordList[0]?.gameId, gameData.id);
  assert.equal(blindBoxReviewData.blindBoxReviewData.recordList[0]?.recordType, "blind_box");
  const blindBoxReviewComposite = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      blindBoxList: { sortBy: "openedAt", sortDirection: "desc", limit: 10 },
      blindBoxEffectLogList: { sortBy: "createdAt", sortDirection: "desc", limit: 10 },
      recordList: { sortBy: "createdAt", sortDirection: "desc", limit: 10 },
    },
  });
  assert.equal(Array.isArray(blindBoxReviewComposite.blindBoxReviewData.blindBoxList), true);
  assert.equal(blindBoxReviewComposite.blindBoxReviewData.blindBoxList.length >= 1, true);
  assert.equal(blindBoxReviewComposite.blindBoxReviewData.blindBoxList[0]?.locationId, goalLocation.id);
  assert.equal(blindBoxReviewComposite.blindBoxReviewData.blindBoxList[0]?.openedStatus, true);
  const blindBoxReviewFullComposite = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      blindBoxList: {
        sortBy: "openedAt",
        sortDirection: "desc",
        limit: 10,
      },
      blindBoxEffectLogList: {
        sortBy: "createdAt",
        sortDirection: "desc",
        limit: 10,
      },
      recordList: {
        sortBy: "createdAt",
        sortDirection: "desc",
        limit: 10,
      },
    },
  });
  assert.equal(Array.isArray(blindBoxReviewFullComposite.blindBoxReviewData.blindBoxList), true);
  assert.equal(blindBoxReviewFullComposite.blindBoxReviewData.blindBoxList.length >= 1, true);
  assert.equal(blindBoxReviewFullComposite.blindBoxReviewData.blindBoxList[0]?.openedStatus, true);
  assert.equal(blindBoxReviewFullComposite.blindBoxReviewData.blindBoxList[0]?.locationId, goalLocation.id);
  const blindBoxReviewWithUpperBound = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      blindBoxList: { sortBy: "openedAt", sortDirection: "desc", limit: 2 },
      blindBoxEffectLogList: { sortBy: "createdAt", sortDirection: "desc", limit: 2 },
      recordList: { sortBy: "createdAt", sortDirection: "desc", limit: 2 },
    },
  });
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.blindBoxList.length >= 1, true);
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.blindBoxList.length <= 2, true);
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.blindBoxEffectLogList.length >= 1, true);
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.blindBoxEffectLogList.length <= 2, true);
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.recordList.length >= 1, true);
  assert.equal(blindBoxReviewWithUpperBound.blindBoxReviewData.recordList.length <= 2, true);
  const blindBoxReviewFilteredData = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      blindBoxList: { sortBy: "openedAt", sortDirection: "desc", limit: 2 },
      blindBoxEffectLogList: { sortBy: "createdAt", sortDirection: "desc", limit: 2 },
      recordList: { sortBy: "createdAt", sortDirection: "desc", limit: 2 },
    },
  });
  assert.equal(blindBoxReviewFilteredData.blindBoxReviewData.blindBoxList.length >= 1, true);
  assert.equal(blindBoxReviewFilteredData.blindBoxReviewData.blindBoxEffectLogList.length >= 1, true);
  assert.equal(blindBoxReviewFilteredData.blindBoxReviewData.recordList.length >= 1, true);

  const openBlindBoxTarget = await dataAccessLayer.createRecordInCollection({
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
        value: 20,
      },
      metadata: {},
    },
  });
  const canOpenBlindBoxCheck = await canOpenBlindBox({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    currentTime: "2026-07-10T10:41:00+08:00",
    getPlayerLocation: async () => startLocation.id,
    getGame: async () => gameData,
  });
  const openBlindBoxResult = await openBlindBox({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    currentTime: "2026-07-10T10:42:00+08:00",
    getPlayerLocation: async () => startLocation.id,
    getGame: async () => gameData,
    executeBlindBoxEffect: async ({ effectData }) => ({
      effectType: effectData.effectType,
      appliedValue: effectData.value,
    }),
  });
  const openedBlindBoxRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: openBlindBoxTarget.id,
  });
  const canOpenBlindBoxAfterResult = await canOpenBlindBox({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    currentTime: "2026-07-10T10:43:00+08:00",
    getPlayerLocation: async () => startLocation.id,
    getGame: async () => gameData,
  });
  const canOpenBlindBoxMismatch = await canOpenBlindBox({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    currentTime: "2026-07-10T10:43:00+08:00",
    getPlayerLocation: async () => goalLocation.id,
    getGame: async () => gameData,
  });
  const canOpenBlindBoxNotStarted = await canOpenBlindBox({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    currentTime: "2026-07-10T10:43:00+08:00",
    getPlayerLocation: async () => startLocation.id,
    getGame: async () => ({ status: GameStatus[0] }),
  });
  assert.equal(openBlindBoxResult.success, true);
  assert.equal(canOpenBlindBoxCheck.canOpen, true);
  assert.equal(openBlindBoxResult.openedBlindBoxData.openedStatus, true);
  assert.equal(openBlindBoxResult.openedBlindBoxData.openedBy, memberPlayer.id);
  assert.equal(openBlindBoxResult.openedBlindBoxData.status, "opened");
  assert.equal(openBlindBoxResult.effectResult.effectType, "money");
  assert.equal(openBlindBoxResult.effectResult.appliedValue, 20);
  assert.equal(openedBlindBoxRecord.status, "removed");
  assert.equal(canOpenBlindBoxAfterResult.canOpen, false);
  assert.equal(canOpenBlindBoxAfterResult.reason, "Blind box already opened");
  assert.equal(canOpenBlindBoxMismatch.canOpen, false);
  assert.equal(canOpenBlindBoxMismatch.reason, "Blind box already opened");
  assert.equal(canOpenBlindBoxNotStarted.canOpen, false);
  assert.equal(canOpenBlindBoxNotStarted.reason, "Game has not started");
  const blindBoxConditionCheck = await evaluateBlindBoxCondition({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    conditionData: {
      field: "money",
      operator: ">=",
      value: 800,
    },
  });
  const moneyEffectResult = await executeMoneyEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    operator: "+=",
    value: 25,
  });
  const playerMoneyAfterBlindBoxEffect = await getPlayerMoney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const conditionalBlindBoxResult = await executeConditionalBlindBoxEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: openBlindBoxTarget.id,
    conditionData: {
      field: "money",
      operator: ">=",
      value: 825,
    },
    thenEffectData: {
      effectType: "money",
      operator: "+=",
      value: 10,
    },
    elseEffectData: {
      effectType: "money",
      operator: "-=",
      value: 10,
    },
  });
  const randomTicketGainResult = await executeRandomTicketGainEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const randomTicketLossResult = await executeRandomTicketLossEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const publicBlindBoxInfo = await getPublicBlindBoxInfo({
    dataAccessLayer,
    gameId: gameData.id,
    queryOptions: {
      sortBy: "openedAt",
      sortDirection: "desc",
      limit: 2,
    },
  });
  assert.equal(Array.isArray(publicBlindBoxInfo.publicBlindBoxList), true);
  assert.equal(publicBlindBoxInfo.publicBlindBoxList.length >= 1, true);
  assert.equal(publicBlindBoxInfo.publicBlindBoxList[0]?.openedStatus, true);
  assert.equal(publicBlindBoxInfo.publicBlindBoxList[0]?.locationId, startLocation.id);
  const publicBlindBoxListByCompositeFilters = await listBlindBoxes({
    dataAccessLayer,
    gameId: gameData.id,
    visibilityMode: "player",
    filterOptions: {
      openedStatus: true,
      locationId: startLocation.id,
    },
    queryOptions: {
      sortBy: "openedAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(publicBlindBoxListByCompositeFilters.blindBoxList), true);
  assert.equal(publicBlindBoxListByCompositeFilters.blindBoxList.length >= 1, true);
  assert.equal(publicBlindBoxListByCompositeFilters.blindBoxList[0]?.openedStatus, true);
  assert.equal(publicBlindBoxListByCompositeFilters.blindBoxList[0]?.locationId, startLocation.id);
  let blindBoxAdminVisibilityBlocked = null;
  try {
    await listBlindBoxes({
      dataAccessLayer,
      gameId: gameData.id,
      requesterId: memberPlayer.id,
      visibilityMode: "admin",
    });
  } catch (error) {
    blindBoxAdminVisibilityBlocked = error;
  }
  assert.equal(blindBoxAdminVisibilityBlocked?.code, "FORBIDDEN");
  assert.equal(blindBoxConditionCheck.conditionMatched, true);
  assert.equal(blindBoxConditionCheck.evaluatedValue, 1000);
  assert.equal(moneyEffectResult.moneyChange, 25);
  assert.equal(moneyEffectResult.effectApplied, true);
  assert.equal(playerMoneyAfterBlindBoxEffect.money, 975);
  assert.equal(conditionalBlindBoxResult.conditionMatched, true);
  assert.equal(conditionalBlindBoxResult.effectResult.effectApplied, true);
  assert.equal(Boolean(randomTicketGainResult.gainedTicketData.id), true);
  assert.equal(randomTicketGainResult.effectApplied, true);
  assert.equal(randomTicketGainResult.gainedTicketData.ownerPlayerId, memberPlayer.id);
  assert.equal(randomTicketGainResult.gainedTicketData.status, "held");
  assert.equal(randomTicketLossResult.effectApplied, true);
  assert.equal(Boolean(randomTicketLossResult.removedTicketData?.id), true);

  const blindBoxBatchResult = await createBlindBoxBatch({
    dataAccessLayer,
    gameId: gameData.id,
    createdBy: hostPlayer.id,
    blindBoxConfigList: [
      {
        locationId: goalLocation.id,
        effectData: {
          effectType: "money",
          operator: "+=",
          value: 5,
        },
      },
      {
        locationId: startLocation.id,
        effectData: {
          effectType: "gain_free_shop_refresh",
          freeRefreshCount: 1,
        },
      },
    ],
  });
  assert.equal(Array.isArray(blindBoxBatchResult.blindBoxList), true);
  assert.equal(blindBoxBatchResult.blindBoxList.length, 2);

  const blindBoxUpdateBatchResult = await updateBlindBoxBatch({
    dataAccessLayer,
    gameId: gameData.id,
    updatedBy: hostPlayer.id,
    blindBoxUpdateList: blindBoxBatchResult.blindBoxList.map((item, index) => ({
      blindBoxId: item.id,
      locationId: index === 0 ? startLocation.id : goalLocation.id,
      effectData: index === 0
        ? {
            effectType: "money",
            operator: "+=",
            value: 8,
          }
        : {
            effectType: "gain_free_shop_refresh",
            freeRefreshCount: 2,
          },
    })),
  });
  assert.equal(blindBoxUpdateBatchResult.success, true);
  assert.equal(blindBoxUpdateBatchResult.updatedCount, 2);
  assert.equal(blindBoxUpdateBatchResult.blindBoxList.length, 2);

  const blindBoxDeleteBatchResult = await deleteBlindBoxBatch({
    dataAccessLayer,
    gameId: gameData.id,
    blindBoxIdList: blindBoxUpdateBatchResult.blindBoxList.map((item) => item.id),
    deletedBy: hostPlayer.id,
  });
  assert.equal(blindBoxDeleteBatchResult.success, true);
  assert.equal(blindBoxDeleteBatchResult.deletedCount, 2);
  assert.equal(blindBoxDeleteBatchResult.resultList.length, 2);

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
  assert.equal(playerSpecialStates.specialStateList[0]?.gameId, gameData.id);
  assert.equal(playerSpecialStates.specialStateList[0]?.playerId, memberPlayer.id);
  assert.equal(playerSpecialStates.specialStateList[0]?.stateType, "free_shop_refresh_count");
  assert.equal(playerSpecialStates.specialStateList[0]?.isConsumed, false);

  const journeySummary = await getGameJourneySummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeySummary.gameId, gameData.id);
  assert.equal(journeySummary.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(journeySummary.totalJourneyCount, 2);
  assert.equal(journeySummary.statusCounts.started, 1);
  assert.equal(journeySummary.statusCounts.reserved, 1);
  assert.equal(journeySummary.transportTypeCounts.walking, 1);
  assert.equal(journeySummary.transportTypeCounts.local_train, 1);
  assert.equal(journeySummary.lockedCount, 0);
  assert.equal(journeySummary.unlockedCount, 2);
  assert.equal(journeySummary.dueToStartCount, 0);
  assert.equal(journeySummary.dueToCompleteCount, 1);

  const journeyManagementSummary = await getGameJourneyManagementSummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeyManagementSummary.managementSummary.gameId, gameData.id);
  assert.equal(journeyManagementSummary.managementSummary.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(journeyManagementSummary.managementSummary.summary.totalJourneyCount, 2);
  assert.equal(journeyManagementSummary.managementSummary.summary.gameId, gameData.id);
  assert.equal(journeyManagementSummary.managementSummary.summary.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(journeyManagementSummary.managementSummary.checklistSummary.dueJourneyStartCount, 0);
  assert.equal(journeyManagementSummary.managementSummary.checklistSummary.dueJourneyCompleteCount, 1);
  assert.equal(journeyManagementSummary.managementSummary.exceptionJourneyCount, 0);
  assert.equal(journeyManagementSummary.managementSummary.actionQueueCount >= 0, true);
  assert.equal(journeyManagementSummary.managementSummary.lockedReservedJourneyCount, 1);
  assert.equal(journeyManagementSummary.managementSummary.incidentPendingJourneyCount, 0);
  assert.equal(journeyManagementSummary.managementSummary.dueJourneyCompleteCount, 1);

  const lockedReservedJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T09:30:00+08:00",
      arrivalTime: "2026-07-10T10:00:00+08:00",
      status: "reserved",
      transportType: "walking",
      ticketIdList: [],
      isLocked: true,
    },
  });

  const journeyDashboard = await getGameJourneyDashboard({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeyDashboard.dashboard.gameId, gameData.id);
  assert.equal(journeyDashboard.dashboard.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(journeyDashboard.dashboard.summary.totalJourneyCount, 3);
  assert.equal(journeyDashboard.dashboard.checklistSummary.lockedReservedJourneyCount, 1);
  assert.equal(journeyDashboard.dashboard.checklistSummary.dueJourneyStartCount, 1);
  assert.equal(journeyDashboard.dashboard.checklistSummary.dueJourneyCompleteCount, 1);
  assert.equal(journeyDashboard.dashboard.checklistSummary.incidentPendingJourneyCount, 0);
  assert.equal(journeyDashboard.dashboard.actionQueue.some((item) => item.journeyId === lockedReservedJourneyData.id), true);
  assert.equal(
    journeyDashboard.dashboard.actionQueue.find((item) => item.journeyId === lockedReservedJourneyData.id)?.playerId,
    memberPlayer.id,
  );
  assert.equal(
    journeyDashboard.dashboard.actionQueue.find((item) => item.journeyId === lockedReservedJourneyData.id)?.status,
    "reserved",
  );
  assert.equal(
    journeyDashboard.dashboard.actionQueue.find((item) => item.journeyId === lockedReservedJourneyData.id)?.suggestedActionList.includes("unlock_journey"),
    true,
  );

  const journeyExceptionList = await getGameJourneyExceptionList({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
    queryOptions: {
      sortBy: "departureTime",
      sortDirection: "asc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(journeyExceptionList.exceptionJourneyList), true);
  assert.equal(journeyExceptionList.exceptionJourneyList.length >= 1, true);
  assert.equal(
    journeyExceptionList.exceptionJourneyList.some((journey) => journey.id === lockedReservedJourneyData.id && journey.exceptionReasonList.includes("locked_reserved")),
    true,
  );
  assert.equal(
    journeyExceptionList.exceptionJourneyList.some((journey) => journey.exceptionReasonList.includes("due_to_complete")),
    true,
  );

  const journeyActionQueueSummary = await getGameJourneyActionQueueSummary({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(journeyActionQueueSummary.actionQueueSummary.gameId, gameData.id);
  assert.equal(journeyActionQueueSummary.actionQueueSummary.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(journeyActionQueueSummary.actionQueueSummary.actionQueueCount >= 0, true);
  assert.equal(Array.isArray(journeyActionQueueSummary.actionQueueSummary.journeyIdList), true);
  assert.equal(
    journeyActionQueueSummary.actionQueueSummary.journeyIdList.length,
    journeyActionQueueSummary.actionQueueSummary.actionQueueCount,
  );
  assert.equal(journeyActionQueueSummary.actionQueueSummary.journeyIdList.includes(lockedReservedJourneyData.id), true);
  assert.equal(Boolean(journeyActionQueueSummary.actionQueueSummary.suggestedActionCounts.unlock_journey), true);

  const checklist = await getGameChecklist({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(checklist.checklist.game.id, gameData.id);
  assert.equal(checklist.checklist.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(checklist.checklist.pendingTrafficIncidentRequestList.length, 0);
  assert.equal(checklist.checklist.dueReservedJourneyList.length, 0);
  assert.equal(checklist.checklist.dueStartedJourneyList.length, 1);
  assert.equal(checklist.checklist.summary.pendingTrafficIncidentCount, 0);
  assert.equal(checklist.checklist.summary.dueJourneyStartCount, 0);
  assert.equal(checklist.checklist.summary.dueJourneyCompleteCount, 1);
  assert.equal(checklist.checklist.summary.resolvableAuctionCount, 0);
  assert.equal(checklist.checklist.summary.game.id, gameData.id);

  const overview = await getGameOverview({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(overview.overview.game.id, gameData.id);
  assert.equal(overview.overview.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(Array.isArray(overview.overview.ranking), true);
  assert.equal(Array.isArray(overview.overview.playerList), true);
  assert.equal(Array.isArray(overview.overview.generalShopItemList), true);
  assert.equal(Array.isArray(overview.overview.blindBoxList), true);
  assert.equal(Array.isArray(overview.overview.trafficIncidentRequestList), true);
  assert.equal(overview.overview.currentAuction === null || typeof overview.overview.currentAuction === "object", true);
  assert.equal(overview.overview.journeyDashboard.gameId, gameData.id);
  assert.equal(overview.overview.summary.playerCount, 2);
  assert.equal(overview.overview.summary.generalShopItemCount, 0);
  assert.equal(overview.overview.summary.blindBoxCount >= 1, true);
  assert.equal(overview.overview.summary.pendingTrafficIncidentCount, 1);
  assert.equal(overview.overview.summary.journeyExceptionCount, 0);
  assert.equal(overview.overview.summary.activeAuctionCount >= 0, true);
  assert.equal(overview.overview.summary.currentAuctionBidCount >= 0, true);
  assert.equal(overview.overview.summary.playerCount, overview.overview.playerList.length);
  assert.equal(
    overview.overview.summary.pendingTrafficIncidentCount,
    overview.overview.trafficIncidentRequestList.filter((request) => request.status === "pending").length,
  );
  assert.equal(
    overview.overview.summary.journeyExceptionCount,
    overview.overview.journeyDashboard.exceptionJourneyList.length,
  );
  assert.equal(
    overview.overview.summary.journeyActionQueueCount,
    overview.overview.journeyDashboard.actionQueue.length,
  );

  const managementSnapshot = await getGameManagementSnapshot({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T10:15:00+08:00",
  });
  assert.equal(managementSnapshot.managementSnapshot.gameId, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.currentTime, "2026-07-10T10:15:00+08:00");
  assert.equal(managementSnapshot.managementSnapshot.overview.game.id, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.overview.summary.playerCount, 2);
  assert.equal(managementSnapshot.managementSnapshot.checklist.game.id, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.checklist.summary.pendingTrafficIncidentCount, 0);
  assert.equal(managementSnapshot.managementSnapshot.trafficIncidentReview.gameId, gameData.id);
  assert.equal(Array.isArray(managementSnapshot.managementSnapshot.trafficIncidentReview.pendingRequestIdList), true);
  assert.equal(managementSnapshot.managementSnapshot.trafficIncidentReview.pendingCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.journeyManagement.gameId, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.journeyManagement.summary.gameId, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.journeyActionQueue.gameId, gameData.id);
  assert.equal(managementSnapshot.managementSnapshot.journeyActionQueue.actionQueueCount >= 0, true);
  assert.equal(Array.isArray(managementSnapshot.managementSnapshot.journeyActionQueue.journeyIdList), true);
  assert.equal(managementSnapshot.managementSnapshot.summary.playerCount, 2);
  assert.equal(managementSnapshot.managementSnapshot.summary.pendingTrafficIncidentCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.activeAuctionCount >= 0, true);
  assert.equal(managementSnapshot.managementSnapshot.summary.currentAuctionBidCount >= 0, true);
  assert.equal(managementSnapshot.managementSnapshot.summary.dueJourneyStartCount, 0);
  assert.equal(managementSnapshot.managementSnapshot.summary.dueJourneyCompleteCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.trafficIncidentPendingCount, 1);
  assert.equal(managementSnapshot.managementSnapshot.summary.journeyActionQueueCount >= 0, true);
  assert.equal(
    managementSnapshot.managementSnapshot.summary.playerCount,
    managementSnapshot.managementSnapshot.overview.playerList.length,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.summary.pendingTrafficIncidentCount,
    managementSnapshot.managementSnapshot.trafficIncidentReview.pendingCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.summary.trafficIncidentPendingCount,
    managementSnapshot.managementSnapshot.trafficIncidentReview.pendingCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.summary.dueJourneyStartCount,
    managementSnapshot.managementSnapshot.checklist.summary.dueJourneyStartCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.summary.dueJourneyCompleteCount,
    managementSnapshot.managementSnapshot.checklist.summary.dueJourneyCompleteCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.summary.journeyActionQueueCount,
    managementSnapshot.managementSnapshot.journeyActionQueue.actionQueueCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.overview.summary.playerCount,
    managementSnapshot.managementSnapshot.summary.playerCount,
  );
  assert.equal(
    managementSnapshot.managementSnapshot.overview.summary.pendingTrafficIncidentCount,
    managementSnapshot.managementSnapshot.summary.pendingTrafficIncidentCount,
  );

  const initializedAuctionShop = await initializeAuctionShop({
    dataAccessLayer,
    gameId: gameData.id,
    mapId: mapData.id,
  });
  const initializedAuctionShopAgain = await initializeAuctionShop({
    dataAccessLayer,
    gameId: gameData.id,
    mapId: mapData.id,
  });

  await initializeGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    mapId: mapData.id,
  });
  const initializedGeneralShop = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.SHOPS,
    filterOptions: { gameId: gameData.id, shopType: "general" },
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
  const priorityState = await getGeneralShopPriorityState({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(initializedGeneralShop.shopType, "general");
  assert.equal(initializedGeneralShop.gameId, gameData.id);
  assert.equal(initializedGeneralShop.mapId, mapData.id);
  assert.equal(initializedGeneralShop.status, "active");
  assert.equal(priorityState.priorityBuyerPlayerId, memberPlayer.id);
  assert.equal(priorityState.prioritySource, "paid_refresh");
  const generalShopItems = await getGeneralShopItems({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(initializedAuctionShop.shopType, "auction_meta");
  assert.equal(initializedAuctionShopAgain.id, initializedAuctionShop.id);
  assert.equal(Array.isArray(generalShopItems.shopTicketList), true);
  assert.equal(generalShopItems.shopTicketList.some((item) => item.priorityAccess?.isPriorityItem), true);

  await clearGeneralShopPriorityState({
    dataAccessLayer,
    gameId: gameData.id,
  });
  const clearedPriorityState = await getGeneralShopPriorityState({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(clearedPriorityState.priorityBuyerPlayerId, null);
  assert.equal(clearedPriorityState.prioritySource, "none");

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

  const ticketOwnershipCheck = await validateTicketOwnership({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    ticketIdList: [priorityShopTicket.id, journeyTicketData.id],
  });
  const ticketOwnershipMissCheck = await validateTicketOwnership({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    ticketIdList: [priorityShopTicket.id],
  });
  const ticketCombinationCheck = await validateTicketCombination({
    dataAccessLayer,
    ticketIdList: [journeyTicketData.id],
    selectedTransportType: "local_train",
  });
  const ticketCombinationMismatchCheck = await validateTicketCombination({
    dataAccessLayer,
    ticketIdList: [journeyTicketData.id],
    selectedTransportType: "taxi",
  });
  const ticketCombinationWalkingCheck = await validateTicketCombination({
    dataAccessLayer,
    ticketIdList: [],
    selectedTransportType: "walking",
  });
  assert.equal(ticketOwnershipCheck.isValid, true);
  assert.equal(ticketOwnershipMissCheck.isValid, false);
  assert.equal(ticketOwnershipMissCheck.invalidTicketList.length, 1);
  assert.equal(ticketCombinationCheck.isValid, true);
  assert.equal(ticketCombinationCheck.mainTransportType, "local_train");
  assert.equal(ticketCombinationMismatchCheck.isValid, false);
  assert.equal(ticketCombinationWalkingCheck.isValid, true);

  const ticketNotReservedCheck = await validateTicketNotReserved({
    dataAccessLayer,
    gameId: gameData.id,
    ticketIdList: [journeyTicketData.id],
  });
  const ticketNotReservedWithExcludeCheck = await validateTicketNotReserved({
    dataAccessLayer,
    gameId: gameData.id,
    ticketIdList: [journeyTicketData.id],
    excludedJourneyId: reservedJourneyData.id,
  });
  assert.equal(ticketNotReservedCheck.isValid, false);
  assert.equal(ticketNotReservedCheck.reservedTicketList.length, 1);
  assert.equal(ticketNotReservedWithExcludeCheck.isValid, true);

  const ticketTimeEnoughCheck = await validateTicketTimeEnoughForJourney({
    dataAccessLayer,
    ticketIdList: [priorityShopTicket.id],
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:20:00+08:00",
  });
  const ticketTimeNotEnoughCheck = await validateTicketTimeEnoughForJourney({
    dataAccessLayer,
    ticketIdList: [priorityShopTicket.id],
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:40:00+08:00",
  });
  const normalShopRatingCheck = await calculateNormalShopTicketRating({
    baseUsableMinutes: 55,
    basePrice: 2500,
  });
  const auctionRatingCheck = await calculateAuctionTicketRating({
    baseUsableMinutes: 55,
  });
  assert.equal(ticketTimeEnoughCheck.isEnough, true);
  assert.equal(ticketTimeEnoughCheck.availableMinutes >= ticketTimeEnoughCheck.requiredMinutes, true);
  assert.equal(ticketTimeNotEnoughCheck.isEnough, false);
  assert.equal(normalShopRatingCheck.ratingGrade, "C");
  assert.equal(normalShopRatingCheck.ratingType, "normal_shop");
  assert.equal(auctionRatingCheck.ratingGrade, "C");
  assert.equal(auctionRatingCheck.ratingType, "auction");

  const ticketGenerationRules = await getTicketGenerationRules({});
  const usableMinutesCheck = await calculateTicketUsableMinutes({
    baseUsableMinutes: 60,
    transportType: "taxi",
    transportDurationMultiplierRules: ticketGenerationRules.transportDurationMultiplierRules,
  });
  const priceCheck = await calculateTicketPrice({
    basePrice: 200,
    transportType: "taxi",
    transportPriceMultiplierRules: ticketGenerationRules.transportPriceMultiplierRules,
  });
  const ticketRatingCheck = await calculateTicketRating({
    ticketData: {
      baseDuration: 60,
      basePrice: 200,
    },
    ratingType: "normal_shop",
  });
  const generatedTicketBatch = await generateTicketBatch({
    mapId: mapData.id,
    count: 2,
    availableTransportTypes: ["walking", "local_train", "taxi"],
    generationRules: ticketGenerationRules,
    rng: () => 0.1,
    now: "2026-07-10T06:00:00+08:00",
  });
  assert.equal(usableMinutesCheck.usableMinutes > 0, true);
  assert.equal(priceCheck.finalPrice > 0, true);
  assert.equal(ticketRatingCheck.ratingType, "normal_shop");
  assert.equal(Array.isArray(generatedTicketBatch.ticketList), true);
  assert.equal(generatedTicketBatch.ticketList.length, 2);
  assert.equal(generatedTicketBatch.ticketList[0]?.ticketSource, "shop_generated");

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

  const cancelledReservedJourney = await cancelJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    journeyId: reservedJourneyData.id,
    reason: "smoke_cancel",
  });
  const completedCurrentJourney = await completeJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    journeyId: currentJourneyData.id,
    completedAt: "2026-07-10T10:35:00+08:00",
  });
  const cancelledJourneyRecord = await getJourney({
    dataAccessLayer,
    journeyId: reservedJourneyData.id,
  });
  const completedJourneyRecord = await getJourney({
    dataAccessLayer,
    journeyId: currentJourneyData.id,
  });
  assert.equal(cancelledReservedJourney.status, "cancelled");
  assert.equal(cancelledJourneyRecord.status, "cancelled");
  assert.equal(completedCurrentJourney.status, "completed");
  assert.equal(completedJourneyRecord.status, "completed");

  const trafficIncidentRequest = await submitTrafficIncidentRequest({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    journeyId: currentJourneyData.id,
    evidenceList: ["delay photo"],
    actualEndLocationId: startLocation.id,
    actualEndedAt: "2026-07-10T10:20:00+08:00",
    description: "traffic smoke",
  });
  const returnedTicketTimeCheck = await calculateReturnedTicketTime({
    journeyId: currentJourneyData.id,
    originalJourneyData: currentJourneyData,
    actualEndLocationId: startLocation.id,
    actualEndTime: "2026-07-10T10:20:00+08:00",
    transportType: "taxi",
  });
  const approvedTrafficIncident = await approveTrafficIncidentRequest({
    dataAccessLayer,
    requestId: trafficIncidentRequest.id,
    reviewerId: hostPlayer.id,
    reviewNote: "approved in smoke test",
  });
  const approvedTrafficIncidentRequest = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    recordId: trafficIncidentRequest.id,
  });
  const approvedJourneyAfterTraffic = await getJourney({
    dataAccessLayer,
    journeyId: currentJourneyData.id,
  });
  const hasReachedGoalCheck = await hasReachedGoal({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    goalLocationId: startLocation.id,
  });
  assert.equal(trafficIncidentRequest.status, "pending");
  assert.equal(trafficIncidentRequest.gameId, gameData.id);
  assert.equal(trafficIncidentRequest.playerId, memberPlayer.id);
  assert.equal(trafficIncidentRequest.journeyId, currentJourneyData.id);
  const trafficIncidentRequestsByPlayer = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    status: "pending",
    filterOptions: {
      createdAtBefore: "2026-07-10T11:00:00+08:00",
    },
  });
  assert.equal(Array.isArray(trafficIncidentRequestsByPlayer.requestList), true);
  assert.equal(trafficIncidentRequestsByPlayer.requestList.length, 1);
  assert.equal(trafficIncidentRequestsByPlayer.requestList[0]?.playerId, memberPlayer.id);
  assert.equal(trafficIncidentRequestsByPlayer.requestList[0]?.journeyId, currentJourneyData.id);
  const trafficIncidentRequestsByPlayerBefore = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    status: "pending",
    filterOptions: {
      createdAtBefore: "2026-07-10T11:10:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(trafficIncidentRequestsByPlayerBefore.requestList), true);
  assert.equal(trafficIncidentRequestsByPlayerBefore.requestList.length, 1);
  assert.equal(trafficIncidentRequestsByPlayerBefore.requestList[0]?.playerId, memberPlayer.id);
  const trafficIncidentRequestsBeforeCreatedAtUpperBound = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    status: "pending",
    filterOptions: {
      createdAtBefore: "2026-07-10T11:30:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(trafficIncidentRequestsBeforeCreatedAtUpperBound.requestList), true);
  assert.equal(trafficIncidentRequestsBeforeCreatedAtUpperBound.requestList.length, 1);
  assert.equal(trafficIncidentRequestsBeforeCreatedAtUpperBound.requestList[0]?.status, "pending");

  const trafficIncidentRequestsByJourneyAndTime = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    journeyId: currentJourneyData.id,
    status: "pending",
    filterOptions: {
      createdAtAfter: "2026-07-10T11:00:00+08:00",
      createdAtBefore: "2026-07-10T11:40:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "asc",
    },
  });
  assert.equal(Array.isArray(trafficIncidentRequestsByJourneyAndTime.requestList), true);
  assert.equal(trafficIncidentRequestsByJourneyAndTime.requestList.length, 1);
  assert.equal(trafficIncidentRequestsByJourneyAndTime.requestList[0]?.journeyId, currentJourneyData.id);
  assert.equal(trafficIncidentRequestsByJourneyAndTime.requestList[0]?.status, "pending");
  assert.equal(trafficIncidentRequestsByJourneyAndTime.requestList[0]?.createdAt >= "2026-07-10T11:00:00+08:00", true);
  assert.equal(trafficIncidentRequestsByJourneyAndTime.requestList[0]?.createdAt <= "2026-07-10T11:40:00+08:00", true);
  const trafficIncidentRequestsByJourney = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    journeyId: currentJourneyData.id,
    status: "pending",
  });
  assert.equal(Array.isArray(trafficIncidentRequestsByJourney.requestList), true);
  assert.equal(trafficIncidentRequestsByJourney.requestList.length, 1);
  assert.equal(trafficIncidentRequestsByJourney.requestList[0]?.journeyId, currentJourneyData.id);
  assert.equal(returnedTicketTimeCheck.journeyId, currentJourneyData.id);
  assert.equal(returnedTicketTimeCheck.transportType, "taxi");
  assert.equal(returnedTicketTimeCheck.returnedMinutes, 10);
  assert.equal(returnedTicketTimeCheck.actualEndLocationId, startLocation.id);
  assert.equal(approvedTrafficIncident.returnedTicket?.status, "owned");
  assert.equal(approvedTrafficIncident.returnedTicket?.ticketSource, "returned");
  assert.equal(approvedTrafficIncident.request.status, "approved");
  assert.equal(approvedTrafficIncident.request.reviewData.decision, "approved");
  assert.equal(approvedTrafficIncident.request.reviewData.returnedTicketId, approvedTrafficIncident.returnedTicket?.id ?? null);
  assert.equal(approvedTrafficIncidentRequest.status, "approved");
  assert.equal(approvedTrafficIncidentRequest.reviewData.decision, "approved");
  assert.equal(Boolean(approvedTrafficIncident.returnedTicket?.id), true);
  assert.equal(approvedTrafficIncident.updatedJourney.status, "completed");
  assert.equal(approvedJourneyAfterTraffic.status, "completed");
  assert.equal(approvedJourneyAfterTraffic.toLocationId, startLocation.id);
  assert.equal(hasReachedGoalCheck.hasReachedGoal, true);

  const checkEndConditionBeforeArrival = await checkGameEndCondition({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(checkEndConditionBeforeArrival.shouldEndGame, false);

  await recordPlayerArrival({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    arrivalTime: "2026-07-10T12:20:00+08:00",
    remainingMoney: 850,
  });
  await recordPlayerArrival({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: hostPlayer.id,
    arrivalTime: "2026-07-10T12:25:00+08:00",
    remainingMoney: 900,
  });
  const checkEndConditionAfterArrival = await checkGameEndCondition({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(checkEndConditionAfterArrival.shouldEndGame, true);
  const processShopScheduledEventsResult = await processShopScheduledEvents({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:30:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  const processGameTimeEventsResult = await processGameTimeEvents({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:30:00+08:00",
  });
  assert.equal(Array.isArray(processShopScheduledEventsResult.processedShopEvents), true);
  assert.equal(processShopScheduledEventsResult.gameId, gameData.id);
  assert.equal(Array.isArray(processGameTimeEventsResult.arrivalUpdates), true);
  assert.equal(processGameTimeEventsResult.arrivalUpdates.length >= 2, true);
  assert.equal(processGameTimeEventsResult.endedGame?.status, "ended");

  const winnerResult = await determineWinner({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(winnerResult.winnerPlayerId, null);
  assert.equal(Array.isArray(winnerResult.tiedPlayerIds), true);
  assert.equal(winnerResult.tiedPlayerIds.length, 2);
  assert.equal(winnerResult.ranking.length, 2);

  const processAllScheduledEventsResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:30:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  const processGameChecklistActionsResult = await processGameChecklistActions({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:30:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  assert.equal(processAllScheduledEventsResult.shopResult.gameId, gameData.id);
  assert.equal(Array.isArray(processAllScheduledEventsResult.journeyResult.processedJourneyEvents), true);
  assert.equal(processAllScheduledEventsResult.gameResult.endedGame?.status, "ended");
  assert.equal(Array.isArray(processAllScheduledEventsResult.gameResult.arrivalUpdates), true);
  assert.equal(Array.isArray(processGameChecklistActionsResult.processResult.journeyResult.processedJourneyEvents), true);
  assert.equal(Array.isArray(processGameChecklistActionsResult.checklistBefore.pendingTrafficIncidentRequestList), true);
  assert.equal(Array.isArray(processGameChecklistActionsResult.checklistAfter.pendingTrafficIncidentRequestList), true);

  const endedGameData = await endGame({
    dataAccessLayer,
    gameId: gameData.id,
    endedAt: "2026-07-10T12:30:00+08:00",
  });
  const rankingData = await getRanking({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(endedGameData.status, "ended");
  assert.equal(rankingData.rankingList.length >= 2, true);

  const processedJourneyEvents = await processJourneyTimeEvents({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:00:00+08:00",
  });
  assert.equal(Array.isArray(processedJourneyEvents.processedJourneyEvents), true);
  assert.equal(processedJourneyEvents.processedJourneyEvents.length >= 2, true);
  assert.equal(
    processedJourneyEvents.processedJourneyEvents.some((event) => event.type === "journey_started" && event.journey.id === reservedJourneyData.id),
    true,
  );
  assert.equal(
    processedJourneyEvents.processedJourneyEvents.some((event) => event.type === "journey_completed" && event.journey.id === currentJourneyData.id),
    true,
  );

  const shopCooldownCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    currentTime: "2026-07-10T10:05:00+08:00",
    refreshType: "manual",
    playerCount: 1,
  });
  const generalShopOpenCheck = await isGeneralShopOpen({
    currentTime: "2026-07-10T06:00:00+08:00",
    timeZone: "Asia/Taipei",
  });
  const auctionShopOpenCheck = await isAuctionShopOpenForNewAuction({
    currentTime: "2026-07-10T06:30:00+08:00",
    timeZone: "Asia/Taipei",
  });
  assert.equal(shopCooldownCheck.canRefresh, false);
  assert.equal(generalShopOpenCheck.isOpen, true);
  assert.equal(auctionShopOpenCheck.isOpen, true);

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

  const freeShopTicketEffectResult = await executeFreeShopTicketEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const freeShopTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: priorityShopTicket.id,
  });
  const removedShopItemAfterEffect = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.SHOP_ITEMS,
    recordId: priorityShopItem.id,
  });
  assert.equal(freeShopTicketEffectResult.effectApplied, true);
  assert.equal(freeShopTicketEffectResult.gainedTicketData.ownerPlayerId, memberPlayer.id);
  assert.equal(Boolean(freeShopTicketEffectResult.removedShopItemData?.id), true);
  assert.equal(freeShopTicketEffectResult.removedShopItemData.removedReason, "blind_box_gain_shop_ticket");
  assert.equal(freeShopTicketRecord.status, "owned");
  assert.equal(removedShopItemAfterEffect.status, "removed");

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

  const removedShopItem = await removeGeneralShopItem({
    dataAccessLayer,
    gameId: gameData.id,
    shopItemId: priorityShopItem.id,
    reason: "smoke_remove",
    removedAt: "2026-07-10T10:03:00+08:00",
  });
  assert.equal(removedShopItem.status, "removed");
  assert.equal(removedShopItem.removedReason, "smoke_remove");

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
  const fullRouteSelf = await canViewPlayerFullRoute({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const fullRouteOther = await canViewPlayerFullRoute({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(exactLocationSelf.canView, true);
  assert.equal(exactLocationOther.canView, false);
  assert.equal(fullRouteSelf.canView, true);
  assert.equal(fullRouteOther.canView, false);

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
  const publicJourneyInfoSelf = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const publicJourneyInfoOther = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(publicJourneyInfoSelf.publicJourneyInfo?.journeyId, currentJourneyData.id);
  assert.equal(publicJourneyInfoSelf.publicJourneyInfo?.status, "completed");
  assert.equal(Array.isArray(publicJourneyInfoSelf.publicJourneyInfo?.ticketIdList), true);
  assert.equal(publicJourneyInfoSelf.publicJourneyInfo?.fromLocationId, startLocation.id);
  assert.equal(publicJourneyInfoOther.publicJourneyInfo, null);

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
    filterOptions: {
      createdAtAfter: "2026-07-10T00:00:00+08:00",
      createdAtBefore: "2026-07-10T12:00:00+08:00",
      recordType: "journey",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(Array.isArray(playerRecordsDuringGame.recordList), true);
  assert.equal(Array.isArray(playerRecordsReview.recordList), true);
  assert.equal(playerRecordsDuringGame.recordList.length >= 1, true);
  assert.equal(playerRecordsReview.recordList.length, 1);
  assert.equal(playerRecordsDuringGame.recordList[0]?.recordType, "journey");
  assert.equal(playerRecordsReview.recordList[0]?.playerId, memberPlayer.id);
  assert.equal(playerRecordsReview.recordList[0]?.createdAt >= "2026-07-10T00:00:00+08:00", true);
  assert.equal(playerRecordsReview.recordList[0]?.createdAt <= "2026-07-10T12:00:00+08:00", true);
  assert.equal(playerRecordsDuringGame.recordList[0]?.payload?.currentLocationId, undefined);
  assert.equal(playerRecordsReview.recordList[0]?.payload?.currentLocationId, "secret-location");
  assert.equal(playerRecordsReview.recordList[0]?.recordType, "journey");

  const gameRecordsDuringGame = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
    visibilityMode: "during_game",
  });
  const gameRecordsReview = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      createdAtAfter: "2026-07-10T00:00:00+08:00",
      recordType: "journey",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(gameRecordsDuringGame.recordList), true);
  assert.equal(Array.isArray(gameRecordsReview.recordList), true);
  assert.equal(gameRecordsDuringGame.recordList.length, 1);
  assert.equal(gameRecordsReview.recordList.length, 1);
  assert.equal(gameRecordsDuringGame.recordList[0]?.recordType, "journey");
  assert.equal(gameRecordsReview.recordList[0]?.playerId, memberPlayer.id);
  assert.equal(gameRecordsDuringGame.recordList[0]?.payload?.currentLocationId, undefined);
  assert.equal(gameRecordsReview.recordList[0]?.payload?.currentLocationId, "secret-location");
  assert.equal(gameRecordsReview.recordList[0]?.recordType, "journey");
  const gameRecordsByCompositeFilters = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      playerId: memberPlayer.id,
      recordType: "journey",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
      createdAtBefore: "2026-07-10T12:00:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(gameRecordsByCompositeFilters.recordList), true);
  assert.equal(gameRecordsByCompositeFilters.recordList.length, 1);
  assert.equal(gameRecordsByCompositeFilters.recordList[0]?.playerId, memberPlayer.id);
  assert.equal(gameRecordsByCompositeFilters.recordList[0]?.recordType, "journey");
  assert.equal(gameRecordsByCompositeFilters.recordList[0]?.createdAt >= "2026-07-10T00:00:00+08:00", true);
  assert.equal(gameRecordsByCompositeFilters.recordList[0]?.createdAt <= "2026-07-10T12:00:00+08:00", true);
  const gameRecordsOffset = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      recordType: "journey",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(gameRecordsOffset.recordList), true);
  assert.equal(gameRecordsOffset.recordList.length, 1);
  assert.equal(gameRecordsOffset.recordList[0]?.recordType, "journey");
  const gameRecordsWithUpperBound = await getGameRecords({
    dataAccessLayer,
    gameId: gameData.id,
    filterOptions: {
      createdAtBefore: "2026-07-10T12:00:00+08:00",
      recordType: "journey",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
    visibilityMode: "post_game_review",
  });
  assert.equal(Array.isArray(gameRecordsWithUpperBound.recordList), true);
  assert.equal(gameRecordsWithUpperBound.recordList.length >= 1, true);
  assert.equal(gameRecordsWithUpperBound.recordList[0]?.recordType, "journey", true);
  const publicRecordsDuringGame = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    filterOptions: {
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  const postGameReviewData = await getPostGameReviewData({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(Array.isArray(publicRecordsDuringGame.publicRecordList), true);
  assert.equal(publicRecordsDuringGame.publicRecordList.length >= 1, true);
  assert.equal(publicRecordsDuringGame.publicRecordList[0]?.gameId, gameData.id);
  assert.equal(publicRecordsDuringGame.publicRecordList[0]?.recordType, "journey");
  assert.equal(publicRecordsDuringGame.publicRecordList[0]?.payload?.currentLocationId, undefined);
  assert.equal(publicRecordsDuringGame.publicRecordList[0]?.playerId, memberPlayer.id);
  const publicRecordsWithUpperBound = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    filterOptions: {
      createdAtBefore: "2026-07-10T12:00:00+08:00",
      recordType: "journey",
    },
  });
  assert.equal(Array.isArray(publicRecordsWithUpperBound.publicRecordList), true);
  assert.equal(publicRecordsWithUpperBound.publicRecordList.length >= 1, true);
  assert.equal(publicRecordsWithUpperBound.publicRecordList[0]?.recordType, "journey", true);
  const publicRecordsByCompositeFilters = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    filterOptions: {
      playerId: memberPlayer.id,
      recordType: "journey",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
      createdAtBefore: "2026-07-10T12:00:00+08:00",
    },
  });
  assert.equal(Array.isArray(publicRecordsByCompositeFilters.publicRecordList), true);
  assert.equal(publicRecordsByCompositeFilters.publicRecordList.length, 1);
  assert.equal(publicRecordsByCompositeFilters.publicRecordList[0]?.playerId, memberPlayer.id);
  assert.equal(publicRecordsByCompositeFilters.publicRecordList[0]?.recordType, "journey");
  assert.equal(publicRecordsByCompositeFilters.publicRecordList[0]?.createdAt >= "2026-07-10T00:00:00+08:00", true);
  assert.equal(publicRecordsByCompositeFilters.publicRecordList[0]?.createdAt <= "2026-07-10T12:00:00+08:00", true);
  const publicRecordsOffset = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    filterOptions: {
      recordType: "journey",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
  });
  assert.equal(Array.isArray(publicRecordsOffset.publicRecordList), true);
  assert.equal(publicRecordsOffset.publicRecordList.length, 1);
  assert.equal(publicRecordsOffset.publicRecordList[0]?.recordType, "journey", true);
  assert.equal(Array.isArray(postGameReviewData.reviewData.recordList), true);
  assert.equal(postGameReviewData.reviewData.recordList.length >= 1, true);
  assert.equal(postGameReviewData.reviewData.recordList[0]?.gameId, gameData.id);
  assert.equal(postGameReviewData.reviewData.recordList[0]?.recordType, "journey");
  assert.equal(postGameReviewData.reviewData.recordList[0]?.payload?.currentLocationId, "secret-location");
  assert.equal(publicRecordsDuringGame.publicRecordList[0]?.playerId, memberPlayer.id);
  assert.equal(postGameReviewData.reviewData.recordList[0]?.playerId, memberPlayer.id);
  assert.equal(postGameReviewData.reviewData.recordList[0]?.recordType, "journey");

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
  const olderOwnedTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 20,
      basePrice: 60,
      usableMinutes: 20,
      price: 60,
      ratingScore: 0.5,
      ratingGrade: "D",
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
      ticketId: olderOwnedTicket.id,
      source: "shop_purchase",
      createdAt: "2026-07-09T11:00:00+08:00",
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
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
    },
  });
  assert.equal(playerTickets.ticketList.length, 1);
  assert.equal(playerTickets.ticketList[0]?.gameId, gameData.id);
  assert.equal(playerTickets.ticketList[0]?.playerId, memberPlayer.id);
  assert.equal(playerTickets.ticketList[0]?.ticketId, ownedTicket.id);
  assert.equal(playerTickets.ticketList[0]?.source, "shop_purchase");
  const playerTicketsBeforeUpperBound = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
      createdAtBefore: "2026-07-10T10:00:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(playerTicketsBeforeUpperBound.ticketList), true);
  assert.equal(playerTicketsBeforeUpperBound.ticketList.length >= 1, true);
  assert.equal(playerTicketsBeforeUpperBound.ticketList[0]?.source, "shop_purchase");
  const playerTicketsComposite = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
      createdAtAfter: "2026-07-09T00:00:00+08:00",
      createdAtBefore: "2026-07-10T10:00:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(playerTicketsComposite.ticketList), true);
  assert.equal(playerTicketsComposite.ticketList.length >= 1, true);
  assert.equal(playerTicketsComposite.ticketList.every((ticket) => ticket.source === "shop_purchase"), true);
  const playerTicketsWithOffset = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
  });
  assert.equal(playerTicketsWithOffset.ticketList.length, 1);
  assert.equal(playerTicketsWithOffset.ticketList[0]?.gameId, gameData.id);
  assert.equal(playerTicketsWithOffset.ticketList[0]?.playerId, memberPlayer.id);
  assert.equal(playerTicketsWithOffset.ticketList[0]?.ticketId, olderOwnedTicket.id);
  const playerTicketsOffset = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
  });
  assert.equal(Array.isArray(playerTicketsOffset.ticketList), true);
  assert.equal(playerTicketsOffset.ticketList.length, 1);
  assert.equal(playerTicketsOffset.ticketList[0]?.ticketId, olderOwnedTicket.id);
  const playerTicketsWithUpperBound = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
      createdAtBefore: "2026-07-10T09:59:59+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(playerTicketsWithUpperBound.ticketList.length, 1);
  assert.equal(playerTicketsWithUpperBound.ticketList[0]?.ticketId, olderOwnedTicket.id);

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
  assert.equal(specialStates.specialStateList[0]?.playerId, memberPlayer.id);
  assert.equal(specialStates.specialStateList[0]?.stateType, "free_shop_refresh_count");
  assert.equal(specialStates.specialStateList[0]?.isConsumed, false);
  assert.equal(specialStates.specialStateList[0]?.sourceBlindBoxId, null);
  const specialStatesBeforeUpperBound = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtBefore: "2026-07-10T10:30:00+08:00",
    },
  });
  assert.equal(Array.isArray(specialStatesBeforeUpperBound.specialStateList), true);
  assert.equal(specialStatesBeforeUpperBound.specialStateList.length, 2);
  assert.equal(specialStatesBeforeUpperBound.specialStateList[0]?.stateType, "free_shop_refresh_count");
  const specialStatesOffset = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtBefore: "2026-07-10T10:30:00+08:00",
    },
  });
  assert.equal(Array.isArray(specialStatesOffset.specialStateList), true);
  assert.equal(specialStatesOffset.specialStateList.length, 2);
  const specialStatesByType = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
    },
  });
  assert.equal(specialStatesByType.specialStateList.length >= 1, true);
  const specialStatesComposite = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      sourceBlindBoxId: null,
      createdAtBefore: "2026-07-10T10:30:00+08:00",
    },
  });
  assert.equal(Array.isArray(specialStatesComposite.specialStateList), true);
  assert.equal(specialStatesComposite.specialStateList.length, 2);
  assert.equal(specialStatesComposite.specialStateList.every((state) => state.isConsumed === false), true);
  assert.equal(specialStatesComposite.specialStateList.every((state) => state.sourceBlindBoxId === null), true);
  assert.equal(specialStatesComposite.specialStateList.every((state) => state.createdAt <= "2026-07-10T10:30:00+08:00"), true);

  const specialStatesBySourceAndConsume = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      sourceBlindBoxId: hiddenBlindBoxData.id,
      isConsumed: false,
      createdAtAfter: "2026-07-10T10:00:00+08:00",
      createdAtBefore: "2026-07-10T10:30:00+08:00",
    },
  });
  assert.equal(Array.isArray(specialStatesBySourceAndConsume.specialStateList), true);
  assert.equal(specialStatesBySourceAndConsume.specialStateList.length, 1);
  assert.equal(specialStatesBySourceAndConsume.specialStateList[0]?.sourceBlindBoxId, hiddenBlindBoxData.id);
  assert.equal(specialStatesBySourceAndConsume.specialStateList[0]?.isConsumed, false);
  assert.equal(specialStatesBySourceAndConsume.specialStateList[0]?.createdAt >= "2026-07-10T10:00:00+08:00", true);
  assert.equal(specialStatesBySourceAndConsume.specialStateList[0]?.createdAt <= "2026-07-10T10:30:00+08:00", true);

  const freeRefreshEffectResult = await executeFreeShopRefreshEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    freeRefreshCount: 1,
    blindBoxId: null,
  });
  const freeRefreshEffectFromBlindBox = await executeFreeShopRefreshEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    freeRefreshCount: 1,
    blindBoxId: hiddenBlindBoxData.id,
  });
  const specialStateToConsume = freeRefreshEffectResult.specialStateData;
  const consumedSpecialState = await consumePlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    stateId: specialStateToConsume.id,
    reason: "service_rules_smoke",
  });
  const addedSpecialState = await addPlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    stateType: "free_shop_refresh_count",
    stateData: { count: 3 },
    sourceBlindBoxId: hiddenBlindBoxData.id,
  });
  const nextAuctionBidPoolEffectResult = await executeGainNextAuctionBidPoolEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    blindBoxId: hiddenBlindBoxData.id,
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
  assert.equal(freeRefreshEffectResult.updatedFreeRefreshCount, 1);
  assert.equal(freeRefreshEffectResult.specialStateData.stateData.remainingCount, 1);
  assert.equal(freeRefreshEffectResult.specialStateData.sourceBlindBoxId, null);
  assert.equal(freeRefreshEffectFromBlindBox.specialStateData.sourceBlindBoxId, hiddenBlindBoxData.id);
  assert.equal(freeRefreshEffectFromBlindBox.specialStateData.stateData.remainingCount, 1);
  assert.equal(consumedSpecialState.isConsumed, true);
  assert.equal(addedSpecialState.isConsumed, false);
  assert.equal(addedSpecialState.sourceBlindBoxId, hiddenBlindBoxData.id);
  assert.equal(nextAuctionBidPoolEffectResult.playerSpecialState.stateType, "next_auction_bid_pool_reward");
  assert.equal(nextAuctionBidPoolEffectResult.playerSpecialState.sourceBlindBoxId, hiddenBlindBoxData.id);
  assert.equal(nextAuctionBidPoolEffectResult.playerSpecialState.isConsumed, false);
  assert.equal(consumedSpecialStates.specialStateList.length, 1);
  assert.equal(consumedSpecialStates.specialStateList[0]?.isConsumed, true);
  const specialStatesBySource = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "next_auction_bid_pool_reward",
      createdAtAfter: "2026-07-10T10:00:00+08:00",
    },
  });
  assert.equal(specialStatesBySource.specialStateList.length, 1);
  assert.equal(specialStatesBySource.specialStateList[0]?.sourceBlindBoxId, hiddenBlindBoxData.id);
  const specialStatesConsumedView = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtBefore: "2026-07-10T10:30:00+08:00",
    },
  });
  assert.equal(specialStatesConsumedView.specialStateList.length, 2);
  assert.equal(specialStatesConsumedView.specialStateList.every((state) => state.isConsumed === false), true);
  assert.equal(specialStatesBySource.specialStateList[0]?.isConsumed, false);
  const specialStatesWithoutConsumed = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "next_auction_bid_pool_reward",
    },
  });
  assert.equal(specialStatesWithoutConsumed.specialStateList.length, 1);
  assert.equal(specialStatesWithoutConsumed.specialStateList[0]?.stateType, "next_auction_bid_pool_reward");
  assert.equal(specialStatesWithoutConsumed.specialStateList[0]?.isConsumed, false);

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

  const canCreateAuctionRoundAtNight = await canCreateAuctionRound({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T05:30:00+08:00",
  });
  assert.equal(canCreateAuctionRoundAtNight.canCreate, false);
  assert.equal(canCreateAuctionRoundAtNight.reason, "Auction shop closed");

  const currentAuction = await getCurrentAuction({
    dataAccessLayer,
    gameId: gameData.id,
    currentTime: "2026-07-10T12:15:00+08:00",
  });
  assert.equal(Boolean(currentAuction.currentAuction?.id), true);
  assert.equal(currentAuction.currentAuction.ticketRating?.ratingGrade, "A");

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
  const hasMemberBidBefore = await hasPlayerBid({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    playerId: memberPlayer.id,
  });
  const placedMemberBid = await placeBid({
    dataAccessLayer,
    gameId: gameData.id,
    auctionId: auctionRecord.id,
    playerId: memberPlayer.id,
    bidAmount: 150,
    currentTime: "2026-07-10T12:06:00+08:00",
    canAfford,
    deductPlayerMoney,
  });
  const hasMemberBidAfter = await hasPlayerBid({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    playerId: memberPlayer.id,
  });
  let duplicateBidBlocked = false;
  try {
    await placeBid({
      dataAccessLayer,
      gameId: gameData.id,
      auctionId: auctionRecord.id,
      playerId: memberPlayer.id,
      bidAmount: 160,
      currentTime: "2026-07-10T12:07:00+08:00",
      canAfford,
      deductPlayerMoney,
    });
  } catch (error) {
    duplicateBidBlocked = error?.code === "AUCTION_ALREADY_BID";
  }
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
  assert.equal(tieResolvedAuction.totalBidAmount, 400);
  assert.equal(Array.isArray(tieResolvedAuction.blindBoxRewards), true);
  assert.equal(tieResolvedAuction.blindBoxRewards.length, 0);
  assert.equal(destroyedAuctionTicket.status, "destroyed");
  assert.equal(hasMemberBidBefore.hasBid, false);
  assert.equal(placedMemberBid.success, true);
  assert.equal(hasMemberBidAfter.hasBid, true);
  assert.equal(duplicateBidBlocked, true);
  assert.equal(auctionBidList.length, 2);
  assert.equal(Array.isArray(filteredAuctionBids.bidList), true);
  assert.equal(filteredAuctionBids.bidList.length, 1);
  assert.equal(filteredAuctionBids.bidList[0]?.playerId, hostPlayer.id);
  assert.equal(auctionBidList.every((bid) => bid.auctionId === auctionRecord.id), true);
  assert.equal(filteredAuctionBids.bidList[0]?.createdAt >= "2026-07-10T12:05:00+08:00", true);
  const filteredAuctionBidsByPlayer = await getAuctionBids({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    filterOptions: {
      playerId: hostPlayer.id,
      createdAtBefore: "2026-07-10T12:30:00+08:00",
    },
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 10,
    },
  });
  assert.equal(Array.isArray(filteredAuctionBidsByPlayer.bidList), true);
  assert.equal(filteredAuctionBidsByPlayer.bidList.length, 1);
  assert.equal(filteredAuctionBidsByPlayer.bidList[0]?.playerId, hostPlayer.id);
  const auctionBidsWithOffset = await getAuctionBids({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "desc",
      limit: 1,
      offset: 1,
    },
  });
  assert.equal(Array.isArray(auctionBidsWithOffset.bidList), true);
  assert.equal(auctionBidsWithOffset.bidList.length, 1);
  assert.equal(auctionBidsWithOffset.bidList[0]?.playerId, memberPlayer.id);
  assert.equal(currentAuction.currentAuction?.ticket?.id, auctionTicket.id);
  assert.equal(currentAuction.currentAuction?.status, "active");

  const destroyedAuctionTicketResult = await destroyAuctionTicket({
    dataAccessLayer,
    auctionId: auctionRecord.id,
    ticketId: auctionTicket.id,
    reason: "no_winner",
    currentTime: "2026-07-10T12:32:00+08:00",
  });
  const destroyedAuctionTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: auctionTicket.id,
  });
  assert.equal(destroyedAuctionTicketResult.success, true);
  assert.equal(destroyedAuctionTicketRecord.status, "destroyed");
  assert.equal(destroyedAuctionTicketRecord.destroyedReason, "no_winner");

  const awardedAuctionTicket = await awardAuctionTicket({
    dataAccessLayer,
    gameId: gameData.id,
    auctionId: auctionRecord.id,
    winnerPlayerId: memberPlayer.id,
    ticketId: auctionTicket.id,
    currentTime: "2026-07-10T12:31:00+08:00",
    addTicketToPlayer,
  });
  const awardedAuctionTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: auctionTicket.id,
  });
  assert.equal(awardedAuctionTicket.ticketData.ownerPlayerId, memberPlayer.id);
  assert.equal(awardedAuctionTicket.ticketData.status, "owned");
  assert.equal(awardedAuctionTicket.ticketData.acquiredSource, "auction_reward");
  assert.equal(awardedAuctionTicketRecord.status, "owned");
  assert.equal(awardedAuctionTicketRecord.acquiredSource, "auction_reward");
  assert.equal(awardedAuctionTicketRecord.ownerPlayerId, memberPlayer.id);

  const awardedAuctionRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionRecord.id,
  });
  assert.equal(awardedAuctionRecord.winnerPlayerId, memberPlayer.id);
  assert.equal(awardedAuctionRecord.awardedTicketId, auctionTicket.id);

  const destroyedTicketResult = await destroyTicket({
    dataAccessLayer,
    ticketId: journeyTicketData.id,
    reason: "smoke_destroy",
  });
  const destroyedTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: journeyTicketData.id,
  });
  assert.equal(destroyedTicketResult.status, "destroyed");
  assert.equal(destroyedTicketRecord.status, "destroyed");
  assert.equal(destroyedTicketRecord.destroyReason, "smoke_destroy");

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

  const reservationTicketData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 35,
      basePrice: 100,
      usableMinutes: 90,
      price: 100,
      ratingScore: 1.5,
      ratingGrade: "C",
      ratingType: "normal_shop",
      status: "owned",
      ticketSource: "smoke_test",
      metadata: {},
    },
  });

  const reservationJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T11:10:00+08:00",
      arrivalTime: "2026-07-10T11:50:00+08:00",
      status: "reserved",
      transportType: "local_train",
      ticketIdList: [reservationTicketData.id],
    },
  });

  const reservedTickets = await reserveTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    journeyId: reservationJourneyData.id,
    ticketIdList: [reservationTicketData.id],
  });
  const reservedTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: reservationTicketData.id,
  });
  assert.equal(reservedTickets.reservedTicketList.length, 1);
  assert.equal(reservedTicketRecord.status, "reserved");
  assert.equal(reservedTicketRecord.ownerPlayerId, memberPlayer.id);
  assert.equal(reservedTicketRecord.reservedByJourneyId, reservationJourneyData.id);
  assert.equal(reservedTicketRecord.reservedInGameId, gameData.id);

  const releasedTickets = await releaseReservedTickets({
    dataAccessLayer,
    gameId: gameData.id,
    journeyId: reservationJourneyData.id,
    ticketIdList: [reservationTicketData.id],
  });
  const releasedTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: reservationTicketData.id,
  });
  assert.equal(releasedTickets.releasedTicketList.length, 1);
  assert.equal(releasedTicketRecord.status, "owned");
  assert.equal(releasedTicketRecord.reservedByJourneyId, null);
  assert.equal(releasedTicketRecord.reservedInGameId, null);

  const consumedTickets = await consumeTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    journeyId: reservationJourneyData.id,
    ticketIdList: [journeyTicketData.id],
  });
  const consumedTicketRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: journeyTicketData.id,
  });
  assert.equal(consumedTickets.consumedTicketList.length, 1);
  assert.equal(consumedTicketRecord.status, "consumed");
  assert.equal(consumedTicketRecord.consumedByJourneyId, reservationJourneyData.id);
  assert.equal(consumedTicketRecord.consumedInGameId, gameData.id);

  const returnedTicketData = await createReturnedTicket({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    transportType: "local_train",
    returnedMinutes: 30,
    sourceJourneyId: reservationJourneyData.id,
    reason: "smoke_test",
  });
  assert.equal(returnedTicketData.status, "owned");
  assert.equal(returnedTicketData.usableMinutes, 30);
  assert.equal(returnedTicketData.ticketSource, "returned");

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

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      journeyId: createdJourney.id,
      status: "pending",
      evidenceList: ["pending evidence"],
      actualEndLocationId: goalLocation.id,
      actualEndedAt: "2026-07-10T12:01:00+08:00",
      description: "pending request",
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    data: {
      gameId: gameData.id,
      playerId: hostPlayer.id,
      journeyId: createdJourney.id,
      status: "approved",
      evidenceList: ["approved evidence"],
      actualEndLocationId: goalLocation.id,
      actualEndedAt: "2026-07-10T12:02:00+08:00",
      description: "approved request",
      reviewNote: "approved for smoke",
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    data: {
      gameId: gameData.id,
      playerId: hostPlayer.id,
      journeyId: createdJourney.id,
      status: "rejected",
      evidenceList: ["rejected evidence"],
      actualEndLocationId: goalLocation.id,
      actualEndedAt: "2026-07-10T12:03:00+08:00",
      description: "rejected request",
      reviewNote: "rejected for smoke",
    },
  });

  const pendingTrafficIncidentRequests = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    status: "pending",
  });
  assert.equal(pendingTrafficIncidentRequests.requestList.length, 1);
  assert.equal(pendingTrafficIncidentRequests.requestList[0]?.status, "pending");
  assert.equal(pendingTrafficIncidentRequests.requestList[0]?.gameId, gameData.id);

  const trafficIncidentRequestsBeforeUpperBound = await listTrafficIncidentRequests({
    dataAccessLayer,
    gameId: gameData.id,
    createdAtBefore: "2026-07-10T12:05:00+08:00",
    queryOptions: {
      sortBy: "createdAt",
      sortDirection: "asc",
    },
  });
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList.length, 3);
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList[0]?.status, "pending");
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList[0]?.gameId, gameData.id);
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList.at(-1)?.status, "rejected");
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList[0]?.createdAt >= "2026-07-10T12:00:00+08:00", true);
  assert.equal(trafficIncidentRequestsBeforeUpperBound.requestList.at(-1)?.createdAt <= "2026-07-10T12:05:00+08:00", true);
  assert.equal(
    trafficIncidentRequestsBeforeUpperBound.requestList.every((request) => {
      return request.createdAt >= "2026-07-10T12:00:00+08:00" && request.createdAt <= "2026-07-10T12:05:00+08:00";
    }),
    true,
  );

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.RECORDS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      recordType: "traffic_incident",
      action: "submit",
      payload: { incidentId: "incident-submit" },
      createdAt: "2026-07-10T11:10:00+08:00",
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.RECORDS,
    data: {
      gameId: gameData.id,
      playerId: hostPlayer.id,
      recordType: "traffic_incident",
      action: "approve",
      payload: { incidentId: "incident-approve" },
      createdAt: "2026-07-10T11:20:00+08:00",
    },
  });
  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.RECORDS,
    data: {
      gameId: gameData.id,
      playerId: hostPlayer.id,
      recordType: "traffic_incident",
      action: "reject",
      payload: { incidentId: "incident-reject" },
      createdAt: "2026-07-10T11:30:00+08:00",
    },
  });

  const trafficIncidentReviewSummary = await getTrafficIncidentReviewSummary({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(trafficIncidentReviewSummary.reviewSummary.totalCount, 3);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.pendingCount, 1);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.approvedCount, 1);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.rejectedCount, 1);
  assert.equal(Array.isArray(trafficIncidentReviewSummary.reviewSummary.pendingRequestIdList), true);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.pendingRequestIdList.length, 1);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.pendingRequestIdList[0], "incident-pending");
  assert.equal(trafficIncidentReviewSummary.reviewSummary.gameId, gameData.id);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.pendingRequestIdList.includes("incident-pending"), true);

  const aggregatedGameReviewData = await getAggregatedGameReviewData({
    dataAccessLayer,
    gameId: gameData.id,
  });
  assert.equal(Boolean(aggregatedGameReviewData.reviewData.game.id), true);
  assert.equal(Array.isArray(aggregatedGameReviewData.reviewData.recordList), true);
  assert.equal(Boolean(aggregatedGameReviewData.reviewData.summary.recordTypeCounts), true);
  assert.equal(Array.isArray(aggregatedGameReviewData.reviewData.summary.playerResultList), true);
  assert.equal(aggregatedGameReviewData.reviewData.summary.playerResultList.length, 2);
  assert.equal(Boolean(aggregatedGameReviewData.reviewData.summary.ticketAcquisitionSourceCounts), true);
  assert.equal(Boolean(aggregatedGameReviewData.reviewData.summary.blindBoxSummary), true);
  assert.equal(aggregatedGameReviewData.reviewData.summary.blindBoxSummary.totalBlindBoxCount >= 1, true);
  assert.equal(aggregatedGameReviewData.reviewData.summary.blindBoxSummary.openedBlindBoxCount >= 0, true);
  assert.equal(aggregatedGameReviewData.reviewData.summary.blindBoxSummary.effectLogCount >= 0, true);
  assert.equal(Array.isArray(aggregatedGameReviewData.reviewData.summary.tiedPlayerIds), true);
  assert.equal(aggregatedGameReviewData.reviewData.summary.tiedPlayerIds.length, 2);
  assert.equal(aggregatedGameReviewData.reviewData.summary.winnerPlayerId, null);
  assert.equal(aggregatedGameReviewData.reviewData.summary.trafficIncidentSummary.submitCount, 1);
  assert.equal(aggregatedGameReviewData.reviewData.summary.trafficIncidentSummary.approveCount, 1);
  assert.equal(aggregatedGameReviewData.reviewData.summary.trafficIncidentSummary.rejectCount, 1);

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
  console.log("trafficIncidentReviewSummary", typeof trafficIncidentReviewSummary.reviewSummary.totalCount === "number");
  console.log("aggregatedGameReviewData", Boolean(aggregatedGameReviewData.reviewData.game.id));
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
