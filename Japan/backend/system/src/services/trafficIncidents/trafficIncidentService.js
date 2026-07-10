import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { JourneyStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import { getJourney } from "../journeys/journeyService.js";
import { addTicketToPlayer, setPlayerJourneyState, setPlayerLocation } from "../players/playerService.js";
import { recordJourney, recordTrafficIncidentRequest } from "../records/recordService.js";
import { createReturnedTicket } from "../tickets/ticketGenerationService.js";

function toDate(input) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getTrafficIncidentRequest({
  dataAccessLayer,
  requestId,
}) {
  const requestData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    recordId: requestId,
  });

  assert(requestData, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Traffic incident request not found",
    detail: { requestId },
  }));

  return requestData;
}

export async function listTrafficIncidentRequests({
  dataAccessLayer,
  gameId = null,
  playerId = null,
  journeyId = null,
  status = null,
  queryOptions = {},
}) {
  const filterOptions = {
    ...(gameId ? { gameId } : {}),
    ...(playerId ? { playerId } : {}),
    ...(journeyId ? { journeyId } : {}),
    ...(status ? { status } : {}),
  };

  const requestList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    filterOptions,
    queryOptions,
  });

  return { requestList };
}

export async function submitTrafficIncidentRequest({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  evidenceList = [],
  actualEndLocationId,
  actualEndedAt,
  description = "",
}) {
  const validation = await validateTrafficIncidentRequest({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    actualEndLocationId,
    actualEndedAt,
    evidenceList,
  });

  assert(validation.isValid, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: validation.reason,
    detail: { gameId, playerId, journeyId },
  }));

  const requestData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    data: {
      gameId,
      playerId,
      journeyId,
      status: "pending",
      actualEndLocationId,
      actualEndedAt,
      evidenceList,
      description,
      reviewData: {},
      createdAt: new Date().toISOString(),
    },
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      status: JourneyStatus[4],
      incidentRequestId: requestData.id,
    },
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "incident_pending",
  });

  await recordTrafficIncidentRequest({
    dataAccessLayer,
    gameId,
    playerId,
    requestId: requestData.id,
    requestAction: "submit",
    requestData: {
      journeyId,
      actualEndLocationId,
      actualEndedAt,
      evidenceList,
      description,
      status: "pending",
    },
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "incident_pending",
    journeyData: {
      actualEndLocationId,
      actualEndedAt,
      evidenceList,
      description,
      status: JourneyStatus[4],
    },
  });

  return requestData;
}

export async function validateTrafficIncidentRequest({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  actualEndLocationId,
  actualEndedAt,
  evidenceList = [],
}) {
  const journey = await getJourney({ dataAccessLayer, journeyId });

  if (journey.gameId !== gameId || journey.playerId !== playerId) {
    return { isValid: false, reason: "Journey does not belong to player in this game" };
  }

  if (journey.status !== JourneyStatus[1]) {
    return { isValid: false, reason: "Traffic incident request requires a started journey" };
  }

  if (!actualEndLocationId) {
    return { isValid: false, reason: "Actual end location is required" };
  }

  const actualEndedDate = toDate(actualEndedAt);
  const departureDate = toDate(journey.departureTime);
  const arrivalDate = toDate(journey.arrivalTime);
  if (!actualEndedDate || !departureDate || !arrivalDate) {
    return { isValid: false, reason: "Invalid traffic incident time data" };
  }

  if (actualEndedDate < departureDate) {
    return { isValid: false, reason: "Actual end time cannot be earlier than departure time" };
  }

  if (actualEndedDate >= arrivalDate) {
    return { isValid: false, reason: "Traffic incident request only applies to shortened journeys" };
  }

  if (journey.toLocationId === actualEndLocationId) {
    return { isValid: false, reason: "Actual end location must differ from original destination" };
  }

  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return { isValid: false, reason: "At least one evidence entry is required" };
  }

  const existingPendingRequest = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    filterOptions: {
      gameId,
      playerId,
      journeyId,
      status: "pending",
    },
  });

  if (existingPendingRequest) {
    return { isValid: false, reason: "There is already a pending traffic incident request for this journey" };
  }

  return { isValid: true, reason: null };
}

export async function approveTrafficIncidentRequest({
  dataAccessLayer,
  requestId,
  reviewerId,
  reviewNote = "",
}) {
  const requestData = await getTrafficIncidentRequest({
    dataAccessLayer,
    requestId,
  });

  assert(requestData.status === "pending", () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Traffic incident request is not pending",
    detail: { requestId, status: requestData.status },
  }));

  const journey = await getJourney({ dataAccessLayer, journeyId: requestData.journeyId });
  const returnedTicketData = await calculateReturnedTicketTime({
    journeyId: journey.id,
    originalJourneyData: journey,
    actualEndLocationId: requestData.actualEndLocationId,
    actualEndTime: requestData.actualEndedAt,
    transportType: journey.transportType,
  });

  const appliedResult = await applyTrafficIncidentResult({
    dataAccessLayer,
    gameId: requestData.gameId,
    playerId: requestData.playerId,
    journeyId: requestData.journeyId,
    requestId,
    returnedTicketData,
    actualEndLocationId: requestData.actualEndLocationId,
    actualEndedAt: requestData.actualEndedAt,
  });

  const resolvedRequest = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    recordId: requestId,
    data: {
      status: "approved",
      resolvedAt: new Date().toISOString(),
      reviewData: {
        reviewerId,
        reviewNote,
        decision: "approved",
        returnedTicketId: appliedResult.returnedTicket?.id ?? null,
      },
    },
  });

  await recordTrafficIncidentRequest({
    dataAccessLayer,
    gameId: requestData.gameId,
    playerId: requestData.playerId,
    requestId,
    requestAction: "approve",
    requestData: {
      journeyId: requestData.journeyId,
      reviewerId,
      reviewNote,
      returnedTicketId: appliedResult.returnedTicket?.id ?? null,
      returnedMinutes: returnedTicketData.returnedMinutes,
      actualEndLocationId: requestData.actualEndLocationId,
      actualEndedAt: requestData.actualEndedAt,
      status: "approved",
    },
  });

  return {
    request: resolvedRequest,
    returnedTicket: appliedResult.returnedTicket,
    updatedJourney: appliedResult.updatedJourney,
  };
}

export async function rejectTrafficIncidentRequest({
  dataAccessLayer,
  requestId,
  reviewerId,
  rejectReason,
}) {
  const requestData = await getTrafficIncidentRequest({
    dataAccessLayer,
    requestId,
  });

  assert(requestData.status === "pending", () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Traffic incident request is not pending",
    detail: { requestId, status: requestData.status },
  }));

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: requestData.journeyId,
    data: {
      status: JourneyStatus[1],
      incidentRequestId: null,
    },
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId: requestData.gameId,
    playerId: requestData.playerId,
    journeyId: requestData.journeyId,
    journeyState: "started",
  });

  const rejectedRequest = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TRAFFIC_INCIDENT_REQUESTS,
    recordId: requestId,
    data: {
      status: "rejected",
      resolvedAt: new Date().toISOString(),
      reviewData: {
        reviewerId,
        rejectReason,
        decision: "rejected",
      },
    },
  });

  await recordTrafficIncidentRequest({
    dataAccessLayer,
    gameId: requestData.gameId,
    playerId: requestData.playerId,
    requestId,
    requestAction: "reject",
    requestData: {
      journeyId: requestData.journeyId,
      reviewerId,
      rejectReason,
      status: "rejected",
    },
  });

  await recordJourney({
    dataAccessLayer,
    gameId: requestData.gameId,
    playerId: requestData.playerId,
    journeyId: requestData.journeyId,
    journeyAction: "incident_rejected",
    journeyData: {
      reviewerId,
      rejectReason,
      status: JourneyStatus[1],
    },
  });

  return rejectedRequest;
}

export async function reviewTrafficIncidentRequestsBatch({
  dataAccessLayer,
  gameId,
  requestIdList,
  decision,
  reviewerId,
  reviewNote = "",
  rejectReason = "",
}) {
  assert(Array.isArray(requestIdList) && requestIdList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "requestIdList must be a non-empty array",
    detail: { gameId, requestIdList },
  }));

  assert(["approve", "reject"].includes(decision), () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "decision must be approve or reject",
    detail: { decision },
  }));

  const resultList = [];
  for (const requestId of requestIdList) {
    const requestData = await getTrafficIncidentRequest({
      dataAccessLayer,
      requestId,
    });

    assert(requestData.gameId === gameId, () => new AppError({
      code: ErrorCode.INVALID_INPUT,
      message: "Traffic incident request does not belong to this game",
      detail: { gameId, requestId },
    }));

    if (decision === "approve") {
      resultList.push(await approveTrafficIncidentRequest({
        dataAccessLayer,
        requestId,
        reviewerId,
        reviewNote,
      }));
      continue;
    }

    resultList.push(await rejectTrafficIncidentRequest({
      dataAccessLayer,
      requestId,
      reviewerId,
      rejectReason,
    }));
  }

  return {
    success: true,
    decision,
    reviewedCount: resultList.length,
    resultList,
  };
}

export async function calculateReturnedTicketTime({
  journeyId,
  originalJourneyData,
  actualEndLocationId,
  actualEndTime,
  transportType,
}) {
  const originalArrivalDate = toDate(originalJourneyData?.arrivalTime);
  const actualEndDate = toDate(actualEndTime);
  assert(originalArrivalDate && actualEndDate, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid journey or traffic incident time data",
    detail: { journeyId, actualEndTime },
  }));

  const returnedMinutes = Math.round((originalArrivalDate.getTime() - actualEndDate.getTime()) / 60000);
  assert(returnedMinutes > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Returned ticket time must be greater than 0",
    detail: { journeyId, actualEndTime },
  }));

  return {
    journeyId,
    transportType,
    actualEndLocationId,
    actualEndTime,
    returnedMinutes,
  };
}

export async function applyTrafficIncidentResult({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  requestId,
  returnedTicketData,
  actualEndLocationId,
  actualEndedAt,
}) {
  const returnedTicket = await createReturnedTicket({
    dataAccessLayer,
    gameId,
    playerId,
    transportType: returnedTicketData.transportType,
    returnedMinutes: returnedTicketData.returnedMinutes,
    sourceJourneyId: journeyId,
    reason: "traffic_incident_approved",
  });

  await addTicketToPlayer({
    dataAccessLayer,
    gameId,
    playerId,
    ticketId: returnedTicket.id,
    source: "traffic_incident_return",
  });

  await setPlayerLocation({
    dataAccessLayer,
    gameId,
    playerId,
    locationId: actualEndLocationId,
    reason: "traffic_incident_approved",
  });

  await setPlayerJourneyState({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyState: "incident_resolved",
  });

  const updatedJourney = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.JOURNEYS,
    recordId: journeyId,
    data: {
      status: JourneyStatus[5],
      toLocationId: actualEndLocationId,
      completedAt: actualEndedAt,
      incidentRequestId: requestId,
      metadata: {
        ...(await getJourney({ dataAccessLayer, journeyId })).metadata ?? {},
        actualEndLocationId,
        actualEndedAt,
        returnedMinutes: returnedTicketData.returnedMinutes,
      },
    },
  });

  await recordJourney({
    dataAccessLayer,
    gameId,
    playerId,
    journeyId,
    journeyAction: "incident_resolved",
    journeyData: {
      actualEndLocationId,
      actualEndedAt,
      returnedTicketId: returnedTicket.id,
      returnedMinutes: returnedTicketData.returnedMinutes,
      status: JourneyStatus[5],
      toLocationId: actualEndLocationId,
    },
  });

  return {
    returnedTicket,
    updatedJourney,
  };
}
