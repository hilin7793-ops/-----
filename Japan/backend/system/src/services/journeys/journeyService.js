import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { normalizeTransportType, TransportType } from "../../constants/transportTypes.js";
import { JourneyStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import {
  consumeTickets,
  releaseReservedTickets,
  reserveTickets,
  validateTicketCombination,
  validateTicketNotReserved,
  validateTicketOwnership,
  validateTicketTimeEnoughForJourney,
} from "../tickets/ticketGenerationService.js";
import { getGame } from "../games/gameService.js";
import {
  getPlayerLocation,
  setPlayerJourneyState,
  setPlayerLocation,
} from "../players/playerService.js";
import { recordJourney, recordTicketUsage } from "../records/recordService.js";

function toDate(input) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getJourney({ dataAccessLayer, journeyId }) {
  const journey = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
  });

  assert(journey, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Journey not found",
    detail: { journeyId },
  }));

  return journey;
}

export async function listPlayerJourneys({
  dataAccessLayer,
  gameId,
  playerId,
  filterOptions = {},
  queryOptions = {},
}) {
  const {
    departureAfter,
    departureBefore,
    arrivalAfter,
    arrivalBefore,
    ...journeyFilterOptions
  } = filterOptions;

  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId, playerId, ...journeyFilterOptions },
    queryOptions,
  });

  return {
    journeyList: journeyList.filter((journey) => {
      const departureTime = journey.departureTime ? new Date(journey.departureTime).getTime() : null;
      const arrivalTime = journey.arrivalTime ? new Date(journey.arrivalTime).getTime() : null;
      const departureAfterTime = departureAfter ? new Date(departureAfter).getTime() : null;
      const departureBeforeTime = departureBefore ? new Date(departureBefore).getTime() : null;
      const arrivalAfterTime = arrivalAfter ? new Date(arrivalAfter).getTime() : null;
      const arrivalBeforeTime = arrivalBefore ? new Date(arrivalBefore).getTime() : null;

      if (departureAfterTime !== null && (departureTime === null || departureTime < departureAfterTime)) {
        return false;
      }

      if (departureBeforeTime !== null && (departureTime === null || departureTime > departureBeforeTime)) {
        return false;
      }

      if (arrivalAfterTime !== null && (arrivalTime === null || arrivalTime < arrivalAfterTime)) {
        return false;
      }

      if (arrivalBeforeTime !== null && (arrivalTime === null || arrivalTime > arrivalBeforeTime)) {
        return false;
      }

      return true;
    }),
  };
}

export async function listGameJourneys({
  dataAccessLayer,
  gameId,
  filterOptions = {},
  queryOptions = {},
}) {
  const {
    departureAfter,
    departureBefore,
    arrivalAfter,
    arrivalBefore,
    ...journeyFilterOptions
  } = filterOptions;

  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId, ...journeyFilterOptions },
    queryOptions,
  });

  return {
    journeyList: journeyList.filter((journey) => {
      const departureTime = journey.departureTime ? new Date(journey.departureTime).getTime() : null;
      const arrivalTime = journey.arrivalTime ? new Date(journey.arrivalTime).getTime() : null;
      const departureAfterTime = departureAfter ? new Date(departureAfter).getTime() : null;
      const departureBeforeTime = departureBefore ? new Date(departureBefore).getTime() : null;
      const arrivalAfterTime = arrivalAfter ? new Date(arrivalAfter).getTime() : null;
      const arrivalBeforeTime = arrivalBefore ? new Date(arrivalBefore).getTime() : null;

      if (departureAfterTime !== null && (departureTime === null || departureTime < departureAfterTime)) {
        return false;
      }

      if (departureBeforeTime !== null && (departureTime === null || departureTime > departureBeforeTime)) {
        return false;
      }

      if (arrivalAfterTime !== null && (arrivalTime === null || arrivalTime < arrivalAfterTime)) {
        return false;
      }

      if (arrivalBeforeTime !== null && (arrivalTime === null || arrivalTime > arrivalBeforeTime)) {
        return false;
      }

      return true;
    }),
  };
}

function hasReached(currentTime, targetTime) {
  if (!currentTime || !targetTime) {
    return false;
  }

  return new Date(currentTime).getTime() >= new Date(targetTime).getTime();
}

export async function getGameJourneySummary({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId },
  });

  const statusCounts = {
    reserved: 0,
    started: 0,
    completed: 0,
    cancelled: 0,
    incident_pending: 0,
    incident_resolved: 0,
  };

  const transportTypeCounts = {};
  let lockedCount = 0;
  let unlockedCount = 0;
  let dueToStartCount = 0;
  let dueToCompleteCount = 0;

  for (const journey of journeyList) {
    if (statusCounts[journey.status] !== undefined) {
      statusCounts[journey.status] += 1;
    }

    if (journey.transportType) {
      transportTypeCounts[journey.transportType] = (transportTypeCounts[journey.transportType] ?? 0) + 1;
    }

    if (journey.isLocked) {
      lockedCount += 1;
    } else {
      unlockedCount += 1;
    }

    if (journey.status === JourneyStatus[0] && hasReached(currentTime, journey.departureTime)) {
      dueToStartCount += 1;
    }

    if (journey.status === JourneyStatus[1] && hasReached(currentTime, journey.arrivalTime)) {
      dueToCompleteCount += 1;
    }
  }

  return {
    gameId,
    currentTime,
    totalJourneyCount: journeyList.length,
    statusCounts,
    transportTypeCounts,
    lockedCount,
    unlockedCount,
    dueToStartCount,
    dueToCompleteCount,
  };
}

export async function getGameJourneyExceptionList({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
  queryOptions = {},
}) {
  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId },
    queryOptions,
  });

  const exceptionJourneyList = journeyList
    .filter((journey) => {
      const isDueReserved = journey.status === JourneyStatus[0] && hasReached(currentTime, journey.departureTime);
      const isDueStarted = journey.status === JourneyStatus[1] && hasReached(currentTime, journey.arrivalTime);
      const isIncidentPending = journey.status === JourneyStatus[4];
      const isLockedReserved = journey.status === JourneyStatus[0] && journey.isLocked === true;

      return isDueReserved || isDueStarted || isIncidentPending || isLockedReserved;
    })
    .map((journey) => {
      const exceptionReasonList = [];

      if (journey.status === JourneyStatus[0] && hasReached(currentTime, journey.departureTime)) {
        exceptionReasonList.push("due_to_start");
      }

      if (journey.status === JourneyStatus[1] && hasReached(currentTime, journey.arrivalTime)) {
        exceptionReasonList.push("due_to_complete");
      }

      if (journey.status === JourneyStatus[4]) {
        exceptionReasonList.push("incident_pending");
      }

      if (journey.status === JourneyStatus[0] && journey.isLocked === true) {
        exceptionReasonList.push("locked_reserved");
      }

      return {
        ...journey,
        exceptionReasonList,
      };
    });

  return {
    gameId,
    currentTime,
    exceptionJourneyList,
  };
}

export async function getGameJourneyActionQueue({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
  queryOptions = {},
}) {
  const { exceptionJourneyList } = await getGameJourneyExceptionList({
    dataAccessLayer,
    gameId,
    currentTime,
    queryOptions,
  });

  const actionQueue = exceptionJourneyList.map((journey) => {
    const suggestedActionList = [];

    if (journey.exceptionReasonList.includes("due_to_start")) {
      suggestedActionList.push("start_journey");
    }

    if (journey.exceptionReasonList.includes("due_to_complete")) {
      suggestedActionList.push("complete_journey");
    }

    if (journey.exceptionReasonList.includes("incident_pending")) {
      suggestedActionList.push("review_incident");
    }

    if (journey.exceptionReasonList.includes("locked_reserved")) {
      suggestedActionList.push("unlock_journey");
      suggestedActionList.push("cancel_journey");
    }

    return {
      journeyId: journey.id,
      playerId: journey.playerId,
      status: journey.status,
      isLocked: journey.isLocked === true,
      exceptionReasonList: journey.exceptionReasonList,
      suggestedActionList,
      departureTime: journey.departureTime,
      arrivalTime: journey.arrivalTime,
      transportType: journey.transportType,
    };
  });

  return {
    gameId,
    currentTime,
    actionQueue,
  };
}

export async function getGameJourneyDashboard({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const [summaryData, exceptionData, actionQueueData] = await Promise.all([
    getGameJourneySummary({
      dataAccessLayer,
      gameId,
      currentTime,
    }),
    getGameJourneyExceptionList({
      dataAccessLayer,
      gameId,
      currentTime,
      queryOptions: {
        sortBy: "departureTime",
        sortDirection: "asc",
      },
    }),
    getGameJourneyActionQueue({
      dataAccessLayer,
      gameId,
      currentTime,
      queryOptions: {
        sortBy: "departureTime",
        sortDirection: "asc",
      },
    }),
  ]);

  return {
    dashboard: {
      gameId,
      currentTime,
      summary: summaryData,
      exceptionJourneyList: exceptionData.exceptionJourneyList,
      actionQueue: actionQueueData.actionQueue,
      checklistSummary: {
        dueJourneyStartCount: summaryData.dueToStartCount,
        dueJourneyCompleteCount: summaryData.dueToCompleteCount,
        lockedReservedJourneyCount: exceptionData.exceptionJourneyList.filter(
          (journey) => journey.exceptionReasonList.includes("locked_reserved"),
        ).length,
        incidentPendingJourneyCount: exceptionData.exceptionJourneyList.filter(
          (journey) => journey.exceptionReasonList.includes("incident_pending"),
        ).length,
      },
    },
  };
}

export async function getGameJourneyManagementSummary({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const dashboardData = await getGameJourneyDashboard({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  const { summary, checklistSummary, exceptionJourneyList, actionQueue } = dashboardData.dashboard;

  return {
    managementSummary: {
      gameId,
      currentTime,
      summary,
      checklistSummary,
      exceptionJourneyCount: exceptionJourneyList.length,
      actionQueueCount: actionQueue.length,
      lockedReservedJourneyCount: checklistSummary.lockedReservedJourneyCount,
      incidentPendingJourneyCount: checklistSummary.incidentPendingJourneyCount,
      dueJourneyStartCount: summary.dueToStartCount,
      dueJourneyCompleteCount: summary.dueToCompleteCount,
    },
  };
}

export async function getGameJourneyActionQueueSummary({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const dashboardData = await getGameJourneyDashboard({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  const actionQueue = dashboardData.dashboard.actionQueue;
  const suggestedActionCounts = actionQueue.reduce((accumulator, queueItem) => {
    for (const actionType of queueItem.suggestedActionList) {
      accumulator[actionType] = (accumulator[actionType] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  return {
    actionQueueSummary: {
      gameId,
      currentTime,
      actionQueueCount: actionQueue.length,
      suggestedActionCounts,
      journeyIdList: actionQueue.map((item) => item.journeyId),
    },
  };
}

export async function validateJourneyTime({ departureTime, arrivalTime, currentTime }) {
  const departureDate = toDate(departureTime);
  const arrivalDate = toDate(arrivalTime);
  const currentDate = toDate(currentTime);

  assert(departureDate && arrivalDate && currentDate, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid journey time input",
    detail: { departureTime, arrivalTime, currentTime },
  }));

  if (departureDate < currentDate) {
    return { isValid: false, reason: "Departure time cannot be earlier than current time" };
  }

  if (arrivalDate <= departureDate) {
    return { isValid: false, reason: "Arrival time must be later than departure time" };
  }

  return { isValid: true, reason: null };
}

export async function validateWalkingJourney({ transportType, ticketIdList, departureTime, arrivalTime }) {
  const normalizedTransportType = normalizeTransportType(transportType);
  if (normalizedTransportType !== TransportType.WALKING) {
    return { isValid: true, reason: null };
  }

  if ((ticketIdList?.length ?? 0) > 0) {
    return { isValid: false, reason: "Walking journey cannot include tickets" };
  }

  if (!departureTime || !arrivalTime) {
    return { isValid: false, reason: "Walking journey requires departure and arrival time" };
  }

  return { isValid: true, reason: null };
}

export async function validateTaxiJourney({ transportType, toLocationId, ticketIdList }) {
  const normalizedTransportType = normalizeTransportType(transportType);
  if (normalizedTransportType !== TransportType.TAXI) {
    return { isValid: true, reason: null };
  }

  if (!toLocationId) {
    return { isValid: false, reason: "Taxi journey requires a destination" };
  }

  if ((ticketIdList?.length ?? 0) === 0) {
    return { isValid: false, reason: "Taxi journey requires taxi ticket(s)" };
  }

  return { isValid: true, reason: null };
}

export async function validateJourneyConnection({
  dataAccessLayer,
  gameId,
  playerId,
  fromLocationId,
  departureTime,
  excludedJourneyId = null,
}) {
  const game = await getGame({ dataAccessLayer, gameId });
  const currentLocationId = await getPlayerLocation({ dataAccessLayer, gameId, playerId });
  const reservedJourney = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId, playerId, status: JourneyStatus[0] },
  });

  if (reservedJourney && reservedJourney.id !== excludedJourneyId) {
    return { isValid: false, reason: "Player already has a reserved journey" };
  }

  const playerJourneys = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId, playerId },
  });

  const activeOrResolvedJourneyList = playerJourneys
    .filter((journey) => journey.id !== excludedJourneyId)
    .filter((journey) => [
      JourneyStatus[1],
      JourneyStatus[2],
      JourneyStatus[4],
      JourneyStatus[5],
    ].includes(journey.status));

  if (activeOrResolvedJourneyList.length === 0) {
    if (fromLocationId !== game.startLocationId) {
      return { isValid: false, reason: "First journey must start from the game start location" };
    }
    return { isValid: true, reason: null };
  }

  const latestJourney = activeOrResolvedJourneyList
    .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime())[0];

  if (fromLocationId !== latestJourney.toLocationId) {
    return { isValid: false, reason: "Next journey must start from previous destination" };
  }

  const diffMinutes = Math.round((new Date(departureTime).getTime() - new Date(latestJourney.arrivalTime).getTime()) / 60000);
  if (diffMinutes < 1) {
    return { isValid: false, reason: "Next journey must start at least 1 minute after previous arrival" };
  }

  const hasActiveJourney = activeOrResolvedJourneyList.some((journey) => journey.status === JourneyStatus[1]);
  if (!hasActiveJourney && currentLocationId && currentLocationId !== fromLocationId) {
    return { isValid: false, reason: "Player current location does not match journey departure" };
  }

  return { isValid: true, reason: null };
}

async function validateJourneyTicketRules({
  dataAccessLayer,
  gameId,
  playerId,
  ticketIdList,
  transportType,
  departureTime,
  arrivalTime,
  excludedJourneyId = null,
}) {
  const normalizedTransportType = normalizeTransportType(transportType);
  if (normalizedTransportType === TransportType.WALKING) {
    return { isValid: true, reason: null };
  }

  const ownershipCheck = await validateTicketOwnership({
    dataAccessLayer,
    gameId,
    playerId,
    ticketIdList,
  });
  if (!ownershipCheck.isValid) {
    return { isValid: false, reason: "Player does not own all selected tickets" };
  }

  const reservedCheck = await validateTicketNotReserved({
    dataAccessLayer,
    gameId,
    ticketIdList,
    excludedJourneyId,
  });
  if (!reservedCheck.isValid) {
    return { isValid: false, reason: "Some tickets are already reserved" };
  }

  const combinationCheck = await validateTicketCombination({
    dataAccessLayer,
    ticketIdList,
    selectedTransportType: transportType,
  });
  if (!combinationCheck.isValid) {
    return { isValid: false, reason: combinationCheck.reason };
  }

  const timeEnoughCheck = await validateTicketTimeEnoughForJourney({
    dataAccessLayer,
    ticketIdList,
    departureTime,
    arrivalTime,
  });
  if (!timeEnoughCheck.isEnough) {
    return { isValid: false, reason: "Ticket usable time is not enough for journey" };
  }

  return { isValid: true, reason: null };
}

export async function validateCreateJourney({
  dataAccessLayer,
  gameId,
  playerId,
  fromLocationId,
  toLocationId,
  transportType,
  ticketIdList,
  departureTime,
  arrivalTime,
  currentTime,
}) {
  const timeCheck = await validateJourneyTime({ departureTime, arrivalTime, currentTime });
  if (!timeCheck.isValid) {
    return timeCheck;
  }

  const connectionCheck = await validateJourneyConnection({
    dataAccessLayer,
    gameId,
    playerId,
    fromLocationId,
    departureTime,
  });
  if (!connectionCheck.isValid) {
    return connectionCheck;
  }

  const walkingCheck = await validateWalkingJourney({
    transportType,
    ticketIdList,
    departureTime,
    arrivalTime,
  });
  if (!walkingCheck.isValid) {
    return walkingCheck;
  }

  const taxiCheck = await validateTaxiJourney({
    transportType,
    toLocationId,
    ticketIdList,
  });
  if (!taxiCheck.isValid) {
    return taxiCheck;
  }

  return validateJourneyTicketRules({
    dataAccessLayer,
    gameId,
    playerId,
    ticketIdList,
    transportType,
    departureTime,
    arrivalTime,
  });
}

export async function validateUpdateJourney({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  fromLocationId,
  toLocationId,
  transportType,
  ticketIdList,
  departureTime,
  arrivalTime,
  currentTime,
}) {
  const journey = await getJourney({ dataAccessLayer, journeyId });

  if (journey.gameId !== gameId || journey.playerId !== playerId) {
    return { isValid: false, reason: "Journey not found for player" };
  }

  if (journey.status !== JourneyStatus[0] || journey.isLocked) {
    return { isValid: false, reason: "Journey is not editable" };
  }

  const timeCheck = await validateJourneyTime({ departureTime, arrivalTime, currentTime });
  if (!timeCheck.isValid) {
    return timeCheck;
  }

  const connectionCheck = await validateJourneyConnection({
    dataAccessLayer,
    gameId,
    playerId,
    fromLocationId,
    departureTime,
    excludedJourneyId: journeyId,
  });
  if (!connectionCheck.isValid) {
    return connectionCheck;
  }

  const walkingCheck = await validateWalkingJourney({
    transportType,
    ticketIdList,
    departureTime,
    arrivalTime,
  });
  if (!walkingCheck.isValid) {
    return walkingCheck;
  }

  const taxiCheck = await validateTaxiJourney({
    transportType,
    toLocationId,
    ticketIdList,
  });
  if (!taxiCheck.isValid) {
    return taxiCheck;
  }

  return validateJourneyTicketRules({
    dataAccessLayer,
    gameId,
    playerId,
    ticketIdList,
    transportType,
    departureTime,
    arrivalTime,
    excludedJourneyId: journeyId,
  });
}

export async function createJourney({
  dataAccessLayer,
  gameId,
  playerId,
  fromLocationId,
  toLocationId,
  transportType,
  ticketIdList = [],
  departureTime,
  arrivalTime,
  metadata = {},
  currentTime = new Date().toISOString(),
}) {
  const validation = await validateCreateJourney({
    dataAccessLayer,
    gameId,
    playerId,
    fromLocationId,
    toLocationId,
    transportType,
    ticketIdList,
    departureTime,
    arrivalTime,
    currentTime,
  });

  assert(validation.isValid, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: validation.reason,
    detail: { gameId, playerId },
  }));

  const createdJourney = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId,
      playerId,
      fromLocationId,
      toLocationId,
      transportType,
      ticketIdList,
      departureTime,
      arrivalTime,
      status: JourneyStatus[0],
      isLocked: false,
      metadata,
    },
  });

  if ((ticketIdList?.length ?? 0) > 0) {
    await reserveTickets({
      dataAccessLayer,
      gameId,
      playerId,
      journeyId: createdJourney.id,
      ticketIdList,
    });
  }

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId: createdJourney.id,
    journeyState: "reserved",
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId: createdJourney.id,
    journeyAction: "create",
    journeyData: {
      fromLocationId,
      toLocationId,
      transportType,
      ticketIdList,
      departureTime,
      arrivalTime,
      metadata,
      status: createdJourney.status,
    },
  });

  return createdJourney;
}

export async function updateJourney({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  fromLocationId,
  toLocationId,
  transportType,
  ticketIdList = [],
  departureTime,
  arrivalTime,
  metadata = {},
  currentTime = new Date().toISOString(),
}) {
  const journey = await getJourney({ dataAccessLayer, journeyId });
  const validation = await validateUpdateJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    fromLocationId,
    toLocationId,
    transportType,
    ticketIdList,
    departureTime,
    arrivalTime,
    currentTime,
  });

  assert(validation.isValid, () => new AppError({
    code: ErrorCode.JOURNEY_NOT_EDITABLE,
    message: validation.reason,
    detail: { gameId, playerId, journeyId },
  }));

  await releaseReservedTickets({
    dataAccessLayer,
    gameId,
    journeyId,
    ticketIdList: journey.ticketIdList ?? [],
  });

  if ((ticketIdList?.length ?? 0) > 0) {
    await reserveTickets({
      dataAccessLayer,
      gameId,
      playerId,
      journeyId,
      ticketIdList,
    });
  }

  const updatedJourney = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      fromLocationId,
      toLocationId,
      transportType,
      ticketIdList,
      departureTime,
      arrivalTime,
      metadata: {
        ...(journey.metadata ?? {}),
        ...metadata,
      },
    },
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "reserved",
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "update",
    journeyData: {
      fromLocationId,
      toLocationId,
      transportType,
      ticketIdList,
      departureTime,
      arrivalTime,
      metadata: updatedJourney.metadata,
      status: updatedJourney.status,
    },
  });

  return updatedJourney;
}

export async function cancelJourney({ dataAccessLayer, gameId, playerId, journeyId, reason = "" }) {
  const journey = await getJourney({ dataAccessLayer, journeyId });
  assert(journey.gameId === gameId && journey.playerId === playerId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Journey not found for player",
    detail: { gameId, playerId, journeyId },
  }));

  assert(journey.status === JourneyStatus[0], () => new AppError({
    code: ErrorCode.JOURNEY_ALREADY_STARTED,
    message: "Only reserved journey can be cancelled",
    detail: { journeyId },
  }));

  await releaseReservedTickets({
    dataAccessLayer,
    gameId,
    journeyId,
    ticketIdList: journey.ticketIdList ?? [],
  });

  const updatedJourney = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      status: JourneyStatus[3],
      cancelReason: reason,
    },
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "cancelled",
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "cancel",
    journeyData: {
      cancelReason: reason,
      status: updatedJourney.status,
      ticketIdList: journey.ticketIdList ?? [],
    },
  });

  return updatedJourney;
}

export async function cancelJourneyBatch({
  dataAccessLayer,
  gameId,
  journeyIdList = [],
  reason = "",
  cancelledBy = null,
}) {
  assert(Array.isArray(journeyIdList) && journeyIdList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "journeyIdList is required",
    detail: { gameId },
  }));

  const resultList = [];
  for (const journeyId of journeyIdList) {
    const journey = await getJourney({ dataAccessLayer, journeyId });
    const updatedJourney = await cancelJourney({
      dataAccessLayer,
      gameId,
      playerId: journey.playerId,
      journeyId,
      reason,
    });

    resultList.push({
      journeyId,
      playerId: journey.playerId,
      status: updatedJourney.status,
      cancelledBy,
    });
  }

  return {
    success: true,
    cancelledCount: resultList.length,
    resultList,
  };
}

export async function lockJourney({ dataAccessLayer, journeyId, reason = "" }) {
  const journey = await getJourney({ dataAccessLayer, journeyId });

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      isLocked: true,
      metadata: {
        ...(journey.metadata ?? {}),
        lockReason: reason,
      },
    },
  });
}

export async function unlockJourney({ dataAccessLayer, journeyId, reason = "" }) {
  const journey = await getJourney({ dataAccessLayer, journeyId });

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      isLocked: false,
      metadata: {
        ...(journey.metadata ?? {}),
        unlockReason: reason,
      },
    },
  });
}

export async function lockJourneyBatch({
  dataAccessLayer,
  gameId,
  journeyIdList = [],
  reason = "",
  lockedBy = null,
}) {
  assert(Array.isArray(journeyIdList) && journeyIdList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "journeyIdList is required",
    detail: { gameId },
  }));

  const resultList = [];
  for (const journeyId of journeyIdList) {
    const journey = await getJourney({ dataAccessLayer, journeyId });
    assert(journey.gameId === gameId, () => new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Journey not found for game",
      detail: { gameId, journeyId },
    }));

    const lockedJourney = await lockJourney({
      dataAccessLayer,
      journeyId,
      reason,
    });

    resultList.push({
      journeyId,
      playerId: journey.playerId,
      isLocked: lockedJourney.isLocked === true,
      lockedBy,
    });
  }

  return {
    success: true,
    lockedCount: resultList.length,
    resultList,
  };
}

export async function unlockJourneyBatch({
  dataAccessLayer,
  gameId,
  journeyIdList = [],
  reason = "",
  unlockedBy = null,
}) {
  assert(Array.isArray(journeyIdList) && journeyIdList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "journeyIdList is required",
    detail: { gameId },
  }));

  const resultList = [];
  for (const journeyId of journeyIdList) {
    const journey = await getJourney({ dataAccessLayer, journeyId });
    assert(journey.gameId === gameId, () => new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Journey not found for game",
      detail: { gameId, journeyId },
    }));

    const unlockedJourney = await unlockJourney({
      dataAccessLayer,
      journeyId,
      reason,
    });

    resultList.push({
      journeyId,
      playerId: journey.playerId,
      isLocked: unlockedJourney.isLocked === true,
      unlockedBy,
    });
  }

  return {
    success: true,
    unlockedCount: resultList.length,
    resultList,
  };
}

export async function startJourney({ dataAccessLayer, gameId, playerId, journeyId, startedAt }) {
  const journey = await getJourney({ dataAccessLayer, journeyId });
  assert(journey.gameId === gameId && journey.playerId === playerId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Journey not found for player",
    detail: { gameId, playerId, journeyId },
  }));

  assert(journey.status === JourneyStatus[0], () => new AppError({
    code: ErrorCode.JOURNEY_ALREADY_STARTED,
    message: "Journey is not in reserved state",
    detail: { journeyId },
  }));

  if ((journey.ticketIdList?.length ?? 0) > 0) {
    await consumeTickets({
      dataAccessLayer,
      gameId,
      playerId,
      journeyId,
      ticketIdList: journey.ticketIdList,
    });
  }

  const updatedJourney = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      status: JourneyStatus[1],
      startedAt,
      isLocked: true,
    },
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "started",
  });

  if ((journey.ticketIdList?.length ?? 0) > 0) {
    await recordTicketUsage({
      dataAccessLayer,
      gameId,
      playerId,
      journeyId,
      ticketIdList: journey.ticketIdList,
      usedAt: startedAt,
    });
  }

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "start",
    journeyData: {
      startedAt,
      status: updatedJourney.status,
      ticketIdList: journey.ticketIdList ?? [],
      fromLocationId: journey.fromLocationId,
      toLocationId: journey.toLocationId,
      transportType: journey.transportType,
    },
  });

  return updatedJourney;
}

export async function completeJourney({ dataAccessLayer, gameId, playerId, journeyId, completedAt }) {
  const journey = await getJourney({ dataAccessLayer, journeyId });
  assert(journey.gameId === gameId && journey.playerId === playerId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Journey not found for player",
    detail: { gameId, playerId, journeyId },
  }));

  assert(journey.status === JourneyStatus[1], () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Journey must be started before completion",
    detail: { journeyId },
  }));

  const updatedJourney = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      status: JourneyStatus[2],
      completedAt,
    },
  });

  await setPlayerLocation({
    dataAccessLayer,
    gameId,
    playerId,
    locationId: journey.toLocationId,
    reason: "journey_completed",
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "completed",
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "complete",
    journeyData: {
      completedAt,
      status: updatedJourney.status,
      fromLocationId: journey.fromLocationId,
      toLocationId: journey.toLocationId,
      transportType: journey.transportType,
      ticketIdList: journey.ticketIdList ?? [],
    },
  });

  return updatedJourney;
}

export async function processJourneyTimeEvents({ dataAccessLayer, gameId, currentTime }) {
  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId },
  });

  const processedJourneyEvents = [];
  for (const journey of journeyList) {
    if (journey.status === JourneyStatus[0] && new Date(currentTime) >= new Date(journey.departureTime)) {
      const startedJourney = await startJourney({
        dataAccessLayer,
        gameId,
        playerId: journey.playerId,
        journeyId: journey.id,
        startedAt: currentTime,
      });
      processedJourneyEvents.push({ type: "journey_started", journey: startedJourney });
      continue;
    }

    if (journey.status === JourneyStatus[1] && new Date(currentTime) >= new Date(journey.arrivalTime)) {
      const completedJourney = await completeJourney({
        dataAccessLayer,
        gameId,
        playerId: journey.playerId,
        journeyId: journey.id,
        completedAt: currentTime,
      });
      processedJourneyEvents.push({ type: "journey_completed", journey: completedJourney });
    }
  }

  return { processedJourneyEvents };
}
