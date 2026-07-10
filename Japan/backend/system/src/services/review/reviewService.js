import { getBlindBoxReviewData } from "../blindBoxes/blindBoxService.js";
import { determineWinner, getGame, getRanking } from "../games/gameService.js";
import { getGameRecords } from "../records/recordService.js";

function summarizeRecordTypes(recordList) {
  const counts = {};
  for (const record of recordList) {
    counts[record.recordType] = (counts[record.recordType] ?? 0) + 1;
  }
  return counts;
}

function summarizeTicketAcquisitionSources(recordList) {
  const sourceCounts = {};
  for (const record of recordList) {
    if (record.recordType !== "ticket_acquisition") {
      continue;
    }
    sourceCounts[record.action] = (sourceCounts[record.action] ?? 0) + 1;
  }
  return sourceCounts;
}

function summarizeTrafficIncidents(recordList) {
  const summary = {
    submitCount: 0,
    approveCount: 0,
    rejectCount: 0,
  };

  for (const record of recordList) {
    if (record.recordType !== "traffic_incident") {
      continue;
    }
    if (record.action === "submit") summary.submitCount += 1;
    if (record.action === "approve") summary.approveCount += 1;
    if (record.action === "reject") summary.rejectCount += 1;
  }

  return summary;
}

function summarizePlayerResults({ ranking, game }) {
  return ranking.map((playerRanking) => ({
    playerId: playerRanking.playerId,
    rank: playerRanking.rank,
    status: playerRanking.status,
    arrivedAt: playerRanking.arrivedAt,
    remainingMoney: playerRanking.remainingMoney,
    reachedGoal: playerRanking.currentLocationId === game.goalLocationId,
  }));
}

function buildReviewSummary({ game, ranking, winnerResult, recordList, blindBoxReviewData }) {
  return {
    playerResultList: summarizePlayerResults({ ranking, game }),
    ticketAcquisitionSourceCounts: summarizeTicketAcquisitionSources(recordList),
    trafficIncidentSummary: summarizeTrafficIncidents(recordList),
    recordTypeCounts: summarizeRecordTypes(recordList),
    blindBoxSummary: {
      totalBlindBoxCount: blindBoxReviewData.blindBoxList?.length ?? 0,
      openedBlindBoxCount: (blindBoxReviewData.blindBoxList ?? []).filter((item) => item.openedStatus).length,
      effectLogCount: blindBoxReviewData.blindBoxEffectLogList?.length ?? 0,
    },
    winnerPlayerId: winnerResult.winnerPlayerId,
    tiedPlayerIds: winnerResult.tiedPlayerIds,
  };
}

export async function getAggregatedGameReviewData({ dataAccessLayer, gameId }) {
  const [gameData, rankingData, winnerResult, gameRecordData, blindBoxReviewData] = await Promise.all([
    getGame({ dataAccessLayer, gameId }),
    getRanking({ dataAccessLayer, gameId }),
    determineWinner({ dataAccessLayer, gameId }),
    getGameRecords({
      dataAccessLayer,
      gameId,
      visibilityMode: "post_game_review",
    }),
    getBlindBoxReviewData({ dataAccessLayer, gameId }),
  ]);

  return {
    reviewData: {
      game: gameData,
      ranking: rankingData.ranking,
      winnerResult,
      recordList: gameRecordData.recordList,
      blindBoxReviewData: blindBoxReviewData.blindBoxReviewData,
      summary: buildReviewSummary({
        game: gameData,
        ranking: rankingData.ranking,
        winnerResult,
        recordList: gameRecordData.recordList,
        blindBoxReviewData: blindBoxReviewData.blindBoxReviewData,
      }),
    },
  };
}
