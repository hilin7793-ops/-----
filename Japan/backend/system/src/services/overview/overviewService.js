import { CollectionName } from "../../constants/collectionNames.js";
import { AuctionStatus } from "../../constants/statuses.js";
import { listBlindBoxes } from "../blindBoxes/blindBoxService.js";
import { getGame, getRanking } from "../games/gameService.js";
import { getGameJourneyDashboard } from "../journeys/journeyService.js";
import { getGameChecklist } from "./checklistService.js";
import { getAuctionBids, getCurrentAuction } from "../shops/auctionShopService.js";
import { getGeneralShopItems } from "../shops/generalShopService.js";
import { getTrafficIncidentReviewSummary, listTrafficIncidentRequests } from "../trafficIncidents/trafficIncidentService.js";

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
    activeAuctionCount,
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
    dataAccessLayer.listRecords({
      collectionName: CollectionName.AUCTIONS,
      filterOptions: { gameId, status: AuctionStatus[1] },
    }).then((list) => list.length),
  ]);

  const currentAuctionBidCount = currentAuctionData.currentAuction?.id
    ? await getAuctionBids({
        dataAccessLayer,
        auctionId: currentAuctionData.currentAuction.id,
      }).then((result) => result.bidList.length)
    : 0;

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
        activeAuctionCount,
        currentAuctionBidCount,
        journeyExceptionCount: journeyDashboardData.dashboard.exceptionJourneyList.length,
      },
      currentTime,
    },
  };
}

export async function getGameManagementSnapshot({
  dataAccessLayer,
  gameId,
  currentTime = new Date().toISOString(),
}) {
  const [overviewData, checklistData] = await Promise.all([
    getGameOverview({ dataAccessLayer, gameId, currentTime }),
    getGameChecklist({ dataAccessLayer, gameId, currentTime }),
  ]);
  const trafficIncidentReviewData = await getTrafficIncidentReviewSummary({
    dataAccessLayer,
    gameId,
  });

  return {
    managementSnapshot: {
      overview: overviewData.overview,
      checklist: checklistData.checklist,
      trafficIncidentReview: trafficIncidentReviewData.reviewSummary,
      summary: {
        playerCount: overviewData.overview.summary.playerCount,
        pendingTrafficIncidentCount: overviewData.overview.summary.pendingTrafficIncidentCount,
        activeAuctionCount: overviewData.overview.summary.activeAuctionCount,
        currentAuctionBidCount: overviewData.overview.summary.currentAuctionBidCount,
        dueJourneyStartCount: checklistData.checklist.summary.dueJourneyStartCount,
        dueJourneyCompleteCount: checklistData.checklist.summary.dueJourneyCompleteCount,
        resolvableAuctionCount: checklistData.checklist.summary.resolvableAuctionCount,
        trafficIncidentPendingCount: trafficIncidentReviewData.reviewSummary.pendingCount,
      },
      currentTime,
    },
  };
}
