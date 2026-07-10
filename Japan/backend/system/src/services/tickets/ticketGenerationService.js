import { randomUUID } from "node:crypto";
import { JAPAN_DEFAULT_TICKET_GENERATION_RULES } from "../../config/japanTicketGenerationRules.js";
import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import {
  normalizeTransportType,
  TRANSPORT_TYPE_LABELS,
  TransportType,
} from "../../constants/transportTypes.js";
import { AppError, assert } from "../../lib/appError.js";
import { pickWeightedItem, randomSteppedNormal } from "../../utils/random.js";

const TICKET_RATING_TYPE = Object.freeze({
  NORMAL_SHOP: "normal_shop",
  AUCTION: "auction",
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toTicketRatingGrade(score) {
  if (score >= 4) {
    return "S";
  }
  if (score >= 2.5) {
    return "A";
  }
  if (score >= 1) {
    return "B";
  }
  if (score >= -1) {
    return "C";
  }
  if (score >= -2.5) {
    return "D";
  }
  if (score >= -4) {
    return "E";
  }
  return "SHIT";
}

function normalizeTransportTypeList(availableTransportTypes) {
  return availableTransportTypes
    .map(normalizeTransportType)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function assertRuleNumber(ruleSet, transportType, sourceName) {
  const value = ruleSet?.[transportType];
  assert(typeof value === "number", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: `Missing ${sourceName} for transport type`,
    detail: { transportType, sourceName },
  }));
  return value;
}

export async function getTicketGenerationRules({ mapId = null, ruleSetName = "japan-default", ruleProvider } = {}) {
  if (ruleProvider) {
    const rules = await ruleProvider({ mapId, ruleSetName });
    assert(rules, () => new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Ticket generation rule set not found",
      detail: { mapId, ruleSetName },
    }));
    return rules;
  }

  if (ruleSetName !== "japan-default") {
    throw new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Ticket generation rule set not found",
      detail: { mapId, ruleSetName },
    });
  }

  return JAPAN_DEFAULT_TICKET_GENERATION_RULES;
}

export async function selectRandomTransportTypeByWeight({
  availableTransportTypes,
  transportWeightRules,
  rng = Math.random,
}) {
  const normalizedTransportTypes = normalizeTransportTypeList(availableTransportTypes);
  assert(normalizedTransportTypes.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "At least one available transport type is required",
    detail: { availableTransportTypes },
  }));

  const entries = normalizedTransportTypes
    .filter((transportType) => transportType !== TransportType.WALKING)
    .map((transportType) => [
      transportType,
      assertRuleNumber(transportWeightRules, transportType, "transport weight"),
    ]);

  const selectedTransportType = pickWeightedItem(entries, rng);

  assert(selectedTransportType, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Unable to select transport type from provided weights",
    detail: { availableTransportTypes: normalizedTransportTypes },
  }));

  return {
    selectedTransportType,
  };
}

export async function generateRandomValueByRule({
  randomRuleName,
  average,
  standardDeviation,
  step,
  minValue,
  maxValue,
  rng = Math.random,
}) {
  assert(
    [average, standardDeviation, step, minValue, maxValue].every((value) => typeof value === "number"),
    () => new AppError({
      code: ErrorCode.INVALID_INPUT,
      message: "Random rule values must all be numbers",
      detail: { randomRuleName, average, standardDeviation, step, minValue, maxValue },
    }),
  );

  return {
    generatedValue: randomSteppedNormal({
      average,
      standardDeviation,
      step,
      minValue,
      maxValue,
      rng,
    }),
  };
}

export async function calculateTicketUsableMinutes({
  baseUsableMinutes,
  transportType,
  transportDurationMultiplierRules,
}) {
  const normalizedTransportType = normalizeTransportType(transportType);
  assert(normalizedTransportType, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown transport type",
    detail: { transportType },
  }));

  const multiplier = assertRuleNumber(
    transportDurationMultiplierRules,
    normalizedTransportType,
    "duration multiplier",
  );

  return {
    usableMinutes: Math.round(baseUsableMinutes * multiplier),
  };
}

export async function calculateTicketPrice({
  basePrice,
  transportType,
  transportPriceMultiplierRules,
}) {
  const normalizedTransportType = normalizeTransportType(transportType);
  assert(normalizedTransportType, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown transport type",
    detail: { transportType },
  }));

  const multiplier = assertRuleNumber(
    transportPriceMultiplierRules,
    normalizedTransportType,
    "price multiplier",
  );

  return {
    finalPrice: Math.round(basePrice * multiplier),
  };
}

export async function calculateNormalShopTicketRating({
  baseUsableMinutes,
  basePrice,
}) {
  assert(typeof baseUsableMinutes === "number", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Base usable minutes is required for ticket rating",
    detail: { baseUsableMinutes },
  }));
  assert(typeof basePrice === "number", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Base price is required for ticket rating",
    detail: { basePrice },
  }));

  const durationZ = (baseUsableMinutes - 55) / 20;
  const priceZ = (basePrice - 2500) / 800;
  const normalizedPriceZ = priceZ * 0.72;
  const rawScore = durationZ - normalizedPriceZ;
  const ratingScore = clamp(rawScore * (5 / 4.5), -5, 5);

  return {
    ratingScore,
    ratingGrade: toTicketRatingGrade(ratingScore),
    ratingType: TICKET_RATING_TYPE.NORMAL_SHOP,
  };
}

export async function calculateAuctionTicketRating({
  baseUsableMinutes,
}) {
  assert(typeof baseUsableMinutes === "number", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Base usable minutes is required for auction ticket rating",
    detail: { baseUsableMinutes },
  }));

  const durationZ = (baseUsableMinutes - 55) / 20;
  const ratingScore = clamp(durationZ * (5 / 2.25), -5, 5);

  return {
    ratingScore,
    ratingGrade: toTicketRatingGrade(ratingScore),
    ratingType: TICKET_RATING_TYPE.AUCTION,
  };
}

export async function calculateTicketRating({ ticketData, ratingType }) {
  const baseUsableMinutes = ticketData?.baseDuration ?? ticketData?.metadata?.baseUsableMinutes;
  const basePrice = ticketData?.basePrice ?? ticketData?.metadata?.basePrice;

  if (ratingType === TICKET_RATING_TYPE.NORMAL_SHOP) {
    return calculateNormalShopTicketRating({ baseUsableMinutes, basePrice });
  }

  if (ratingType === TICKET_RATING_TYPE.AUCTION) {
    return calculateAuctionTicketRating({ baseUsableMinutes });
  }

  throw new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown ticket rating type",
    detail: { ratingType },
  });
}

export async function createTicket({
  transportType,
  usableMinutes,
  price,
  ticketSource = "generated",
  metadata = {},
  baseDuration = null,
  basePrice = null,
  ratingScore = null,
  ratingGrade = null,
  ratingType = null,
}) {
  const normalizedTransportType = normalizeTransportType(transportType);
  assert(normalizedTransportType, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown transport type",
    detail: { transportType },
  }));

  assert(typeof usableMinutes === "number" && usableMinutes >= 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Ticket usable minutes must be a number >= 0",
    detail: { usableMinutes },
  }));

  assert(typeof price === "number" && price >= 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Ticket price must be a number >= 0",
    detail: { price },
  }));

  return {
    id: randomUUID(),
    transportType: normalizedTransportType,
    transportLabel: TRANSPORT_TYPE_LABELS[normalizedTransportType],
    baseDuration,
    basePrice,
    usableMinutes,
    price,
    ratingScore,
    ratingGrade,
    ratingType,
    status: "generated",
    ticketSource,
    metadata,
  };
}

export async function generateRandomTicket({
  mapId = null,
  availableTransportTypes,
  generationRules = JAPAN_DEFAULT_TICKET_GENERATION_RULES,
  rng = Math.random,
  now = new Date().toISOString(),
} = {}) {
  const { selectedTransportType } = await selectRandomTransportTypeByWeight({
    availableTransportTypes,
    transportWeightRules: generationRules.transportWeightRules,
    rng,
  });

  const { generatedValue: baseUsableMinutes } = await generateRandomValueByRule({
    randomRuleName: "baseUsableMinutes",
    ...generationRules.baseUsableMinutesRandomRule,
    rng,
  });

  const { generatedValue: basePrice } = await generateRandomValueByRule({
    randomRuleName: "basePrice",
    ...generationRules.basePriceRandomRule,
    rng,
  });

  const { usableMinutes } = await calculateTicketUsableMinutes({
    baseUsableMinutes,
    transportType: selectedTransportType,
    transportDurationMultiplierRules: generationRules.transportDurationMultiplierRules,
  });

  const { finalPrice } = await calculateTicketPrice({
    basePrice,
    transportType: selectedTransportType,
    transportPriceMultiplierRules: generationRules.transportPriceMultiplierRules,
  });

  const normalShopRating = await calculateNormalShopTicketRating({
    baseUsableMinutes,
    basePrice,
  });

  return createTicket({
    transportType: selectedTransportType,
    baseDuration: baseUsableMinutes,
    basePrice,
    usableMinutes,
    price: finalPrice,
    ticketSource: "shop_generated",
    ratingScore: normalShopRating.ratingScore,
    ratingGrade: normalShopRating.ratingGrade,
    ratingType: normalShopRating.ratingType,
    metadata: {
      mapId,
      generatedAt: now,
      ruleSetName: generationRules.ruleSetName ?? "custom",
      baseUsableMinutes,
      basePrice,
    },
  });
}

export async function generateTicketBatch({
  mapId = null,
  count,
  availableTransportTypes,
  generationRules = JAPAN_DEFAULT_TICKET_GENERATION_RULES,
  rng = Math.random,
  now = new Date().toISOString(),
}) {
  assert(Number.isInteger(count) && count > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Ticket batch count must be a positive integer",
    detail: { count },
  }));

  const ticketList = [];
  for (let index = 0; index < count; index += 1) {
    const ticketData = await generateRandomTicket({
      mapId,
      availableTransportTypes,
      generationRules,
      rng,
      now,
    });
    ticketList.push(ticketData);
  }

  return {
    ticketList,
  };
}

async function getTicketRecordsByIds(dataAccessLayer, ticketIdList) {
  const ticketList = [];
  for (const ticketId of ticketIdList) {
    const ticketData = await dataAccessLayer.getRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: ticketId,
    });
    if (ticketData) {
      ticketList.push(ticketData);
    }
  }
  return ticketList;
}

export async function getTicket({ dataAccessLayer, ticketId }) {
  return dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
  });
}

export async function updateTicketStatus({ dataAccessLayer, ticketId, status, reason = "" }) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
    data: {
      status,
      statusReason: reason,
    },
  });
}

export async function validateTicketOwnership({ dataAccessLayer, gameId, playerId, ticketIdList }) {
  const invalidTicketList = [];

  for (const ticketId of ticketIdList) {
    const playerTicket = await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.PLAYER_TICKETS,
      filterOptions: { gameId, playerId, ticketId },
    });
    if (!playerTicket) {
      invalidTicketList.push(ticketId);
    }
  }

  return {
    isValid: invalidTicketList.length === 0,
    invalidTicketList,
  };
}

export async function validateTicketNotReserved({
  dataAccessLayer,
  gameId,
  ticketIdList,
  excludedJourneyId = null,
}) {
  const reservedTicketList = [];

  for (const ticketId of ticketIdList) {
    const reservedJourneyList = await dataAccessLayer.listRecords({
      collectionName: CollectionName.JOURNEYS,
      filterOptions: { gameId, status: "reserved" },
    });

    const journey = reservedJourneyList.find((item) =>
      item.id !== excludedJourneyId
      && Array.isArray(item.ticketIdList)
      && item.ticketIdList.includes(ticketId));

    if (journey) {
      reservedTicketList.push(ticketId);
    }
  }

  return {
    isValid: reservedTicketList.length === 0,
    reservedTicketList,
  };
}

export async function validateTicketCombination({ dataAccessLayer, ticketIdList, selectedTransportType }) {
  const ticketList = await getTicketRecordsByIds(dataAccessLayer, ticketIdList);
  const normalizedSelectedTransportType = normalizeTransportType(selectedTransportType);

  if (!normalizedSelectedTransportType) {
    return {
      isValid: false,
      reason: "Unknown transport type",
      mainTransportType: null,
      totalUsableMinutes: 0,
    };
  }

  if (normalizedSelectedTransportType === TransportType.WALKING) {
    return {
      isValid: ticketList.length === 0,
      reason: ticketList.length === 0 ? null : "Walking journey cannot include tickets",
      mainTransportType: TransportType.WALKING,
      totalUsableMinutes: 0,
    };
  }

  const normalizedTicketTypes = ticketList.map((ticket) => normalizeTransportType(ticket.transportType));
  const nonUniversalTypes = normalizedTicketTypes.filter((type) => type !== TransportType.UNIVERSAL);
  const uniqueMainTypes = [...new Set(nonUniversalTypes)];

  if (uniqueMainTypes.length === 0) {
    return {
      isValid: false,
      reason: "Universal tickets cannot be used alone",
      mainTransportType: null,
      totalUsableMinutes: 0,
    };
  }

  if (uniqueMainTypes.length > 1) {
    return {
      isValid: false,
      reason: "Different transport types cannot be combined in one journey",
      mainTransportType: null,
      totalUsableMinutes: 0,
    };
  }

  const mainTransportType = uniqueMainTypes[0];
  if (mainTransportType !== normalizedSelectedTransportType) {
    return {
      isValid: false,
      reason: "Selected transport type does not match ticket combination",
      mainTransportType,
      totalUsableMinutes: 0,
    };
  }

  const totalUsableMinutes = ticketList.reduce((sum, ticket) => sum + (ticket.usableMinutes ?? 0), 0);
  return {
    isValid: true,
    reason: null,
    mainTransportType,
    totalUsableMinutes,
  };
}

export async function calculateTicketTotalUsableTime({ dataAccessLayer, ticketIdList }) {
  const ticketList = await getTicketRecordsByIds(dataAccessLayer, ticketIdList);
  return {
    totalUsableMinutes: ticketList.reduce((sum, ticket) => sum + (ticket.usableMinutes ?? 0), 0),
  };
}

export async function validateTicketTimeEnoughForJourney({
  dataAccessLayer,
  ticketIdList,
  departureTime,
  arrivalTime,
}) {
  const { totalUsableMinutes } = await calculateTicketTotalUsableTime({ dataAccessLayer, ticketIdList });
  const requiredMinutes = Math.round((new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000);

  return {
    isEnough: totalUsableMinutes >= requiredMinutes,
    requiredMinutes,
    availableMinutes: totalUsableMinutes,
  };
}

export async function reserveTickets({ dataAccessLayer, gameId, playerId, journeyId, ticketIdList }) {
  const reservedTicketList = [];
  for (const ticketId of ticketIdList) {
    const updatedTicket = await dataAccessLayer.updateRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: ticketId,
      data: {
        status: "reserved",
        ownerPlayerId: playerId,
        reservedByJourneyId: journeyId,
        reservedInGameId: gameId,
      },
    });
    reservedTicketList.push(updatedTicket);
  }

  return { reservedTicketList };
}

export async function releaseReservedTickets({ dataAccessLayer, gameId, journeyId, ticketIdList }) {
  const releasedTicketList = [];
  for (const ticketId of ticketIdList) {
    const ticketData = await dataAccessLayer.getRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: ticketId,
    });
    if (ticketData?.reservedByJourneyId === journeyId && ticketData?.reservedInGameId === gameId) {
      const updatedTicket = await dataAccessLayer.updateRecordById({
        collectionName: CollectionName.TICKETS,
        recordId: ticketId,
        data: {
          status: "owned",
          reservedByJourneyId: null,
          reservedInGameId: null,
        },
      });
      releasedTicketList.push(updatedTicket);
    }
  }

  return { releasedTicketList };
}

export async function consumeTickets({ dataAccessLayer, gameId, playerId, journeyId, ticketIdList }) {
  const consumedTicketList = [];
  for (const ticketId of ticketIdList) {
    const updatedTicket = await dataAccessLayer.updateRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: ticketId,
      data: {
        status: "consumed",
        ownerPlayerId: playerId,
        consumedByJourneyId: journeyId,
        consumedInGameId: gameId,
        consumedAt: new Date().toISOString(),
        reservedByJourneyId: null,
        reservedInGameId: null,
      },
    });
    consumedTicketList.push(updatedTicket);
  }

  return { consumedTicketList };
}

export async function createReturnedTicket({
  dataAccessLayer,
  gameId,
  playerId,
  transportType,
  returnedMinutes,
  sourceJourneyId,
  reason = "",
}) {
  const normalizedTransportType = normalizeTransportType(transportType);
  assert(normalizedTransportType, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown transport type",
    detail: { transportType },
  }));

  assert(returnedMinutes > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Returned ticket minutes must be greater than 0",
    detail: { returnedMinutes },
  }));

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      gameId,
      transportType: normalizedTransportType,
      transportLabel: TRANSPORT_TYPE_LABELS[normalizedTransportType],
      usableMinutes: Math.round(returnedMinutes),
      price: 0,
      status: "owned",
      ticketSource: "traffic_incident_return",
      ownerPlayerId: playerId,
      sourceJourneyId,
      acquiredAt: new Date().toISOString(),
      metadata: {
        reason,
        sourceJourneyId,
        isCompensationTicket: true,
      },
    },
  });
}

export async function destroyTicket({ dataAccessLayer, ticketId, reason = "" }) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
    data: {
      status: "destroyed",
      destroyedAt: new Date().toISOString(),
      destroyReason: reason,
    },
  });
}
