import { CollectionName } from "../../constants/collectionNames.js";
import { AuctionStatus, JourneyStatus } from "../../constants/statuses.js";
import { getGame } from "../games/gameService.js";
import { canCreateAuctionRound } from "../shops/auctionShopService.js";
import { canRefreshGeneralShop } from "../shops/generalShopService.js";
import { listTrafficIncidentRequests } from "../trafficIncidents/trafficIncidentService.js";

function hasReached(currentTime, targetTime) {
  return new Date(currentTime).getTime() >= new Date(targetTime).getTime();
}

async function getPlayerCount(dataAccessLayer, gameId) {
  const gamePlayerList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId },
  });
  return gamePlayerList.length;
}

export async function getGameChecklist({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const [game, journeyList, activeAuctionList, trafficIncidentData] = await Promise.all([
    getGame({ dataAccessLayer, gameId }),
    dataAccessLayer.listRecords({
      collectionName: CollectionName.JOURNEYS,
      filterOptions: { gameId },
    }),
    dataAccessLayer.listRecords({
      collectionName: CollectionName.AUCTIONS,
      filterOptions: { gameId, status: AuctionStatus[1] },
    }),
    listTrafficIncidentRequests({
      dataAccessLayer,
      gameId,
      status: "pending",
    }),
  ]);

  const playerCount = await getPlayerCount(dataAccessLayer, gameId);

  const dueReservedJourneyList = journeyList.filter((journey) =>
    journey.status === JourneyStatus[0] && hasReached(currentTime, journey.departureTime));
  const dueStartedJourneyList = journeyList.filter((journey) =>
    journey.status === JourneyStatus[1] && hasReached(currentTime, journey.arrivalTime));
  const resolvableAuctionList = activeAuctionList.filter((auction) =>
    hasReached(currentTime, auction.endTime));

  const dailyRefreshCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId,
    currentTime,
    refreshType: "daily_free",
    playerCount,
  }).catch(() => ({ canRefresh: false, reason: "shop_not_initialized" }));

  const createAuctionRoundCheck = await canCreateAuctionRound({
    dataAccessLayer,
    gameId,
    currentTime,
  }).catch(() => ({ canCreate: false, reason: "auction_not_initialized" }));

  return {
    checklist: {
      game,
      currentTime,
      pendingTrafficIncidentRequestList: trafficIncidentData.requestList ?? [],
      dueReservedJourneyList,
      dueStartedJourneyList,
      resolvableAuctionList,
      dailyShopRefresh: {
        canRefresh: dailyRefreshCheck.canRefresh ?? false,
        reason: dailyRefreshCheck.reason ?? null,
      },
      auctionRoundCreation: {
        canCreate: createAuctionRoundCheck.canCreate ?? false,
        reason: createAuctionRoundCheck.reason ?? null,
      },
      summary: {
        pendingTrafficIncidentCount: trafficIncidentData.requestList?.length ?? 0,
        dueJourneyStartCount: dueReservedJourneyList.length,
        dueJourneyCompleteCount: dueStartedJourneyList.length,
        resolvableAuctionCount: resolvableAuctionList.length,
      },
    },
  };
}
