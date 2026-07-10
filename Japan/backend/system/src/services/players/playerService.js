import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { PlayerGameStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";

async function getGamePlayerRecord(dataAccessLayer, { gameId, playerId }) {
  const gamePlayer = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  assert(gamePlayer, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Game player record not found",
    detail: { gameId, playerId },
  }));

  return gamePlayer;
}

export async function createPlayer({
  dataAccessLayer,
  userId,
  authUserId = "",
  displayName,
  avatar = "",
  metadata = {},
}) {
  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYERS,
    data: {
      userId,
      authUserId,
      displayName,
      avatar,
      metadata,
    },
  });
}

export async function getPlayer({ dataAccessLayer, playerId }) {
  const playerData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.PLAYERS,
    recordId: playerId,
  });

  assert(playerData, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Player not found",
    detail: { playerId },
  }));

  return playerData;
}

export async function updatePlayerProfile({
  dataAccessLayer,
  playerId,
  displayName,
  avatar,
  metadata,
}) {
  const playerData = await getPlayer({ dataAccessLayer, playerId });

  const updateData = {};
  if (displayName !== undefined) {
    updateData.displayName = displayName;
  }

  if (avatar !== undefined) {
    updateData.avatar = avatar;
  }

  if (metadata !== undefined) {
    updateData.metadata = metadata;
  }

  assert(Object.keys(updateData).length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "At least one player profile field is required",
    detail: { playerId },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.PLAYERS,
    recordId: playerData.id,
    data: updateData,
  });
}

export async function initializePlayerForGame({
  dataAccessLayer,
  gameId,
  playerId,
  startLocationId,
  initialMoney,
}) {
  const existing = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  if (existing) {
    return dataAccessLayer.updateRecordById({
      collectionName: CollectionName.GAME_PLAYERS,
      recordId: existing.id,
      data: {
        status: PlayerGameStatus[1],
        money: initialMoney,
        currentLocationId: startLocationId,
      },
    });
  }

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAME_PLAYERS,
    data: {
      gameId,
      playerId,
      status: PlayerGameStatus[1],
      money: initialMoney,
      currentLocationId: startLocationId,
      privateState: {},
    },
  });
}

export async function getPlayerMoney({ dataAccessLayer, gameId, playerId }) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  return { money: gamePlayer.money ?? 0 };
}

export async function canAfford({ dataAccessLayer, gameId, playerId, amount }) {
  const { money } = await getPlayerMoney({ dataAccessLayer, gameId, playerId });
  return {
    canAfford: money >= amount,
    currentMoney: money,
  };
}

export async function addPlayerMoney({
  dataAccessLayer,
  gameId,
  playerId,
  amount,
  reason = "",
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
    data: {
      money: (gamePlayer.money ?? 0) + amount,
      privateState: {
        ...(gamePlayer.privateState ?? {}),
        lastMoneyChangeReason: reason,
      },
    },
  });
}

export async function deductPlayerMoney({
  dataAccessLayer,
  gameId,
  playerId,
  amount,
  reason = "",
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  assert((gamePlayer.money ?? 0) >= amount, () => new AppError({
    code: ErrorCode.MONEY_NOT_ENOUGH,
    message: "Player money is not enough",
    detail: { gameId, playerId, amount },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
    data: {
      money: (gamePlayer.money ?? 0) - amount,
      privateState: {
        ...(gamePlayer.privateState ?? {}),
        lastMoneyChangeReason: reason,
      },
    },
  });
}

export async function getPlayerLocation({ dataAccessLayer, gameId, playerId }) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  return gamePlayer.currentLocationId ?? null;
}

export async function setPlayerLocation({
  dataAccessLayer,
  gameId,
  playerId,
  locationId,
  reason = "",
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
    data: {
      currentLocationId: locationId,
      privateState: {
        ...(gamePlayer.privateState ?? {}),
        lastLocationChangeReason: reason,
      },
    },
  });
}

export async function addTicketToPlayer({
  dataAccessLayer,
  gameId,
  playerId,
  ticketId,
  source,
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });
  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId,
      playerId,
      gamePlayerId: gamePlayer.id,
      ticketId,
      source,
      createdAt: new Date().toISOString(),
    },
  });
}

export async function getPlayerTickets({
  dataAccessLayer,
  gameId,
  playerId,
  filterOptions = {},
  queryOptions = {},
}) {
  const {
    source,
    ticketId,
    createdAtAfter,
    createdAtBefore,
    ...ticketFilterOptions
  } = filterOptions;

  const playerTicketList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.PLAYER_TICKETS,
    filterOptions: {
      gameId,
      playerId,
      ...ticketFilterOptions,
    },
    queryOptions,
  });

  const ticketList = [];
  for (const playerTicket of playerTicketList) {
    const playerTicketCreatedAt = playerTicket.createdAt ? new Date(playerTicket.createdAt).getTime() : null;
    const createdAtAfterTime = createdAtAfter ? new Date(createdAtAfter).getTime() : null;
    const createdAtBeforeTime = createdAtBefore ? new Date(createdAtBefore).getTime() : null;

    if (source && playerTicket.source !== source) {
      continue;
    }

    if (ticketId && playerTicket.ticketId !== ticketId) {
      continue;
    }

    if (createdAtAfterTime !== null && (playerTicketCreatedAt === null || playerTicketCreatedAt < createdAtAfterTime)) {
      continue;
    }

    if (createdAtBeforeTime !== null && (playerTicketCreatedAt === null || playerTicketCreatedAt > createdAtBeforeTime)) {
      continue;
    }

    const ticketData = await dataAccessLayer.getRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: playerTicket.ticketId,
    });

    if (ticketData) {
      ticketList.push({
        ...playerTicket,
        ticket: ticketData,
      });
    }
  }

  return { ticketList };
}

export async function removeTicketFromPlayer({
  dataAccessLayer,
  gameId,
  playerId,
  ticketId,
  reason = "",
}) {
  const playerTicket = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.PLAYER_TICKETS,
    filterOptions: { gameId, playerId, ticketId },
  });

  assert(playerTicket, () => new AppError({
    code: ErrorCode.TICKET_NOT_OWNED,
    message: "Player does not own this ticket",
    detail: { gameId, playerId, ticketId },
  }));

  await dataAccessLayer.deleteRecordById({
    collectionName: CollectionName.PLAYER_TICKETS,
    recordId: playerTicket.id,
  });

  const ticketData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
  });

  if (ticketData) {
    await dataAccessLayer.updateRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: ticketId,
      data: {
        ownerPlayerId: null,
        ownerGamePlayerId: null,
        removalReason: reason,
      },
    });
  }

  return {
    success: true,
    removedTicketId: ticketId,
  };
}

export async function getPlayerCurrentJourney({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const currentJourney = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: {
      gameId,
      playerId,
      status: "started",
    },
  });

  return { currentJourney };
}

export async function getPlayerReservedJourney({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const reservedJourney = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: {
      gameId,
      playerId,
      status: "reserved",
    },
  });

  return { reservedJourney };
}

export async function setPlayerJourneyState({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  journeyState,
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });

  const updateData = {
    privateState: {
      ...(gamePlayer.privateState ?? {}),
      lastJourneyState: journeyState,
    },
  };

  if (journeyState === "reserved") {
    updateData.reservedJourneyId = journeyId;
    updateData.currentJourneyId = null;
  } else if (journeyState === "started") {
    updateData.currentJourneyId = journeyId;
    updateData.reservedJourneyId = null;
  } else {
    updateData.currentJourneyId = null;
    updateData.reservedJourneyId = null;
  }

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
    data: updateData,
  });
}

export async function hasReachedGoal({
  dataAccessLayer,
  gameId,
  playerId,
  goalLocationId,
}) {
  const gamePlayer = await getGamePlayerRecord(dataAccessLayer, { gameId, playerId });

  return {
    hasReachedGoal: gamePlayer.currentLocationId === goalLocationId,
    arrivalTime: gamePlayer.arrivedAt ?? null,
  };
}
