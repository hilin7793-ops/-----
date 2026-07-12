import assert from "node:assert/strict";

import { createServiceContext } from "../src/api/createServiceContext.js";
import { buildBlindBoxReviewQueryOptions, buildQueryOptions } from "../src/api/queryOptions.js";
import { createPlayer } from "../src/index.js";
import { resolveRequestAuthContext } from "../src/services/auth/requestAuthService.js";
import { failure, success } from "../src/utils/result.js";
import { TransportType, normalizeTransportType } from "../src/constants/transportTypes.js";
import { pickWeightedItem, randomNormal, randomSteppedNormal, snapToStep } from "../src/utils/random.js";
import { checkGameEndCondition, determineWinner, endGame, getRanking, processGameTimeEvents, recordPlayerArrival } from "../src/services/games/gameService.js";
import { calculateDurationMinutes, hasReachedTime, isOnAuctionStartTime, isOnTheHour, isWithinTimeRange } from "../src/services/time/timeService.js";
import { canCreateAuctionRound, isAuctionShopOpenForNewAuction } from "../src/services/shops/auctionShopService.js";
import { isGeneralShopOpen } from "../src/services/shops/generalShopService.js";
import { cancelJourney, completeJourney, createJourney, processJourneyTimeEvents, startJourney, updateJourney, validateCreateJourney, validateJourneyConnection, validateJourneyTime, validateUpdateJourney, validateTaxiJourney, validateWalkingJourney } from "../src/services/journeys/journeyService.js";
import { approveTrafficIncidentRequest, calculateReturnedTicketTime, getTrafficIncidentRequest, getTrafficIncidentReviewSummary, listTrafficIncidentRequests, rejectTrafficIncidentRequest, reviewTrafficIncidentRequestsBatch, submitTrafficIncidentRequest, validateTrafficIncidentRequest } from "../src/services/trafficIncidents/trafficIncidentService.js";
import { canOpenBlindBox, validateBlindBoxEffect, validateBlindBoxSetup } from "../src/services/blindBoxes/blindBoxService.js";
import { validateTicketCombination, validateTicketNotReserved, validateTicketOwnership, validateTicketTimeEnoughForJourney } from "../src/services/tickets/ticketGenerationService.js";

async function run() {
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });
  const authPlayer = await createPlayer({
    dataAccessLayer,
    userId: "unit-auth-player",
    authUserId: "auth-unit-auth-player",
    displayName: "Auth Player",
  });
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnableDevAuthUserFallback = process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK;
  const originalDisableDevAuthUserFallback = process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK;
  const originalEnableOperatorFallback = process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  const originalDisableOperatorFallback = process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  const originalAuthStrict = process.env.JAPAN_AUTH_STRICT;
  const originalPocketBaseUrl = process.env.POCKETBASE_URL;
  const originalPocketBaseAuthCollection = process.env.POCKETBASE_AUTH_COLLECTION;

  process.env.NODE_ENV = "development";
  delete process.env.POCKETBASE_URL;
  delete process.env.POCKETBASE_AUTH_COLLECTION;
  process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK = "1";
  delete process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK;
  delete process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  delete process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  delete process.env.JAPAN_AUTH_STRICT;
  const devFallbackContext = await resolveRequestAuthContext({
    request: { headers: { "x-auth-user-id": "auth-unit-auth-player" } },
    dataAccessLayer,
  });

  process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK = "0";
  delete process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK;
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = "1";
  delete process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  delete process.env.JAPAN_AUTH_STRICT;
  const operatorFallbackContext = await resolveRequestAuthContext({
    request: { headers: {} },
    dataAccessLayer,
    body: { operatorPlayerId: authPlayer.id },
  });

  process.env.JAPAN_AUTH_STRICT = "1";
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = "1";
  delete process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  const strictContext = await resolveRequestAuthContext({
    request: { headers: {} },
    dataAccessLayer,
    body: { operatorPlayerId: authPlayer.id },
  });

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  if (originalEnableDevAuthUserFallback === undefined) {
    delete process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK;
  } else {
    process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK = originalEnableDevAuthUserFallback;
  }
  if (originalDisableDevAuthUserFallback === undefined) {
    delete process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK;
  } else {
    process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK = originalDisableDevAuthUserFallback;
  }
  if (originalEnableOperatorFallback === undefined) {
    delete process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  } else {
    process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = originalEnableOperatorFallback;
  }
  if (originalDisableOperatorFallback === undefined) {
    delete process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  } else {
    process.env.JAPAN_DISABLE_OPERATOR_FALLBACK = originalDisableOperatorFallback;
  }
  if (originalAuthStrict === undefined) {
    delete process.env.JAPAN_AUTH_STRICT;
  } else {
    process.env.JAPAN_AUTH_STRICT = originalAuthStrict;
  }
  if (originalPocketBaseUrl === undefined) {
    delete process.env.POCKETBASE_URL;
  } else {
    process.env.POCKETBASE_URL = originalPocketBaseUrl;
  }
  if (originalPocketBaseAuthCollection === undefined) {
    delete process.env.POCKETBASE_AUTH_COLLECTION;
  } else {
    process.env.POCKETBASE_AUTH_COLLECTION = originalPocketBaseAuthCollection;
  }

  assert.equal(devFallbackContext.authVerified, false);
  assert.equal(devFallbackContext.playerId, authPlayer.id);
  assert.equal(devFallbackContext.authMode, "dev_auth_user");
  assert.equal(devFallbackContext.usedOperatorFallback, false);
  assert.equal(devFallbackContext.devAuthUserFallbackEnabled, true);
  assert.equal(devFallbackContext.authPolicy.strict, false);
  assert.equal(devFallbackContext.authPolicy.operatorFallbackEnabled, false);
  assert.equal(devFallbackContext.authPolicy.devAuthUserFallbackEnabled, true);

  assert.equal(operatorFallbackContext.authVerified, false);
  assert.equal(operatorFallbackContext.playerId, authPlayer.id);
  assert.equal(operatorFallbackContext.authMode, "operator_fallback");
  assert.equal(operatorFallbackContext.usedOperatorFallback, true);
  assert.equal(operatorFallbackContext.operatorFallbackEnabled, true);
  assert.equal(operatorFallbackContext.authPolicy.strict, false);
  assert.equal(operatorFallbackContext.authPolicy.operatorFallbackEnabled, true);

  assert.equal(strictContext.authVerified, false);
  assert.equal(strictContext.playerId, null);
  assert.equal(strictContext.authMode, "anonymous");
  assert.equal(strictContext.usedOperatorFallback, false);
  assert.equal(strictContext.authStrictEnabled, true);
  assert.equal(strictContext.authPolicy.strict, true);
  assert.equal(strictContext.authPolicy.operatorFallbackEnabled, false);

  const basicQueryOptions = buildQueryOptions({
    sortBy: "createdAt",
    sortDirection: "desc",
    limit: "2",
    offset: "3",
  });
  assert.equal(basicQueryOptions.sortBy, "createdAt");
  assert.equal(basicQueryOptions.sortDirection, "desc");
  assert.equal(basicQueryOptions.limit, "2");
  assert.equal(basicQueryOptions.offset, "3");

  const blindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: "desc",
    limit: "5",
    offset: "1",
    effectLogLimit: "2",
    recordSortBy: "updatedAt",
    recordSortDirection: "asc",
  });
  assert.equal(blindBoxQueryOptions.blindBoxList.sortBy, "createdAt");
  assert.equal(blindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(blindBoxQueryOptions.blindBoxList.limit, "5");
  assert.equal(blindBoxQueryOptions.blindBoxList.offset, "1");
  assert.equal(blindBoxQueryOptions.blindBoxEffectLogList.limit, "2");
  assert.equal(blindBoxQueryOptions.recordList.sortBy, "updatedAt");
  assert.equal(blindBoxQueryOptions.recordList.sortDirection, "asc");

  const defaultQueryOptions = buildQueryOptions({});
  assert.equal(defaultQueryOptions.sortBy, null);
  assert.equal(defaultQueryOptions.sortDirection, "asc");
  assert.equal(defaultQueryOptions.limit, null);
  assert.equal(defaultQueryOptions.offset, 0);

  const mixedQueryOptions = buildQueryOptions({
    sortBy: undefined,
    sortDirection: null,
    limit: undefined,
    offset: null,
  });
  assert.equal(mixedQueryOptions.sortBy, null);
  assert.equal(mixedQueryOptions.sortDirection, "asc");
  assert.equal(mixedQueryOptions.limit, null);
  assert.equal(mixedQueryOptions.offset, 0);

  const overrideQueryOptions = buildQueryOptions({
    sortBy: "departureTime",
    sortDirection: "desc",
    limit: "11",
    offset: "12",
  });
  assert.equal(overrideQueryOptions.sortBy, "departureTime");
  assert.equal(overrideQueryOptions.sortDirection, "desc");
  assert.equal(overrideQueryOptions.limit, "11");
  assert.equal(overrideQueryOptions.offset, "12");

  const fallbackBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortDirection: "desc",
    limit: "9",
    offset: "4",
  });
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.limit, "9");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.offset, "4");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "desc");
  assert.equal(fallbackBlindBoxQueryOptions.recordList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.recordList.sortDirection, "desc");

  const mixedBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: null,
    limit: undefined,
    offset: undefined,
    blindBoxSortBy: undefined,
    blindBoxSortDirection: "desc",
    effectLogSortBy: "effectCreatedAt",
    recordLimit: "4",
  });
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.sortBy, "createdAt");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.limit, null);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.offset, 0);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, "effectCreatedAt");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortBy, "createdAt");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.limit, "4");
  assert.equal(mixedBlindBoxQueryOptions.recordList.offset, 0);

  const emptyBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({});
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.sortBy, null);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.sortDirection, "asc");
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.limit, null);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.offset, 0);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, null);
  assert.equal(emptyBlindBoxQueryOptions.recordList.sortBy, null);

  const overrideBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: "asc",
    limit: "7",
    offset: "2",
    blindBoxSortBy: "openedAt",
    blindBoxSortDirection: "desc",
    blindBoxLimit: "1",
    blindBoxOffset: "5",
    effectLogSortBy: "effectCreatedAt",
    effectLogSortDirection: "asc",
    effectLogLimit: "3",
    effectLogOffset: "6",
    recordSortBy: "recordCreatedAt",
    recordSortDirection: "desc",
    recordLimit: "4",
    recordOffset: "8",
  });
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.sortBy, "openedAt");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.limit, "1");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.offset, "5");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, "effectCreatedAt");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "asc");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.limit, "3");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.offset, "6");
  assert.equal(overrideBlindBoxQueryOptions.recordList.sortBy, "recordCreatedAt");
  assert.equal(overrideBlindBoxQueryOptions.recordList.sortDirection, "desc");
  assert.equal(overrideBlindBoxQueryOptions.recordList.limit, "4");
  assert.equal(overrideBlindBoxQueryOptions.recordList.offset, "8");

  const successPayload = success({ ok: true });
  assert.equal(successPayload.success, true);
  assert.deepEqual(successPayload.data, { ok: true });

  const failurePayload = failure("FORBIDDEN", "denied", { reason: "host only" });
  assert.equal(failurePayload.success, false);
  assert.equal(failurePayload.errorCode, "FORBIDDEN");
  assert.equal(failurePayload.message, "denied");
  assert.deepEqual(failurePayload.detail, { reason: "host only" });

  assert.equal(normalizeTransportType("shinkansen"), TransportType.SHINKANSEN);
  assert.equal(normalizeTransportType("新幹線"), TransportType.SHINKANSEN);
  assert.equal(normalizeTransportType("  taxi  "), TransportType.TAXI);
  assert.equal(normalizeTransportType("unknown"), null);
  assert.equal(normalizeTransportType(null), null);

  const normalValue = randomNormal({
    average: 10,
    standardDeviation: 2,
    rng: (() => {
      const values = [0.25, 0.75];
      let index = 0;
      return () => values[index++] ?? 0.5;
    })(),
  });
  assert.equal(Number.isFinite(normalValue), true);

  assert.equal(snapToStep(12, 5, 0), 10);
  assert.equal(snapToStep(13, 5, 0), 15);
  assert.equal(snapToStep(13, 5, 3), 13);
  assert.equal(snapToStep(13, 0, 0), 13);

  const steppedValue = randomSteppedNormal({
    average: 11,
    standardDeviation: 0,
    step: 5,
    minValue: 0,
    maxValue: 20,
    rng: () => 0.5,
  });
  assert.equal(steppedValue, 10);
  assert.equal(
    randomSteppedNormal({
      average: 999,
      standardDeviation: 0,
      step: 5,
      minValue: 0,
      maxValue: 20,
      rng: () => 0.5,
    }),
    20,
  );

  assert.equal(pickWeightedItem([["a", 0], ["b", -1]]), null);
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0), "a");
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0.9999), "b");
  assert.equal(pickWeightedItem([["a", 1], ["b", 0], ["c", 2]], () => 0.5), "c");

  const onTheHour = await isOnTheHour({ currentTime: "2026-07-11T12:00:00.000Z" });
  assert.equal(onTheHour.isOnTheHour, true);

  const notOnTheHour = await isOnTheHour({ currentTime: "2026-07-11T12:34:00.000Z" });
  assert.equal(notOnTheHour.isOnTheHour, false);

  const auctionStartTime = await isOnAuctionStartTime({ currentTime: "2026-07-11T12:00:00.000Z" });
  assert.equal(auctionStartTime.isAuctionStartTime, true);

  const timeRange = await isWithinTimeRange({
    currentTime: "2026-07-11T12:30:00.000Z",
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T13:00:00.000Z",
  });
  assert.equal(timeRange.isWithinRange, true);

  const outsideTimeRange = await isWithinTimeRange({
    currentTime: "2026-07-11T13:30:00.000Z",
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T13:00:00.000Z",
  });
  assert.equal(outsideTimeRange.isWithinRange, false);

  const durationMinutes = await calculateDurationMinutes({
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T12:45:00.000Z",
  });
  assert.equal(durationMinutes.durationMinutes, 45);

  const reachedTime = await hasReachedTime({
    currentTime: "2026-07-11T12:45:00.000Z",
    targetTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(reachedTime.hasReached, true);

  const notReachedTime = await hasReachedTime({
    currentTime: "2026-07-11T12:15:00.000Z",
    targetTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(notReachedTime.hasReached, false);

  const generalShopOpen = await isGeneralShopOpen({
    currentTime: "2026-07-11T06:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  const generalShopClosed = await isGeneralShopOpen({
    currentTime: "2026-07-11T20:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  assert.equal(generalShopOpen.isOpen, true);
  assert.equal(generalShopClosed.isOpen, false);

  const auctionShopOpen = await isAuctionShopOpenForNewAuction({
    currentTime: "2026-07-11T06:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  const auctionShopClosed = await isAuctionShopOpenForNewAuction({
    currentTime: "2026-07-11T20:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  assert.equal(auctionShopOpen.isOpen, true);
  assert.equal(auctionShopClosed.isOpen, false);
  let auctionShopInvalidTimeMessage = null;
  try {
    await isAuctionShopOpenForNewAuction({
      currentTime: "not-a-time",
      timeZone: "Asia/Taipei",
    });
  } catch (error) {
    auctionShopInvalidTimeMessage = error.message;
  }
  assert.equal(auctionShopInvalidTimeMessage, "Invalid time input");

  let generalShopInvalidTimeMessage = null;
  try {
    await isGeneralShopOpen({
      currentTime: "not-a-time",
      timeZone: "Asia/Taipei",
    });
  } catch (error) {
    generalShopInvalidTimeMessage = error.message;
  }
  assert.equal(generalShopInvalidTimeMessage, "Invalid time input");

  const canCreateAuctionRoundOpen = await canCreateAuctionRound({
    dataAccessLayer: {
      async findOneRecord() {
        return null;
      },
    },
    gameId: "game-1",
    currentTime: "2026-07-11T06:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  const canCreateAuctionRoundClosed = await canCreateAuctionRound({
    dataAccessLayer: {
      async findOneRecord() {
        return null;
      },
    },
    gameId: "game-1",
    currentTime: "2026-07-10T21:30:00.000Z",
    timeZone: "Asia/Taipei",
  });
  const canCreateAuctionRoundActive = await canCreateAuctionRound({
    dataAccessLayer: {
      async findOneRecord() {
        return { id: "auction-1" };
      },
    },
    gameId: "game-1",
    currentTime: "2026-07-11T06:00:00.000Z",
    timeZone: "Asia/Taipei",
  });
  assert.equal(canCreateAuctionRoundOpen.canCreate, true);
  assert.equal(canCreateAuctionRoundClosed.canCreate, false);
  assert.equal(canCreateAuctionRoundActive.canCreate, false);

  const validJourneyTime = await validateJourneyTime({
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  const invalidJourneyTime = await validateJourneyTime({
    departureTime: "2026-07-11T10:00:00.000Z",
    arrivalTime: "2026-07-11T09:30:00.000Z",
    currentTime: "2026-07-11T09:00:00.000Z",
  });
  assert.equal(validJourneyTime.isValid, true);
  assert.equal(invalidJourneyTime.isValid, false);
  const invalidJourneyTimeEarlierCurrent = await validateJourneyTime({
    departureTime: "2026-07-11T10:00:00.000Z",
    arrivalTime: "2026-07-11T12:00:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  const invalidJourneyTimeSameMoment = await validateJourneyTime({
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:00:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(invalidJourneyTimeEarlierCurrent.isValid, false);
  assert.equal(invalidJourneyTimeEarlierCurrent.reason, "Departure time cannot be earlier than current time");
  assert.equal(invalidJourneyTimeSameMoment.isValid, false);
  assert.equal(invalidJourneyTimeSameMoment.reason, "Arrival time must be later than departure time");

  const returnedTicketTime = await calculateReturnedTicketTime({
    journeyId: "journey-1",
    originalJourneyData: { arrivalTime: "2026-07-11T12:30:00.000Z" },
    actualEndLocationId: "location-1",
    actualEndTime: "2026-07-11T12:10:00.000Z",
    transportType: "local_train",
  });
  const returnedTicketTimeExact = await calculateReturnedTicketTime({
    journeyId: "journey-1",
    originalJourneyData: { arrivalTime: "2026-07-11T12:31:00.000Z" },
    actualEndLocationId: "location-1",
    actualEndTime: "2026-07-11T12:30:00.000Z",
    transportType: "local_train",
  });
  assert.equal(returnedTicketTime.returnedMinutes, 20);
  assert.equal(returnedTicketTimeExact.returnedMinutes, 1);

  let returnedTicketTimeInvalidMessage = null;
  try {
    await calculateReturnedTicketTime({
      journeyId: "journey-1",
      originalJourneyData: { arrivalTime: "2026-07-11T12:10:00.000Z" },
      actualEndLocationId: "location-1",
      actualEndTime: "2026-07-11T12:10:00.000Z",
      transportType: "local_train",
    });
  } catch (error) {
    returnedTicketTimeInvalidMessage = error.message;
  }
  assert.equal(returnedTicketTimeInvalidMessage, "Returned ticket time must be greater than 0");

  const ticketRecords = new Map([
    ["ticket-1", { id: "ticket-1", transportType: "local_train", usableMinutes: 30 }],
    ["ticket-2", { id: "ticket-2", transportType: "universal", usableMinutes: 15 }],
    ["ticket-3", { id: "ticket-3", transportType: "taxi", usableMinutes: 10 }],
  ]);
  const mockTicketDataAccessLayer = {
    getRecordById: async ({ recordId }) => ticketRecords.get(recordId) ?? null,
  };

  const trainCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1"],
    selectedTransportType: "local_train",
  });
  const mixedCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1", "ticket-3"],
    selectedTransportType: "local_train",
  });
  const walkingCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: [],
    selectedTransportType: "walking",
  });
  assert.equal(trainCombination.isValid, true);
  assert.equal(mixedCombination.isValid, false);
  assert.equal(walkingCombination.isValid, true);

  const universalOnlyCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-2"],
    selectedTransportType: "local_train",
  });
  const mismatchedCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1"],
    selectedTransportType: "taxi",
  });
  const unknownTransportCombination = await validateTicketCombination({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1"],
    selectedTransportType: "unknown",
  });
  assert.equal(universalOnlyCombination.isValid, false);
  assert.equal(universalOnlyCombination.reason, "Universal tickets cannot be used alone");
  assert.equal(mismatchedCombination.isValid, false);
  assert.equal(mismatchedCombination.reason, "Selected transport type does not match ticket combination");
  assert.equal(unknownTransportCombination.isValid, false);
  assert.equal(unknownTransportCombination.reason, "Unknown transport type");

  const ticketTimeEnough = await validateTicketTimeEnoughForJourney({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1", "ticket-2"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:40:00.000Z",
  });
  const ticketTimeNotEnough = await validateTicketTimeEnoughForJourney({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:45:00.000Z",
  });
  const ticketTimeExactEnough = await validateTicketTimeEnoughForJourney({
    dataAccessLayer: mockTicketDataAccessLayer,
    ticketIdList: ["ticket-1", "ticket-2"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:45:00.000Z",
  });
  assert.equal(ticketTimeEnough.isEnough, true);
  assert.equal(ticketTimeNotEnough.isEnough, false);
  assert.equal(ticketTimeExactEnough.isEnough, true);

  const trafficIncidentRequestDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-incident-1") {
        return {
          id: "journey-incident-1",
          gameId: "game-9",
          playerId: "player-9",
          status: "started",
          departureTime: "2026-07-11T12:00:00.000Z",
          arrivalTime: "2026-07-11T12:40:00.000Z",
          fromLocationId: "location-1",
          toLocationId: "location-4",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-9" && filterOptions.playerId === "player-9" && filterOptions.journeyId === "journey-incident-1" && filterOptions.status === "pending") {
        return null;
      }
      return null;
    },
  };
  const trafficIncidentRequestValid = await validateTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentRequestDataAccessLayer,
    gameId: "game-9",
    playerId: "player-9",
    journeyId: "journey-incident-1",
    actualEndLocationId: "location-short",
    actualEndedAt: "2026-07-11T12:20:00.000Z",
    evidenceList: ["photo-1"],
  });
  const trafficIncidentRequestMissingEvidence = await validateTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentRequestDataAccessLayer,
    gameId: "game-9",
    playerId: "player-9",
    journeyId: "journey-incident-1",
    actualEndLocationId: "location-short",
    actualEndedAt: "2026-07-11T12:20:00.000Z",
    evidenceList: [],
  });
  assert.equal(trafficIncidentRequestValid.isValid, true);
  assert.equal(trafficIncidentRequestMissingEvidence.isValid, false);
  assert.equal(trafficIncidentRequestMissingEvidence.reason, "At least one evidence entry is required");
  const trafficIncidentRequestDuplicatePending = await validateTrafficIncidentRequest({
    dataAccessLayer: {
      ...trafficIncidentRequestDataAccessLayer,
      async findOneRecord({ collectionName, filterOptions }) {
        if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-9" && filterOptions.playerId === "player-9" && filterOptions.journeyId === "journey-incident-1" && filterOptions.status === "pending") {
          return {
            id: "request-existing-1",
            gameId: "game-9",
            playerId: "player-9",
            journeyId: "journey-incident-1",
            status: "pending",
          };
        }
        return null;
      },
    },
    gameId: "game-9",
    playerId: "player-9",
    journeyId: "journey-incident-1",
    actualEndLocationId: "location-short",
    actualEndedAt: "2026-07-11T12:20:00.000Z",
    evidenceList: ["photo-1"],
  });
  assert.equal(trafficIncidentRequestDuplicatePending.isValid, false);
  assert.equal(trafficIncidentRequestDuplicatePending.reason, "There is already a pending traffic incident request for this journey");

  const trafficIncidentQueryDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "traffic_incident_requests" && recordId === "request-query-1") {
        return {
          id: "request-query-1",
          gameId: "game-11",
          playerId: "player-11",
          journeyId: "journey-query-1",
          status: "pending",
          createdAt: "2026-07-11T12:10:00.000Z",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-11") {
        return [
          {
            id: "request-query-1",
            gameId: "game-11",
            playerId: "player-11",
            journeyId: "journey-query-1",
            status: "pending",
            createdAt: "2026-07-11T12:10:00.000Z",
          },
          {
            id: "request-query-2",
            gameId: "game-11",
            playerId: "player-12",
            journeyId: "journey-query-2",
            status: "approved",
            createdAt: "2026-07-11T12:30:00.000Z",
          },
        ];
      }
      return [];
    },
  };
  const trafficIncidentRequest = await getTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentQueryDataAccessLayer,
    requestId: "request-query-1",
  });
  const trafficIncidentRequestList = await listTrafficIncidentRequests({
    dataAccessLayer: trafficIncidentQueryDataAccessLayer,
    gameId: "game-11",
    filterOptions: {
      createdAtAfter: "2026-07-11T12:00:00.000Z",
      createdAtBefore: "2026-07-11T12:20:00.000Z",
    },
  });
  assert.equal(trafficIncidentRequest.id, "request-query-1");
  assert.equal(trafficIncidentRequest.status, "pending");
  assert.equal(trafficIncidentRequestList.requestList.length, 1);
  assert.equal(trafficIncidentRequestList.requestList[0].id, "request-query-1");

  const trafficIncidentSubmitDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-submit-1") {
        return {
          id: "journey-submit-1",
          gameId: "game-13",
          playerId: "player-13",
          status: "started",
          departureTime: "2026-07-11T12:00:00.000Z",
          arrivalTime: "2026-07-11T12:40:00.000Z",
          fromLocationId: "location-1",
          toLocationId: "location-4",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-13") {
        return {
          id: "game-player-13",
          gameId: "game-13",
          playerId: "player-13",
          currentLocationId: "location-mid",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-13" && filterOptions.playerId === "player-13" && filterOptions.journeyId === "journey-submit-1" && filterOptions.status === "pending") {
        return null;
      }
      if (collectionName === "game_players" && filterOptions.gameId === "game-13" && filterOptions.playerId === "player-13") {
        return {
          id: "game-player-13",
          gameId: "game-13",
          playerId: "player-13",
          currentLocationId: "location-mid",
        };
      }
      return null;
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "traffic_incident_requests") {
        return { id: "request-submit-1", ...data };
      }
      if (collectionName === "records") {
        return { id: "record-submit-1", ...data };
      }
      return { id: "created-1", ...data };
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "journeys") {
        return { id: recordId, ...data };
      }
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async listRecords() {
      return [];
    },
  };
  const trafficIncidentSubmitResult = await submitTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentSubmitDataAccessLayer,
    gameId: "game-13",
    playerId: "player-13",
    journeyId: "journey-submit-1",
    actualEndLocationId: "location-short",
    actualEndedAt: "2026-07-11T12:20:00.000Z",
    evidenceList: ["photo-1"],
    description: "test submit",
  });
  assert.equal(trafficIncidentSubmitResult.id, "request-submit-1");
  assert.equal(trafficIncidentSubmitResult.status, "pending");

  const trafficIncidentSummaryDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-12") {
        return [
          { id: "request-summary-1", status: "pending", createdAt: "2026-07-11T12:05:00.000Z" },
          { id: "request-summary-2", status: "approved", createdAt: "2026-07-11T12:15:00.000Z" },
          { id: "request-summary-3", status: "rejected", createdAt: "2026-07-11T12:25:00.000Z" },
        ];
      }
      return [];
    },
  };
  const trafficIncidentReviewSummary = await getTrafficIncidentReviewSummary({
    dataAccessLayer: trafficIncidentSummaryDataAccessLayer,
    gameId: "game-12",
  });
  assert.equal(trafficIncidentReviewSummary.reviewSummary.totalCount, 3);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.pendingCount, 1);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.approvedCount, 1);
  assert.equal(trafficIncidentReviewSummary.reviewSummary.rejectedCount, 1);
  assert.deepEqual(trafficIncidentReviewSummary.reviewSummary.pendingRequestIdList, ["request-summary-1"]);

  const trafficIncidentReviewDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "traffic_incident_requests" && recordId === "request-1") {
        return {
          id: "request-1",
          gameId: "game-9",
          playerId: "player-9",
          journeyId: "journey-incident-1",
          status: "pending",
          actualEndLocationId: "location-short",
          actualEndedAt: "2026-07-11T12:20:00.000Z",
        };
      }
      if (collectionName === "journeys" && recordId === "journey-incident-1") {
        return {
          id: "journey-incident-1",
          gameId: "game-9",
          playerId: "player-9",
          status: "started",
          departureTime: "2026-07-11T12:00:00.000Z",
          arrivalTime: "2026-07-11T12:40:00.000Z",
          fromLocationId: "location-1",
          toLocationId: "location-4",
          transportType: "taxi",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-9") {
        return {
          id: "game-player-9",
          gameId: "game-9",
          playerId: "player-9",
          currentLocationId: "location-mid",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-9" && filterOptions.playerId === "player-9" && filterOptions.journeyId === "journey-incident-1" && filterOptions.status === "pending") {
        return null;
      }
      if (collectionName === "game_players" && filterOptions.gameId === "game-9" && filterOptions.playerId === "player-9") {
        return {
          id: "game-player-9",
          gameId: "game-9",
          playerId: "player-9",
          currentLocationId: "location-mid",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-9" && filterOptions.playerId === "player-9" && filterOptions.ticketId === "ticket-return-1") {
        return { id: "player-ticket-return-1" };
      }
      return null;
    },
    async listRecords() {
      return [];
    },
    async updateRecordById({ collectionName, recordId, data }) {
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "tickets") {
        return { id: "ticket-return-1", ...data };
      }
      if (collectionName === "records") {
        return { id: "record-traffic-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const approvedTrafficIncident = await approveTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentReviewDataAccessLayer,
    requestId: "request-1",
    reviewerId: "reviewer-1",
    reviewNote: "approved",
  });
  assert.equal(approvedTrafficIncident.request.status, "approved");
  assert.equal(approvedTrafficIncident.returnedTicket.id, "ticket-return-1");
  const rejectedTrafficIncident = await rejectTrafficIncidentRequest({
    dataAccessLayer: trafficIncidentReviewDataAccessLayer,
    requestId: "request-1",
    reviewerId: "reviewer-1",
    rejectReason: "insufficient evidence",
  });
  assert.equal(rejectedTrafficIncident.status, "rejected");

  await assert.rejects(
    approveTrafficIncidentRequest({
      dataAccessLayer: {
        ...trafficIncidentReviewDataAccessLayer,
        async getRecordById({ collectionName, recordId }) {
          if (collectionName === "traffic_incident_requests" && recordId === "request-2") {
            return {
              id: "request-2",
              gameId: "game-9",
              playerId: "player-9",
              journeyId: "journey-incident-2",
              status: "approved",
              actualEndLocationId: "location-short",
              actualEndedAt: "2026-07-11T12:20:00.000Z",
              evidenceList: ["photo-1"],
            };
          }
          return null;
        },
      },
      requestId: "request-2",
      reviewerId: "reviewer-1",
      reviewNote: "approved",
    }),
    /Traffic incident request is not pending/,
  );

  await assert.rejects(
    rejectTrafficIncidentRequest({
      dataAccessLayer: {
        ...trafficIncidentReviewDataAccessLayer,
        async getRecordById({ collectionName, recordId }) {
          if (collectionName === "traffic_incident_requests" && recordId === "request-3") {
            return {
              id: "request-3",
              gameId: "game-9",
              playerId: "player-9",
              journeyId: "journey-incident-3",
              status: "rejected",
              actualEndLocationId: "location-short",
              actualEndedAt: "2026-07-11T12:20:00.000Z",
              evidenceList: ["photo-1"],
            };
          }
          return null;
        },
      },
      requestId: "request-3",
      reviewerId: "reviewer-1",
      rejectReason: "insufficient evidence",
    }),
    /Traffic incident request is not pending/,
  );

  const trafficIncidentBatchDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "traffic_incident_requests" && recordId === "request-batch-1") {
        return {
          id: "request-batch-1",
          gameId: "game-10",
          playerId: "player-10",
          journeyId: "journey-batch-1",
          status: "pending",
          actualEndLocationId: "location-short",
          actualEndedAt: "2026-07-11T12:20:00.000Z",
        };
      }
      if (collectionName === "traffic_incident_requests" && recordId === "request-batch-2") {
        return {
          id: "request-batch-2",
          gameId: "game-10",
          playerId: "player-11",
          journeyId: "journey-batch-2",
          status: "pending",
          actualEndLocationId: "location-short",
          actualEndedAt: "2026-07-11T12:25:00.000Z",
        };
      }
      if (collectionName === "journeys" && recordId === "journey-batch-1") {
        return {
          id: "journey-batch-1",
          gameId: "game-10",
          playerId: "player-10",
          status: "started",
          departureTime: "2026-07-11T12:00:00.000Z",
          arrivalTime: "2026-07-11T12:40:00.000Z",
          fromLocationId: "location-1",
          toLocationId: "location-4",
          transportType: "taxi",
        };
      }
      if (collectionName === "journeys" && recordId === "journey-batch-2") {
        return {
          id: "journey-batch-2",
          gameId: "game-10",
          playerId: "player-11",
          status: "started",
          departureTime: "2026-07-11T12:05:00.000Z",
          arrivalTime: "2026-07-11T12:45:00.000Z",
          fromLocationId: "location-1",
          toLocationId: "location-5",
          transportType: "taxi",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-10" && filterOptions.journeyId === "journey-batch-1" && filterOptions.status === "pending") {
        return null;
      }
      if (collectionName === "traffic_incident_requests" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-11" && filterOptions.journeyId === "journey-batch-2" && filterOptions.status === "pending") {
        return null;
      }
      if (collectionName === "game_players" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-10") {
        return { id: "game-player-10", gameId: "game-10", playerId: "player-10", currentLocationId: "location-mid" };
      }
      if (collectionName === "game_players" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-11") {
        return { id: "game-player-11", gameId: "game-10", playerId: "player-11", currentLocationId: "location-mid" };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-10" && filterOptions.ticketId === "ticket-return-1") {
        return { id: "player-ticket-return-1" };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-10" && filterOptions.playerId === "player-11" && filterOptions.ticketId === "ticket-return-2") {
        return { id: "player-ticket-return-2" };
      }
      return null;
    },
    async listRecords() {
      return [];
    },
    async updateRecordById({ collectionName, recordId, data }) {
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "tickets") {
        return { id: data.playerId === "player-10" ? "ticket-return-1" : "ticket-return-2", ...data };
      }
      if (collectionName === "records") {
        return { id: "record-batch-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const trafficIncidentBatchResult = await reviewTrafficIncidentRequestsBatch({
    dataAccessLayer: trafficIncidentBatchDataAccessLayer,
    gameId: "game-10",
    requestIdList: ["request-batch-1", "request-batch-2"],
    decision: "approve",
    reviewerId: "reviewer-10",
    reviewNote: "batch approved",
  });
  assert.equal(trafficIncidentBatchResult.success, true);
  assert.equal(trafficIncidentBatchResult.reviewedCount, 2);
  assert.equal(trafficIncidentBatchResult.decision, "approve");

  let trafficIncidentBatchInvalidDecisionMessage = null;
  try {
    await reviewTrafficIncidentRequestsBatch({
      dataAccessLayer: trafficIncidentBatchDataAccessLayer,
      gameId: "game-10",
      requestIdList: ["request-batch-1"],
      decision: "maybe",
      reviewerId: "reviewer-10",
    });
  } catch (error) {
    trafficIncidentBatchInvalidDecisionMessage = error.message;
  }
  assert.equal(trafficIncidentBatchInvalidDecisionMessage, "decision must be approve or reject");

  const mockJourneyDataAccessLayer = {
    findOneRecord: async ({ collectionName, filterOptions }) => {
      if (collectionName === "player_tickets" && filterOptions.ticketId === "ticket-1") {
        return { id: "player-ticket-1" };
      }
      return null;
    },
    listRecords: async ({ collectionName, filterOptions }) => {
      if (collectionName === "journeys" && filterOptions.status === "reserved") {
        return [
          { id: "journey-reserved-1", ticketIdList: ["ticket-2"], status: "reserved" },
          { id: "journey-reserved-2", ticketIdList: ["ticket-3"], status: "reserved" },
        ];
      }
      return [];
    },
  };

  const ticketOwnershipOk = await validateTicketOwnership({
    dataAccessLayer: mockJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    ticketIdList: ["ticket-1"],
  });
  const ticketOwnershipBad = await validateTicketOwnership({
    dataAccessLayer: mockJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    ticketIdList: ["ticket-1", "ticket-2"],
  });
  assert.equal(ticketOwnershipOk.isValid, true);
  assert.equal(ticketOwnershipBad.isValid, false);

  const ticketNotReservedOk = await validateTicketNotReserved({
    dataAccessLayer: mockJourneyDataAccessLayer,
    gameId: "game-1",
    ticketIdList: ["ticket-1"],
  });
  const ticketNotReservedBad = await validateTicketNotReserved({
    dataAccessLayer: mockJourneyDataAccessLayer,
    gameId: "game-1",
    ticketIdList: ["ticket-2", "ticket-3"],
  });
  const ticketNotReservedExcluded = await validateTicketNotReserved({
    dataAccessLayer: mockJourneyDataAccessLayer,
    gameId: "game-1",
    ticketIdList: ["ticket-2"],
    excludedJourneyId: "journey-reserved-1",
  });
  assert.equal(ticketNotReservedOk.isValid, true);
  assert.equal(ticketNotReservedBad.isValid, false);
  assert.equal(ticketNotReservedExcluded.isValid, true);

  const blindBoxSetupValid = await validateBlindBoxSetup({
    dataAccessLayer: null,
    gameId: "game-1",
    blindBoxConfigList: [
      {
        locationId: "location-1",
        effectData: { effectType: "money", operator: "+=", value: 100 },
      },
    ],
    locationExists: async ({ gameId, locationId }) => {
      assert.equal(gameId, "game-1");
      assert.equal(locationId, "location-1");
      return true;
    },
  });
  const blindBoxSetupInvalid = await validateBlindBoxSetup({
    dataAccessLayer: null,
    gameId: "game-1",
    blindBoxConfigList: [
      {
        locationId: "location-1",
        effectData: { effectType: "gain_free_shop_refresh", freeRefreshCount: 0 },
      },
      {
        locationId: "location-1",
        effectData: { effectType: "unknown_effect" },
      },
      {
        locationId: "",
        effectData: null,
      },
    ],
    locationExists: async () => true,
  });
  const blindBoxSetupPostGame = await validateBlindBoxSetup({
    dataAccessLayer: {
      async getRecordById({ collectionName, recordId }) {
        if (collectionName === "games" && recordId === "game-1") {
          return {
            id: "game-1",
            status: "started",
          };
        }
        return null;
      },
    },
    gameId: "game-1",
    blindBoxConfigList: [
      {
        locationId: "location-1",
        effectData: { effectType: "money", operator: "+=", value: 100 },
      },
    ],
  });
  assert.equal(blindBoxSetupValid.isValid, true);
  assert.equal(blindBoxSetupInvalid.isValid, false);
  assert.equal(blindBoxSetupInvalid.reasonList.length >= 3, true);
  assert.equal(blindBoxSetupPostGame.isValid, false);
  assert.equal(blindBoxSetupPostGame.reasonList.includes("blind boxes must be finalized before game start"), true);

  const blindBoxEffectValid = await validateBlindBoxEffect({
    effectData: { effectType: "money", operator: "+=", value: 100 },
  });
  const blindBoxEffectConditionalValid = await validateBlindBoxEffect({
    effectData: {
      effectType: "conditional",
      conditionData: { field: "money", operator: ">=", value: 100 },
      thenEffectData: { effectType: "money", operator: "+=", value: 50 },
    },
  });
  let blindBoxEffectInvalidMessage = null;
  try {
    await validateBlindBoxEffect({
      effectData: {
        effectType: "gain_free_shop_refresh",
        freeRefreshCount: 0,
      },
    });
  } catch (error) {
    blindBoxEffectInvalidMessage = error.message;
  }
  assert.equal(blindBoxEffectValid.isValid, true);
  assert.equal(blindBoxEffectConditionalValid.isValid, true);
  assert.equal(blindBoxEffectInvalidMessage, "freeRefreshCount must be a positive integer");

  const blindBoxDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "blind_boxes" && recordId === "blind-box-1") {
        return {
          id: "blind-box-1",
          gameId: "game-1",
          locationId: "location-1",
          openedStatus: false,
          status: "available",
        };
      }
      if (collectionName === "blind_boxes" && recordId === "blind-box-opened") {
        return {
          id: "blind-box-opened",
          gameId: "game-1",
          locationId: "location-1",
          openedStatus: true,
          status: "opened",
        };
      }
      return null;
    },
  };
  const blindBoxOpenOk = await canOpenBlindBox({
    dataAccessLayer: blindBoxDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    blindBoxId: "blind-box-1",
    currentTime: "2026-07-11T12:00:00.000Z",
    getPlayerLocation: async () => "location-1",
  });
  const blindBoxOpenMismatch = await canOpenBlindBox({
    dataAccessLayer: blindBoxDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    blindBoxId: "blind-box-1",
    currentTime: "2026-07-11T12:00:00.000Z",
    getPlayerLocation: async () => "location-2",
  });
  const blindBoxOpenBlockedByStatus = await canOpenBlindBox({
    dataAccessLayer: blindBoxDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    blindBoxId: "blind-box-opened",
    currentTime: "2026-07-11T12:00:00.000Z",
    getPlayerLocation: async () => "location-1",
  });
  const blindBoxOpenBeforeGame = await canOpenBlindBox({
    dataAccessLayer: blindBoxDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    blindBoxId: "blind-box-1",
    currentTime: "2026-07-11T12:00:00.000Z",
    getPlayerLocation: async () => "location-1",
    getGame: async () => ({ status: "pre_game" }),
  });
  assert.equal(blindBoxOpenOk.canOpen, true);
  assert.equal(blindBoxOpenMismatch.canOpen, false);
  assert.equal(blindBoxOpenMismatch.reason, "Player location mismatch");
  assert.equal(blindBoxOpenBlockedByStatus.canOpen, false);
  assert.equal(blindBoxOpenBlockedByStatus.reason, "Blind box already opened");
  assert.equal(blindBoxOpenBeforeGame.canOpen, false);
  assert.equal(blindBoxOpenBeforeGame.reason, "Game has not started");

  const createJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "games" && recordId === "game-1") {
        return {
          id: "game-1",
          startLocationId: "location-1",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "tickets" && recordId === "ticket-1") {
        return {
          id: "ticket-1",
          transportType: "taxi",
          usableMinutes: 30,
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1" && filterOptions.ticketId === "ticket-1") {
        return {
          id: "player-ticket-1",
          gameId: "game-1",
          playerId: "player-1",
          ticketId: "ticket-1",
        };
      }
      if (collectionName === "tickets" && recordId === "ticket-1") {
        return {
          id: "ticket-1",
          transportType: "taxi",
          usableMinutes: 30,
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [];
      }
      return [];
    },
  };
  const createJourneyValid = await validateCreateJourney({
    dataAccessLayer: createJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    fromLocationId: "location-1",
    toLocationId: "location-2",
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  const createJourneyInvalid = await validateCreateJourney({
    dataAccessLayer: createJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    fromLocationId: "location-3",
    toLocationId: "location-2",
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(createJourneyValid.isValid, true);
  assert.equal(createJourneyInvalid.isValid, false);
  assert.equal(createJourneyInvalid.reason, "First journey must start from the game start location");

  const createdJourneyRecords = [];
  const createJourneyResult = await createJourney({
    dataAccessLayer: {
      ...createJourneyDataAccessLayer,
      async updateRecordById({ collectionName, recordId, data }) {
        assert.equal(collectionName, "game_players");
        assert.equal(recordId, "game-player-1");
        return { id: recordId, ...data };
      },
      async createRecordInCollection({ collectionName, data }) {
        if (collectionName === "records") {
          return { id: "record-1", ...data };
        }
        assert.equal(collectionName, "journeys");
        const createdRecord = { id: "journey-created-1", ...data };
        createdJourneyRecords.push(createdRecord);
        return createdRecord;
      },
    },
    gameId: "game-1",
    playerId: "player-1",
    fromLocationId: "location-1",
    toLocationId: "location-2",
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    metadata: { note: "unit-test" },
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(createJourneyResult.id, "journey-created-1");
  assert.equal(createJourneyResult.status, "reserved");
  assert.equal(createdJourneyRecords.length, 1);
  assert.equal(createdJourneyRecords[0].metadata.note, "unit-test");

  const updateJourneyDataAccessLayerSuccess = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-1") {
        return {
          id: "journey-1",
          gameId: "game-1",
          playerId: "player-1",
          status: "reserved",
          isLocked: false,
          fromLocationId: "location-1",
          toLocationId: "location-2",
          ticketIdList: ["ticket-1"],
          metadata: { original: true },
          arrivalTime: "2026-07-11T12:30:00.000Z",
        };
      }
      if (collectionName === "games" && recordId === "game-1") {
        return {
          id: "game-1",
          startLocationId: "location-1",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "tickets" && recordId === "ticket-1") {
        return {
          id: "ticket-1",
          transportType: "taxi",
          usableMinutes: 30,
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1" && filterOptions.ticketId === "ticket-1") {
        return {
          id: "player-ticket-1",
          gameId: "game-1",
          playerId: "player-1",
          ticketId: "ticket-1",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [
          {
            id: "journey-previous",
            gameId: "game-1",
            playerId: "player-1",
            status: "completed",
            toLocationId: "location-2",
            arrivalTime: "2026-07-11T11:30:00.000Z",
          },
        ];
      }
      return [];
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      if (collectionName === "journeys") {
        return { id: recordId, ...data, status: "reserved" };
      }
      if (collectionName === "tickets") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-1", ...data };
      }
      return { id: "journey-created-1", ...data };
    },
  };
  const updateJourneyResult = await updateJourney({
    dataAccessLayer: {
      ...updateJourneyDataAccessLayerSuccess,
    },
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-1",
    fromLocationId: "location-2",
    toLocationId: "location-3",
    transportType: "taxi",
    ticketIdList: ["ticket-1"],
    departureTime: "2026-07-11T12:31:00.000Z",
    arrivalTime: "2026-07-11T12:50:00.000Z",
    metadata: { updated: true },
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(updateJourneyResult.id, "journey-1");
  assert.equal(updateJourneyResult.metadata.original, true);
  assert.equal(updateJourneyResult.metadata.updated, true);
  assert.equal(updateJourneyResult.transportType, "taxi");

  const cancelJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-2") {
        return {
          id: "journey-2",
          gameId: "game-1",
          playerId: "player-1",
          status: "reserved",
          isLocked: false,
          ticketIdList: ["ticket-1"],
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "journeys") {
        return { id: recordId, ...data };
      }
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      if (collectionName === "tickets") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-cancel-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const cancelJourneyResult = await cancelJourney({
    dataAccessLayer: cancelJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-2",
    reason: "test cancel",
  });
  assert.equal(cancelJourneyResult.status, "cancelled");
  assert.equal(cancelJourneyResult.cancelReason, "test cancel");

  const startJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-4") {
        return {
          id: "journey-4",
          gameId: "game-1",
          playerId: "player-1",
          status: "reserved",
          isLocked: false,
          fromLocationId: "location-2",
          toLocationId: "location-4",
          ticketIdList: ["ticket-1"],
          transportType: "taxi",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "journeys") {
        return { id: recordId, ...data, status: "started" };
      }
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      if (collectionName === "tickets") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1" && filterOptions.ticketId === "ticket-1") {
        return {
          id: "player-ticket-1",
          gameId: "game-1",
          playerId: "player-1",
          ticketId: "ticket-1",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [
          {
            id: "journey-previous",
            gameId: "game-1",
            playerId: "player-1",
            status: "completed",
            toLocationId: "location-2",
            arrivalTime: "2026-07-11T11:30:00.000Z",
          },
        ];
      }
      return [];
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-start-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const startJourneyResult = await startJourney({
    dataAccessLayer: startJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-4",
    startedAt: "2026-07-11T12:31:00.000Z",
  });
  assert.equal(startJourneyResult.status, "started");
  assert.equal(startJourneyResult.startedAt, "2026-07-11T12:31:00.000Z");

  const completeJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-3") {
        return {
          id: "journey-3",
          gameId: "game-1",
          playerId: "player-1",
          status: "started",
          isLocked: true,
          fromLocationId: "location-2",
          toLocationId: "location-4",
          ticketIdList: ["ticket-1"],
          transportType: "taxi",
          arrivalTime: "2026-07-11T12:40:00.000Z",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "journeys") {
        return { id: recordId, ...data };
      }
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      if (collectionName === "tickets") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1" && filterOptions.ticketId === "ticket-1") {
        return {
          id: "player-ticket-1",
          gameId: "game-1",
          playerId: "player-1",
          ticketId: "ticket-1",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [
          {
            id: "journey-previous",
            gameId: "game-1",
            playerId: "player-1",
            status: "started",
            toLocationId: "location-2",
            arrivalTime: "2026-07-11T11:30:00.000Z",
          },
        ];
      }
      return [];
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-complete-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const completeJourneyResult = await completeJourney({
    dataAccessLayer: completeJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-3",
    completedAt: "2026-07-11T12:40:00.000Z",
  });
  assert.equal(completeJourneyResult.status, "completed");
  assert.equal(completeJourneyResult.completedAt, "2026-07-11T12:40:00.000Z");

  const processJourneyTimeEventsDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [
          {
            id: "journey-5",
            gameId: "game-1",
            playerId: "player-1",
            status: "reserved",
            departureTime: "2026-07-11T12:00:00.000Z",
            arrivalTime: "2026-07-11T12:30:00.000Z",
            fromLocationId: "location-2",
            toLocationId: "location-4",
            ticketIdList: [],
            transportType: "walking",
          },
          {
            id: "journey-6",
            gameId: "game-1",
            playerId: "player-1",
            status: "started",
            departureTime: "2026-07-11T11:30:00.000Z",
            arrivalTime: "2026-07-11T12:10:00.000Z",
            fromLocationId: "location-2",
            toLocationId: "location-5",
            ticketIdList: [],
            transportType: "walking",
          },
        ];
      }
      return [];
    },
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-5") {
        return {
          id: "journey-5",
          gameId: "game-1",
          playerId: "player-1",
          status: "reserved",
          isLocked: false,
          departureTime: "2026-07-11T12:00:00.000Z",
          arrivalTime: "2026-07-11T12:30:00.000Z",
          fromLocationId: "location-2",
          toLocationId: "location-4",
          ticketIdList: [],
          transportType: "walking",
        };
      }
      if (collectionName === "journeys" && recordId === "journey-6") {
        return {
          id: "journey-6",
          gameId: "game-1",
          playerId: "player-1",
          status: "started",
          isLocked: true,
          departureTime: "2026-07-11T11:30:00.000Z",
          arrivalTime: "2026-07-11T12:10:00.000Z",
          fromLocationId: "location-2",
          toLocationId: "location-5",
          ticketIdList: [],
          transportType: "walking",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "journeys") {
        if (recordId === "journey-5") {
          return { id: recordId, ...data, status: "started" };
        }
        if (recordId === "journey-6") {
          return { id: recordId, ...data, status: "completed" };
        }
      }
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-time-event-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const processJourneyTimeEventsResult = await processJourneyTimeEvents({
    dataAccessLayer: processJourneyTimeEventsDataAccessLayer,
    gameId: "game-1",
    currentTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(processJourneyTimeEventsResult.processedJourneyEvents.length, 2);
  assert.equal(processJourneyTimeEventsResult.processedJourneyEvents[0].type, "journey_started");
  assert.equal(processJourneyTimeEventsResult.processedJourneyEvents[1].type, "journey_completed");

  const processGameTimeEventsDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "games" && recordId === "game-5") {
        return {
          id: "game-5",
          status: "started",
          goalLocationId: "location-goal",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-5") {
        return [
          {
            id: "game-player-5",
            gameId: "game-5",
            playerId: "player-5",
            currentLocationId: "location-goal",
            status: "active",
            money: 100,
          },
          {
            id: "game-player-6",
            gameId: "game-5",
            playerId: "player-6",
            currentLocationId: "location-mid",
            status: "active",
            money: 80,
          },
        ];
      }
      return [];
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-5" && filterOptions.playerId === "player-5") {
        return {
          id: "game-player-5",
          gameId: "game-5",
          playerId: "player-5",
          currentLocationId: "location-goal",
          status: "active",
          money: 100,
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      if (collectionName === "games") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-game-event-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const processGameTimeEventsResult = await processGameTimeEvents({
    dataAccessLayer: processGameTimeEventsDataAccessLayer,
    gameId: "game-5",
    currentTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(processGameTimeEventsResult.arrivalUpdates.length, 1);
  assert.equal(processGameTimeEventsResult.endedGame, null);

  const recordPlayerArrivalDataAccessLayer = {
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-8" && filterOptions.playerId === "player-8") {
        return {
          id: "game-player-8",
          gameId: "game-8",
          playerId: "player-8",
          currentLocationId: "location-mid",
          status: "active",
          money: 150,
        };
      }
      return null;
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "game_players") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-arrival-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const recordPlayerArrivalResult = await recordPlayerArrival({
    dataAccessLayer: recordPlayerArrivalDataAccessLayer,
    gameId: "game-8",
    playerId: "player-8",
    arrivalTime: "2026-07-11T12:55:00.000Z",
    remainingMoney: 120,
  });
  assert.equal(recordPlayerArrivalResult.status, "arrived");
  assert.equal(recordPlayerArrivalResult.arrivedAt, "2026-07-11T12:55:00.000Z");
  assert.equal(recordPlayerArrivalResult.money, 120);

  const checkGameEndConditionDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-6") {
        return [
          { id: "game-player-6a", playerId: "player-6a", status: "arrived" },
          { id: "game-player-6b", playerId: "player-6b", status: "arrived" },
        ];
      }
      if (collectionName === "game_players" && filterOptions.gameId === "game-7") {
        return [
          { id: "game-player-7a", playerId: "player-7a", status: "arrived" },
          { id: "game-player-7b", playerId: "player-7b", status: "active" },
        ];
      }
      return [];
    },
  };
  const gameEndConditionMet = await checkGameEndCondition({
    dataAccessLayer: checkGameEndConditionDataAccessLayer,
    gameId: "game-6",
  });
  const gameEndConditionNotMet = await checkGameEndCondition({
    dataAccessLayer: checkGameEndConditionDataAccessLayer,
    gameId: "game-7",
  });
  assert.equal(gameEndConditionMet.shouldEndGame, true);
  assert.equal(gameEndConditionMet.arrivedPlayerCount, 2);
  assert.equal(gameEndConditionNotMet.shouldEndGame, false);
  assert.equal(gameEndConditionNotMet.arrivedPlayerCount, 1);

  const endGameDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "games" && recordId === "game-6") {
        return {
          id: "game-6",
          status: "started",
          gameSettings: { mode: "test" },
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-6a") {
        return {
          id: "game-player-6a",
          gameId: "game-6",
          playerId: "player-6a",
          status: "arrived",
          arrivedAt: "2026-07-11T12:30:00.000Z",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-6b") {
        return {
          id: "game-player-6b",
          gameId: "game-6",
          playerId: "player-6b",
          status: "arrived",
          arrivedAt: "2026-07-11T12:30:00.000Z",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-6") {
        return [
          { id: "game-player-6a", playerId: "player-6a", status: "arrived", arrivedAt: "2026-07-11T12:30:00.000Z" },
          { id: "game-player-6b", playerId: "player-6b", status: "arrived", arrivedAt: "2026-07-11T12:30:00.000Z" },
        ];
      }
      return [];
    },
    async updateRecordById({ collectionName, recordId, data }) {
      if (collectionName === "games") {
        return { id: recordId, ...data };
      }
      return { id: recordId, ...data };
    },
    async createRecordInCollection({ collectionName, data }) {
      if (collectionName === "records") {
        return { id: "record-end-1", ...data };
      }
      return { id: "created-1", ...data };
    },
  };
  const endGameResult = await endGame({
    dataAccessLayer: endGameDataAccessLayer,
    gameId: "game-6",
    endedAt: "2026-07-11T12:40:00.000Z",
  });
  assert.equal(endGameResult.status, "ended");
  assert.equal(endGameResult.gameSettings.finalResult.winnerPlayerId, null);

  const updateJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "journeys" && recordId === "journey-1") {
        return {
          id: "journey-1",
          gameId: "game-1",
          playerId: "player-1",
          status: "reserved",
          isLocked: false,
          fromLocationId: "location-1",
          toLocationId: "location-2",
          arrivalTime: "2026-07-11T12:30:00.000Z",
        };
      }
      if (collectionName === "games" && recordId === "game-1") {
        return {
          id: "game-1",
          startLocationId: "location-1",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-1" && filterOptions.playerId === "player-1") {
        return {
          id: "game-player-1",
          gameId: "game-1",
          playerId: "player-1",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-1") {
        return [
          {
            id: "journey-previous",
            gameId: "game-1",
            playerId: "player-1",
            status: "completed",
            toLocationId: "location-2",
            arrivalTime: "2026-07-11T11:30:00.000Z",
          },
        ];
      }
      return [];
    },
  };
  const updateJourneyValid = await validateUpdateJourney({
    dataAccessLayer: updateJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-1",
    fromLocationId: "location-2",
    toLocationId: "location-2",
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  const updateJourneyInvalid = await validateUpdateJourney({
    dataAccessLayer: updateJourneyDataAccessLayer,
    gameId: "game-1",
    playerId: "player-1",
    journeyId: "journey-1",
    fromLocationId: "location-3",
    toLocationId: "location-2",
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(updateJourneyValid.isValid, true);
  assert.equal(updateJourneyInvalid.isValid, false);
  assert.equal(updateJourneyInvalid.reason, "Next journey must start from previous destination");

  const ticketJourneyDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "games" && recordId === "game-2") {
        return {
          id: "game-2",
          startLocationId: "location-1",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-2") {
        return {
          id: "game-player-2",
          gameId: "game-2",
          playerId: "player-2",
          currentLocationId: "location-1",
        };
      }
      if (collectionName === "tickets" && recordId === "ticket-1") {
        return {
          id: "ticket-1",
          transportType: "taxi",
          usableMinutes: 30,
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-2" && filterOptions.playerId === "player-2") {
        return {
          id: "game-player-2",
          gameId: "game-2",
          playerId: "player-2",
          currentLocationId: "location-1",
        };
      }
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-2" && filterOptions.playerId === "player-2" && filterOptions.ticketId === "ticket-1") {
        return {
          id: "player-ticket-1",
          gameId: "game-2",
          playerId: "player-2",
          ticketId: "ticket-1",
        };
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-2") {
        return [];
      }
      return [];
    },
  };
  const ticketJourneyValid = await validateCreateJourney({
    dataAccessLayer: ticketJourneyDataAccessLayer,
    gameId: "game-2",
    playerId: "player-2",
    fromLocationId: "location-1",
    toLocationId: "location-2",
    transportType: "taxi",
    ticketIdList: ["ticket-1"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:20:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  const ticketJourneyInvalid = await validateCreateJourney({
    dataAccessLayer: ticketJourneyDataAccessLayer,
    gameId: "game-2",
    playerId: "player-2",
    fromLocationId: "location-1",
    toLocationId: "location-2",
    transportType: "taxi",
    ticketIdList: ["ticket-2"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:20:00.000Z",
    currentTime: "2026-07-11T11:00:00.000Z",
  });
  assert.equal(ticketJourneyValid.isValid, true);
  assert.equal(ticketJourneyInvalid.isValid, false);
  assert.equal(ticketJourneyInvalid.reason, "Player does not own all selected tickets");

  const walkingJourneyValid = await validateWalkingJourney({
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
  });
  const walkingJourneyInvalid = await validateWalkingJourney({
    transportType: "walking",
    ticketIdList: ["ticket-1"],
    departureTime: "2026-07-11T12:00:00.000Z",
    arrivalTime: "2026-07-11T12:30:00.000Z",
  });
  const walkingJourneyMissingTime = await validateWalkingJourney({
    transportType: "walking",
    ticketIdList: [],
  });
  const taxiJourneyValid = await validateTaxiJourney({
    transportType: "taxi",
    toLocationId: "location-2",
    ticketIdList: ["ticket-1"],
  });
  const taxiJourneyNoDestination = await validateTaxiJourney({
    transportType: "taxi",
    toLocationId: null,
    ticketIdList: ["ticket-1"],
  });
  const taxiJourneyNoTicket = await validateTaxiJourney({
    transportType: "taxi",
    toLocationId: "location-2",
    ticketIdList: [],
  });
  assert.equal(walkingJourneyValid.isValid, true);
  assert.equal(walkingJourneyInvalid.isValid, false);
  assert.equal(walkingJourneyInvalid.reason, "Walking journey cannot include tickets");
  assert.equal(walkingJourneyMissingTime.isValid, false);
  assert.equal(walkingJourneyMissingTime.reason, "Walking journey requires departure and arrival time");
  assert.equal(taxiJourneyValid.isValid, true);
  assert.equal(taxiJourneyNoDestination.isValid, false);
  assert.equal(taxiJourneyNoDestination.reason, "Taxi journey requires a destination");
  assert.equal(taxiJourneyNoTicket.isValid, false);
  assert.equal(taxiJourneyNoTicket.reason, "Taxi journey requires taxi ticket(s)");

  const journeyConnectionDataAccessLayer = {
    async getRecordById({ collectionName, recordId }) {
      if (collectionName === "games" && recordId === "game-3") {
        return {
          id: "game-3",
          startLocationId: "location-1",
        };
      }
      if (collectionName === "game_players" && recordId === "game-player-3") {
        return {
          id: "game-player-3",
          gameId: "game-3",
          playerId: "player-3",
          currentLocationId: "location-2",
        };
      }
      return null;
    },
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "game_players" && filterOptions.gameId === "game-3" && filterOptions.playerId === "player-3") {
        return {
          id: "game-player-3",
          gameId: "game-3",
          playerId: "player-3",
          currentLocationId: "location-2",
        };
      }
      if (collectionName === "journeys" && filterOptions.gameId === "game-3" && filterOptions.playerId === "player-3" && filterOptions.status === "reserved") {
        return null;
      }
      return null;
    },
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-3") {
        return [
          {
            id: "journey-previous-1",
            gameId: "game-3",
            playerId: "player-3",
            status: "completed",
            toLocationId: "location-2",
            arrivalTime: "2026-07-11T11:00:00.000Z",
          },
        ];
      }
      return [];
    },
  };
  const journeyConnectionValid = await validateJourneyConnection({
    dataAccessLayer: journeyConnectionDataAccessLayer,
    gameId: "game-3",
    playerId: "player-3",
    fromLocationId: "location-2",
    departureTime: "2026-07-11T11:05:00.000Z",
  });
  const journeyConnectionBadStart = await validateJourneyConnection({
    dataAccessLayer: journeyConnectionDataAccessLayer,
    gameId: "game-3",
    playerId: "player-3",
    fromLocationId: "location-3",
    departureTime: "2026-07-11T11:05:00.000Z",
  });
  const journeyConnectionReserved = await validateJourneyConnection({
    dataAccessLayer: {
      ...journeyConnectionDataAccessLayer,
      async findOneRecord({ collectionName, filterOptions }) {
        if (collectionName === "journeys" && filterOptions.gameId === "game-3" && filterOptions.playerId === "player-3" && filterOptions.status === "reserved") {
          return { id: "journey-reserved-1" };
        }
        return journeyConnectionDataAccessLayer.findOneRecord({ collectionName, filterOptions });
      },
    },
    gameId: "game-3",
    playerId: "player-3",
    fromLocationId: "location-2",
    departureTime: "2026-07-11T11:05:00.000Z",
  });
  assert.equal(journeyConnectionValid.isValid, true);
  assert.equal(journeyConnectionBadStart.isValid, false);
  assert.equal(journeyConnectionBadStart.reason, "Next journey must start from previous destination");
  assert.equal(journeyConnectionReserved.isValid, false);
  assert.equal(journeyConnectionReserved.reason, "Player already has a reserved journey");

  const ticketOwnershipDataAccessLayer = {
    async findOneRecord({ collectionName, filterOptions }) {
      if (collectionName === "player_tickets" && filterOptions.gameId === "game-4" && filterOptions.playerId === "player-4" && filterOptions.ticketId === "ticket-1") {
        return { id: "player-ticket-1" };
      }
      return null;
    },
  };
  const ticketOwnershipValid = await validateTicketOwnership({
    dataAccessLayer: ticketOwnershipDataAccessLayer,
    gameId: "game-4",
    playerId: "player-4",
    ticketIdList: ["ticket-1"],
  });
  const ticketOwnershipInvalid = await validateTicketOwnership({
    dataAccessLayer: ticketOwnershipDataAccessLayer,
    gameId: "game-4",
    playerId: "player-4",
    ticketIdList: ["ticket-1", "ticket-2"],
  });
  assert.equal(ticketOwnershipValid.isValid, true);
  assert.equal(ticketOwnershipInvalid.isValid, false);
  assert.deepEqual(ticketOwnershipInvalid.invalidTicketList, ["ticket-2"]);

  const ticketReservationDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      if (collectionName === "journeys" && filterOptions.gameId === "game-4") {
        return [
          {
            id: "journey-reserved-1",
            status: "reserved",
            ticketIdList: ["ticket-2"],
          },
        ];
      }
      return [];
    },
  };
  const ticketReservationValid = await validateTicketNotReserved({
    dataAccessLayer: ticketReservationDataAccessLayer,
    gameId: "game-4",
    ticketIdList: ["ticket-1"],
  });
  const ticketReservationInvalid = await validateTicketNotReserved({
    dataAccessLayer: ticketReservationDataAccessLayer,
    gameId: "game-4",
    ticketIdList: ["ticket-2"],
  });
  const ticketReservationExcluded = await validateTicketNotReserved({
    dataAccessLayer: ticketReservationDataAccessLayer,
    gameId: "game-4",
    ticketIdList: ["ticket-2"],
    excludedJourneyId: "journey-reserved-1",
  });
  assert.equal(ticketReservationValid.isValid, true);
  assert.equal(ticketReservationInvalid.isValid, false);
  assert.deepEqual(ticketReservationInvalid.reservedTicketList, ["ticket-2"]);
  assert.equal(ticketReservationExcluded.isValid, true);

  const winnerDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      assert.equal(collectionName, "game_players");
      assert.deepEqual(filterOptions, { gameId: "game-1" });
      return [
        { playerId: "p1", status: "arrived", arrivedAt: "2026-07-11T12:00:00.000Z", money: 90 },
        { playerId: "p2", status: "arrived", arrivedAt: "2026-07-11T12:05:00.000Z", money: 120 },
        { playerId: "p3", status: "playing", arrivedAt: null, money: 150 },
      ];
    },
  };
  const winnerResult = await determineWinner({
    dataAccessLayer: winnerDataAccessLayer,
    gameId: "game-1",
  });
  assert.equal(winnerResult.winnerPlayerId, "p1");
  assert.deepEqual(winnerResult.tiedPlayerIds, ["p1"]);
  assert.equal(winnerResult.ranking.length, 2);
  assert.equal(winnerResult.ranking[0].playerId, "p1");
  assert.equal(winnerResult.ranking[1].playerId, "p2");

  const tieWinnerDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      assert.equal(collectionName, "game_players");
      assert.deepEqual(filterOptions, { gameId: "game-2" });
      return [
        { playerId: "p4", status: "arrived", arrivedAt: "2026-07-11T12:00:00.000Z", money: 100 },
        { playerId: "p5", status: "arrived", arrivedAt: "2026-07-11T12:00:00.000Z", money: 100 },
      ];
    },
  };
  const tieWinnerResult = await determineWinner({
    dataAccessLayer: tieWinnerDataAccessLayer,
    gameId: "game-2",
  });
  assert.equal(tieWinnerResult.winnerPlayerId, null);
  assert.deepEqual(tieWinnerResult.tiedPlayerIds, ["p4", "p5"]);
  assert.equal(tieWinnerResult.ranking.length, 2);

  const noWinnerDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      assert.equal(collectionName, "game_players");
      assert.deepEqual(filterOptions, { gameId: "game-3" });
      return [
        { playerId: "p6", status: "active", arrivedAt: null, money: 50 },
        { playerId: "p7", status: "waiting", arrivedAt: null, money: 70 },
      ];
    },
  };
  const noWinnerResult = await determineWinner({
    dataAccessLayer: noWinnerDataAccessLayer,
    gameId: "game-3",
  });
  assert.equal(noWinnerResult.winnerPlayerId, null);
  assert.deepEqual(noWinnerResult.tiedPlayerIds, []);
  assert.equal(noWinnerResult.ranking.length, 0);

  const rankingDataAccessLayer = {
    async listRecords({ collectionName, filterOptions }) {
      assert.equal(collectionName, "game_players");
      assert.deepEqual(filterOptions, { gameId: "game-4" });
      return [
        {
          playerId: "p8",
          status: "arrived",
          arrivedAt: "2026-07-11T12:00:00.000Z",
          money: 80,
          currentLocationId: "location-goal",
        },
        {
          playerId: "p9",
          status: "active",
          arrivedAt: null,
          money: 120,
          currentLocationId: "location-mid",
        },
      ];
    },
  };
  const rankingResult = await getRanking({
    dataAccessLayer: rankingDataAccessLayer,
    gameId: "game-4",
  });
  assert.equal(rankingResult.ranking.length, 2);
  assert.equal(rankingResult.ranking[0].playerId, "p8");
  assert.equal(rankingResult.ranking[0].status, "arrived");
  assert.equal(rankingResult.ranking[1].playerId, "p9");
  assert.equal(rankingResult.ranking[1].status, "active");
}

run();
