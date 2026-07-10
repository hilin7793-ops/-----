import { CollectionName } from "../../constants/collectionNames.js";
import { GameStatus, JourneyStatus } from "../../constants/statuses.js";
import { getGame } from "../games/gameService.js";

function isPostGameVisibilityMode(visibilityMode) {
  return visibilityMode === "post_game_review" || visibilityMode === "admin";
}

export async function canViewPlayerExactLocation({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  targetPlayerId,
}) {
  if (requestingPlayerId === targetPlayerId) {
    return { canView: true };
  }

  const game = await getGame({ dataAccessLayer, gameId });
  return {
    canView: game.status === GameStatus[2],
  };
}

export async function canViewPlayerFullRoute({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  targetPlayerId,
}) {
  if (requestingPlayerId === targetPlayerId) {
    return { canView: true };
  }

  const game = await getGame({ dataAccessLayer, gameId });
  return {
    canView: game.status === GameStatus[2],
  };
}

export async function canViewPublicJourney({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  targetPlayerId,
}) {
  if (requestingPlayerId === targetPlayerId) {
    return { canView: true };
  }

  const game = await getGame({ dataAccessLayer, gameId });
  return {
    canView: game.status === GameStatus[1] || game.status === GameStatus[2],
  };
}

export async function filterPlayerDataByVisibility({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  targetPlayerData,
  visibilityMode = "during_game",
}) {
  const exactLocation = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId,
    requestingPlayerId,
    targetPlayerId: targetPlayerData.playerId ?? targetPlayerData.id,
  });

  if (isPostGameVisibilityMode(visibilityMode) || exactLocation.canView) {
    return targetPlayerData;
  }

  return {
    ...targetPlayerData,
    currentLocationId: undefined,
    privateState: undefined,
  };
}

export async function filterRecordDataByVisibility({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  recordData,
  visibilityMode = "during_game",
}) {
  if (isPostGameVisibilityMode(visibilityMode)) {
    return recordData;
  }

  if (!requestingPlayerId || recordData.playerId === requestingPlayerId) {
    return recordData;
  }

  const hiddenKeys = new Set(["currentLocationId", "fullRoute", "privateState"]);
  const filteredPayload = Object.fromEntries(
    Object.entries(recordData.payload ?? {}).filter(([key]) => !hiddenKeys.has(key)),
  );

  return {
    ...recordData,
    payload: filteredPayload,
  };
}

export async function filterBlindBoxDataByVisibility({
  dataAccessLayer,
  gameId,
  requesterId,
  blindBoxData,
  visibilityMode = "during_game",
}) {
  if (isPostGameVisibilityMode(visibilityMode) || visibilityMode === "admin") {
    return blindBoxData;
  }

  const game = await getGame({ dataAccessLayer, gameId });
  if (game.status === GameStatus[2]) {
    return blindBoxData;
  }

  if (blindBoxData.status === "opened" || blindBoxData.status === "removed") {
    return blindBoxData;
  }

  return {
    ...blindBoxData,
    effectData: undefined,
    requesterId,
  };
}

export async function getPublicJourneyInfo({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  targetPlayerId,
}) {
  const { canView } = await canViewPublicJourney({
    dataAccessLayer,
    gameId,
    requestingPlayerId,
    targetPlayerId,
  });

  if (!canView) {
    return { publicJourneyInfo: null };
  }

  const journeyList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.JOURNEYS,
    filterOptions: { gameId, playerId: targetPlayerId },
  });

  const currentJourney = journeyList.find((journey) =>
    journey.status === JourneyStatus[0] || journey.status === JourneyStatus[1],
  ) ?? null;

  if (!currentJourney) {
    return { publicJourneyInfo: null };
  }

  return {
    publicJourneyInfo: {
      journeyId: currentJourney.id,
      fromLocationId: currentJourney.fromLocationId,
      toLocationId: currentJourney.toLocationId,
      departureTime: currentJourney.departureTime,
      arrivalTime: currentJourney.arrivalTime,
      ticketIdList: currentJourney.ticketIdList ?? [],
      status: currentJourney.status,
    },
  };
}
