import { CollectionName } from "../../constants/collectionNames.js";
import { listBlindBoxes } from "../blindBoxes/blindBoxService.js";
import { getGame, getRanking } from "../games/gameService.js";
import { getGameJourneyDashboard } from "../journeys/journeyService.js";
import { getCurrentAuction } from "../shops/auctionShopService.js";
import { getGeneralShopItems } from "../shops/generalShopService.js";
import { listTrafficIncidentRequests } from "../trafficIncidents/trafficIncidentService.js";

async function listGamePlayersWithProfiles({ dataAccessLayer, gameId }) {
  const gamePlayerList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId },
  });

  const playerList = [];
  for (const gamePlayer of gamePlayerList) {
    const player = await dataAccessLayer.getRecordById({
      collectionName: CollectionName.PLAYERS,
      recordId: gamePlayer.playerId,
    });

    playerList.push({
      ...gamePlayer,
      player,
    });
  }

  return playerList;
}

export async function getGameOverview({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const [
    game,
    rankingData,
    playerList,
    generalShopData,
    currentAuctionData,
    blindBoxData,
    trafficIncidentData,
    journeyDashboardData,
  ] = await Promise.all([
    getGame({ dataAccessLayer, gameId }),
    getRanking({ dataAccessLayer, gameId }),
    listGamePlayersWithProfiles({ dataAccessLayer, gameId }),
    getGeneralShopItems({ dataAccessLayer, gameId }).catch(() => ({ shopTicketList: [] })),
    getCurrentAuction({ dataAccessLayer, gameId, currentTime }).catch(() => ({ currentAuction: null })),
    listBlindBoxes({
      dataAccessLayer,
      gameId,
      requesterId: null,
      visibilityMode: "admin",
    }),
    listTrafficIncidentRequests({ dataAccessLayer, gameId }),
    getGameJourneyDashboard({ dataAccessLayer, gameId, currentTime }),
  ]);

  return {
    overview: {
      game,
      ranking: rankingData.ranking,
      playerList,
      generalShopItemList: generalShopData.shopTicketList ?? [],
      currentAuction: currentAuctionData.currentAuction ?? null,
      blindBoxList: blindBoxData.blindBoxList ?? [],
      trafficIncidentRequestList: trafficIncidentData.requestList ?? [],
      journeyDashboard: journeyDashboardData.dashboard,
      summary: {
        playerCount: playerList.length,
        generalShopItemCount: generalShopData.shopTicketList?.length ?? 0,
        blindBoxCount: blindBoxData.blindBoxList?.length ?? 0,
        pendingTrafficIncidentCount: (trafficIncidentData.requestList ?? []).filter((item) => item.status === "pending").length,
        journeyExceptionCount: journeyDashboardData.dashboard.exceptionJourneyList.length,
      },
      currentTime,
    },
  };
}
