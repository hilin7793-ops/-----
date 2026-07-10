import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { GameStatus, PlayerGameStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import { validateBlindBoxSetup } from "../blindBoxes/blindBoxService.js";
import { recordPlayerAction } from "../records/recordService.js";
import { getMap } from "../maps/mapService.js";
import { initializeAuctionShop, createAuctionRound } from "../shops/auctionShopService.js";
import { initializeGeneralShop, refreshGeneralShop } from "../shops/generalShopService.js";
import { isOnTheHour } from "../time/timeService.js";

async function getGamePlayers(dataAccessLayer, gameId) {
  return dataAccessLayer.listRecords({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId },
  });
}

function compareRanking(a, b) {
  const aArrived = a.status === PlayerGameStatus[2];
  const bArrived = b.status === PlayerGameStatus[2];

  if (aArrived && bArrived) {
    const timeDiff = new Date(a.arrivedAt).getTime() - new Date(b.arrivedAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (b.money ?? 0) - (a.money ?? 0);
  }

  if (aArrived !== bArrived) {
    return aArrived ? -1 : 1;
  }

  return (b.money ?? 0) - (a.money ?? 0);
}

function addMinutes(isoString, minutes) {
  const date = new Date(isoString);
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

function getLocalHourMinute(currentTime, timeZone = "Asia/Taipei") {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(currentTime));
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { hour: value.hour, minute: value.minute };
}

export async function createGame({
  dataAccessLayer,
  hostPlayerId,
  mapId,
  startLocationId,
  goalLocationId,
  initialMoney,
  gameSettings = {},
  blindBoxSettings = {},
  name = "",
}) {
  const createdGame = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAMES,
    data: {
      name,
      hostPlayerId,
      mapId,
      startLocationId,
      goalLocationId,
      status: GameStatus[0],
      initialMoney,
      gameSettings,
      blindBoxSettings,
    },
  });

  await recordPlayerAction({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: hostPlayerId,
    actionType: "create_game",
    actionData: {
      mapId,
      startLocationId,
      goalLocationId,
      initialMoney,
      name,
    },
  });

  return createdGame;
}

export async function getGame({ dataAccessLayer, gameId }) {
  const gameData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameId,
  });

  assert(gameData, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Game not found",
    detail: { gameId },
  }));

  return gameData;
}

export async function updateGameSettings({
  dataAccessLayer,
  gameId,
  settings,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameId,
    data: {
      gameSettings: {
        ...(gameData.gameSettings ?? {}),
        ...(settings ?? {}),
      },
    },
  });
}

export async function joinGame({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });
  assert(gameData.status === GameStatus[0], () => new AppError({
    code: ErrorCode.GAME_ALREADY_STARTED,
    message: "Cannot join after game has started",
    detail: { gameId, playerId },
  }));

  const existing = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  if (existing) {
    return existing;
  }

  const createdGamePlayer = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAME_PLAYERS,
    data: {
      gameId,
      playerId,
      status: PlayerGameStatus[0],
      money: gameData.initialMoney,
      currentLocationId: gameData.startLocationId,
      privateState: {},
    },
  });

  await recordPlayerAction({
    dataAccessLayer,
    gameId,
    playerId,
    actionType: "join_game",
    actionData: {
      gamePlayerId: createdGamePlayer.id,
      status: createdGamePlayer.status,
    },
  });

  return createdGamePlayer;
}

export async function leaveGame({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });
  assert(gameData.status === GameStatus[0], () => new AppError({
    code: ErrorCode.GAME_ALREADY_STARTED,
    message: "Cannot leave after game has started",
    detail: { gameId, playerId },
  }));

  const gamePlayer = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  assert(gamePlayer, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Player is not in this game",
    detail: { gameId, playerId },
  }));

  await dataAccessLayer.deleteRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
  });

  await recordPlayerAction({
    dataAccessLayer,
    gameId,
    playerId,
    actionType: "leave_game",
    actionData: {
      removedGamePlayerId: gamePlayer.id,
    },
  });

  return { success: true, removedGamePlayerId: gamePlayer.id };
}

export async function canStartGame({
  dataAccessLayer,
  gameId,
  currentTime,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });
  if (gameData.status !== GameStatus[0]) {
    return { canStart: false, reason: "Game is not in waiting state" };
  }

  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  if (gamePlayers.length === 0) {
    return { canStart: false, reason: "Game has no players" };
  }

  const { isOnTheHour: onTheHour } = await isOnTheHour({
    currentTime,
    timeZone: "Asia/Taipei",
  });

  if (!onTheHour) {
    return { canStart: false, reason: "Game must start on the hour" };
  }

  return { canStart: true, reason: null };
}

export async function startGame({
  dataAccessLayer,
  gameId,
  startTime,
}) {
  const startCheck = await canStartGame({
    dataAccessLayer,
    gameId,
    currentTime: startTime,
  });

  assert(startCheck.canStart, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: startCheck.reason,
    detail: { gameId, startTime },
  }));

  const gameData = await getGame({ dataAccessLayer, gameId });
  const mapData = await getMap({ dataAccessLayer, mapId: gameData.mapId });
  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  const blindBoxConfigList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.BLIND_BOXES,
    filterOptions: { gameId },
  });

  const blindBoxValidation = await validateBlindBoxSetup({
    dataAccessLayer,
    gameId,
    blindBoxConfigList,
  });

  assert(blindBoxValidation.isValid, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Blind box setup is not valid",
    detail: {
      gameId,
      reasonList: blindBoxValidation.reasonList,
    },
  }));

  await initializeGeneralShop({
    dataAccessLayer,
    gameId,
    mapId: gameData.mapId,
  });

  const { hour, minute } = getLocalHourMinute(startTime);
  const initialRefreshType = hour === 6 && minute === 0 ? "daily_free" : "game_start";

  await refreshGeneralShop({
    dataAccessLayer,
    gameId,
    playerId: null,
    refreshType: initialRefreshType,
    currentTime: startTime,
    playerCount: gamePlayers.length,
    availableTransportTypes: mapData.availableTransportTypes ?? [],
    mapId: gameData.mapId,
  });

  await initializeAuctionShop({
    dataAccessLayer,
    gameId,
    mapId: gameData.mapId,
  });

  await createAuctionRound({
    dataAccessLayer,
    gameId,
    mapId: gameData.mapId,
    startTime,
    endTime: addMinutes(startTime, 10),
    availableTransportTypes: mapData.availableTransportTypes ?? [],
  });

  const startedGame = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameId,
    data: {
      status: GameStatus[1],
      startedAt: startTime,
    },
  });

  for (const gamePlayer of gamePlayers) {
    await recordPlayerAction({
      dataAccessLayer,
      gameId,
      playerId: gamePlayer.playerId,
      actionType: "start_game",
      actionData: {
        startedAt: startTime,
      },
    });
  }

  return startedGame;
}

export async function endGame({
  dataAccessLayer,
  gameId,
  endedAt,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });
  assert(gameData.status !== GameStatus[2], () => new AppError({
    code: ErrorCode.GAME_ALREADY_ENDED,
    message: "Game already ended",
    detail: { gameId },
  }));

  const winnerResult = await determineWinner({ dataAccessLayer, gameId });

  const endedGame = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameId,
    data: {
      status: GameStatus[2],
      endedAt,
      gameSettings: {
        ...(gameData.gameSettings ?? {}),
        finalResult: winnerResult,
      },
    },
  });

  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  for (const gamePlayer of gamePlayers) {
    await recordPlayerAction({
      dataAccessLayer,
      gameId,
      playerId: gamePlayer.playerId,
      actionType: "end_game",
      actionData: {
        endedAt,
        winnerResult,
      },
    });
  }

  return endedGame;
}

export async function checkGameEndCondition({
  dataAccessLayer,
  gameId,
}) {
  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  const hasPlayers = gamePlayers.length > 0;
  const allPlayersArrived = hasPlayers && gamePlayers.every((player) => player.status === PlayerGameStatus[2]);

  return {
    shouldEndGame: allPlayersArrived,
    hasPlayers,
    totalPlayerCount: gamePlayers.length,
    arrivedPlayerCount: gamePlayers.filter((player) => player.status === PlayerGameStatus[2]).length,
  };
}

export async function recordPlayerArrival({
  dataAccessLayer,
  gameId,
  playerId,
  arrivalTime,
  remainingMoney = null,
}) {
  const gamePlayer = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  assert(gamePlayer, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Game player record not found",
    detail: { gameId, playerId },
  }));

  const updatedArrival = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: gamePlayer.id,
    data: {
      status: PlayerGameStatus[2],
      arrivedAt: arrivalTime,
      money: remainingMoney ?? gamePlayer.money,
    },
  });

  await recordPlayerAction({
    dataAccessLayer,
    gameId,
    playerId,
    actionType: "player_arrival",
    actionData: {
      arrivalTime,
      remainingMoney: remainingMoney ?? gamePlayer.money,
    },
  });

  return updatedArrival;
}

export async function determineWinner({
  dataAccessLayer,
  gameId,
}) {
  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  const arrivedPlayers = gamePlayers
    .filter((player) => player.status === PlayerGameStatus[2] && player.arrivedAt)
    .sort(compareRanking);

  if (arrivedPlayers.length === 0) {
    return {
      winnerPlayerId: null,
      tiedPlayerIds: [],
      ranking: [],
    };
  }

  const winner = arrivedPlayers[0];
  const tiedPlayerIds = arrivedPlayers
    .filter((player) =>
      player.arrivedAt === winner.arrivedAt
      && (player.money ?? 0) === (winner.money ?? 0))
    .map((player) => player.playerId);

  return {
    winnerPlayerId: tiedPlayerIds.length === 1 ? winner.playerId : null,
    tiedPlayerIds,
    ranking: arrivedPlayers.map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId,
      arrivedAt: player.arrivedAt,
      remainingMoney: player.money ?? 0,
    })),
  };
}

export async function getRanking({
  dataAccessLayer,
  gameId,
}) {
  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  const ranking = gamePlayers
    .slice()
    .sort(compareRanking)
    .map((player, index) => ({
      rank: index + 1,
      playerId: player.playerId,
      status: player.status,
      arrivedAt: player.arrivedAt ?? null,
      remainingMoney: player.money ?? 0,
      currentLocationId: player.currentLocationId ?? null,
    }));

  return { ranking };
}

export async function processGameTimeEvents({
  dataAccessLayer,
  gameId,
  currentTime,
}) {
  const gameData = await getGame({ dataAccessLayer, gameId });
  const gamePlayers = await getGamePlayers(dataAccessLayer, gameId);
  const arrivalUpdates = [];

  for (const gamePlayer of gamePlayers) {
    if (
      gamePlayer.status !== PlayerGameStatus[2]
      && gamePlayer.currentLocationId
      && gamePlayer.currentLocationId === gameData.goalLocationId
    ) {
      const updatedPlayer = await recordPlayerArrival({
        dataAccessLayer,
        gameId,
        playerId: gamePlayer.playerId,
        arrivalTime: currentTime,
        remainingMoney: gamePlayer.money,
      });
      arrivalUpdates.push(updatedPlayer);
    }
  }

  const endCheck = await checkGameEndCondition({ dataAccessLayer, gameId });
  let endedGame = null;
  if (endCheck.shouldEndGame && gameData.status !== GameStatus[2]) {
    endedGame = await endGame({
      dataAccessLayer,
      gameId,
      endedAt: currentTime,
    });
  }

  return {
    arrivalUpdates,
    endedGame,
  };
}
