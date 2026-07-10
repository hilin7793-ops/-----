import { CollectionName } from "../../constants/collectionNames.js";
import { AuctionStatus } from "../../constants/statuses.js";
import { AppError } from "../../lib/appError.js";
import { processGameTimeEvents } from "../games/gameService.js";
import { processJourneyTimeEvents } from "../journeys/journeyService.js";
import { getGameChecklist } from "../overview/checklistService.js";
import { initializeAuctionShop, resolveAuction, createAuctionRound, canCreateAuctionRound } from "../shops/auctionShopService.js";
import { initializeGeneralShop, canRefreshGeneralShop, refreshGeneralShop } from "../shops/generalShopService.js";

function isAppError(error) {
  return error instanceof AppError || Boolean(error?.code);
}

async function getGameData(dataAccessLayer, gameId) {
  return dataAccessLayer.getRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameId,
  });
}

async function getMapData(dataAccessLayer, mapId) {
  return dataAccessLayer.getRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
  });
}

async function getPlayerCount(dataAccessLayer, gameId) {
  const gamePlayers = await dataAccessLayer.listRecords({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId },
  });
  return gamePlayers.length;
}

function buildAuctionEndTime(startTime) {
  return new Date(new Date(startTime).getTime() + (10 * 60 * 1000)).toISOString();
}

export async function processShopScheduledEvents({
  dataAccessLayer,
  gameId,
  currentTime,
  addTicketToPlayer = null,
  addPlayerMoney = null,
  consumePlayerBlindBoxSpecialState = null,
}) {
  const processedShopEvents = [];
  const gameData = await getGameData(dataAccessLayer, gameId);

  if (!gameData) {
    return {
      processedShopEvents,
      gameId,
      currentTime,
    };
  }

  const mapData = await getMapData(dataAccessLayer, gameData.mapId);
  const playerCount = await getPlayerCount(dataAccessLayer, gameId);

  await initializeGeneralShop({
    dataAccessLayer,
    gameId,
    mapId: gameData.mapId,
  });

  const dailyRefreshCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId,
    currentTime,
    refreshType: "daily_free",
    playerCount,
  });

  if (dailyRefreshCheck.canRefresh && mapData) {
    const refreshResult = await refreshGeneralShop({
      dataAccessLayer,
      gameId,
      refreshType: "daily_free",
      currentTime,
      playerCount,
      mapId: gameData.mapId,
      availableTransportTypes: mapData.availableTransportTypes ?? [],
    });

    processedShopEvents.push({
      type: "general_shop_daily_refresh",
      refreshCount: refreshResult.newShopTicketList.length,
      refreshedAt: refreshResult.refreshedAt,
    });
  }

  await initializeAuctionShop({
    dataAccessLayer,
    gameId,
    mapId: gameData.mapId,
  });

  const activeAuctions = await dataAccessLayer.listRecords({
    collectionName: CollectionName.AUCTIONS,
    filterOptions: { gameId, status: AuctionStatus[1] },
  });

  for (const auction of activeAuctions) {
    if (new Date(currentTime) >= new Date(auction.endTime)) {
      try {
        const resolvedAuction = await resolveAuction({
          dataAccessLayer,
          gameId,
          auctionId: auction.id,
          currentTime,
          addTicketToPlayer,
          addPlayerMoney,
          consumePlayerBlindBoxSpecialState,
        });

        processedShopEvents.push({
          type: "auction_resolved",
          auctionId: auction.id,
          winnerPlayerId: resolvedAuction.winnerPlayerId,
        });
      } catch (error) {
        if (!isAppError(error)) {
          throw error;
        }
      }
    }
  }

  const createCheck = await canCreateAuctionRound({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  if (createCheck.canCreate && mapData) {
    const createdAuction = await createAuctionRound({
      dataAccessLayer,
      gameId,
      mapId: gameData.mapId,
      startTime: currentTime,
      endTime: buildAuctionEndTime(currentTime),
      availableTransportTypes: mapData.availableTransportTypes ?? [],
    });

    processedShopEvents.push({
      type: "auction_created",
      auctionId: createdAuction.id,
      startTime: createdAuction.startTime,
      endTime: createdAuction.endTime,
    });
  }

  return {
    processedShopEvents,
    gameId,
    currentTime,
  };
}

export async function processJourneyScheduledEvents({
  dataAccessLayer,
  gameId,
  currentTime,
}) {
  return processJourneyTimeEvents({
    dataAccessLayer,
    gameId,
    currentTime,
  });
}

export async function processGameEndEvent({
  dataAccessLayer,
  gameId,
  currentTime,
}) {
  return processGameTimeEvents({
    dataAccessLayer,
    gameId,
    currentTime,
  });
}

export async function processAllScheduledEvents({
  dataAccessLayer,
  gameId,
  currentTime,
  addTicketToPlayer = null,
  addPlayerMoney = null,
  consumePlayerBlindBoxSpecialState = null,
}) {
  const shopResult = await processShopScheduledEvents({
    dataAccessLayer,
    gameId,
    currentTime,
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  const journeyResult = await processJourneyScheduledEvents({
    dataAccessLayer,
    gameId,
    currentTime,
  });
  const gameResult = await processGameEndEvent({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  return {
    shopResult,
    journeyResult,
    gameResult,
  };
}

export async function processGameChecklistActions({
  dataAccessLayer,
  gameId,
  currentTime,
  addTicketToPlayer = null,
  addPlayerMoney = null,
  consumePlayerBlindBoxSpecialState = null,
}) {
  const checklistBefore = await getGameChecklist({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  const processResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId,
    currentTime,
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });

  const checklistAfter = await getGameChecklist({
    dataAccessLayer,
    gameId,
    currentTime,
  });

  return {
    checklistBefore: checklistBefore.checklist,
    processResult,
    checklistAfter: checklistAfter.checklist,
  };
}
