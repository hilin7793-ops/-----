import { CollectionName } from "../../constants/collectionNames.js";
import { filterRecordDataByVisibility } from "../visibility/visibilityService.js";

export async function createRecord({
  dataAccessLayer,
  gameId,
  playerId = null,
  recordType,
  action,
  payload = {},
  createdAt = new Date().toISOString(),
}) {
  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.RECORDS,
    data: {
      gameId,
      playerId,
      recordType,
      action,
      payload,
      createdAt,
    },
  });
}

export async function recordPlayerAction({
  dataAccessLayer,
  gameId,
  playerId,
  actionType,
  actionData = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "player_action",
    action: actionType,
    payload: actionData,
  });
}

export async function recordShopAction({
  dataAccessLayer,
  gameId,
  playerId = null,
  shopType,
  actionType,
  actionData = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "shop_action",
    action: `${shopType}:${actionType}`,
    payload: actionData,
  });
}

export async function recordTicketAcquisition({
  dataAccessLayer,
  gameId,
  playerId,
  ticketId,
  source,
  sourceDetail = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "ticket_acquisition",
    action: source,
    payload: {
      ticketId,
      sourceDetail,
    },
  });
}

export async function recordTicketUsage({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  ticketIdList,
  usedAt,
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "ticket_usage",
    action: "consume_tickets",
    payload: {
      journeyId,
      ticketIdList,
      usedAt,
    },
  });
}

export async function recordJourney({
  dataAccessLayer,
  gameId,
  playerId,
  journeyId,
  journeyAction,
  journeyData = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "journey",
    action: journeyAction,
    payload: {
      journeyId,
      ...journeyData,
    },
  });
}

export async function recordTrafficIncidentRequest({
  dataAccessLayer,
  gameId,
  playerId,
  requestId,
  requestAction,
  requestData = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "traffic_incident",
    action: requestAction,
    payload: {
      requestId,
      ...requestData,
    },
  });
}

export async function recordBlindBoxAction({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  actionType,
  actionData = {},
}) {
  return createRecord({
    dataAccessLayer,
    gameId,
    playerId,
    recordType: "blind_box",
    action: actionType,
    payload: {
      blindBoxId,
      ...actionData,
    },
  });
}

export async function getPlayerRecords({
  dataAccessLayer,
  gameId,
  playerId,
  visibilityMode = "during_game",
  filterOptions = {},
  queryOptions = {},
}) {
  const recordList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.RECORDS,
    filterOptions: {
      gameId,
      playerId,
      ...filterOptions,
    },
    queryOptions,
  });

  const filteredRecordList = [];
  for (const recordData of recordList) {
    filteredRecordList.push(await filterRecordDataByVisibility({
      dataAccessLayer,
      gameId,
      requestingPlayerId: playerId,
      recordData,
      visibilityMode,
    }));
  }

  return { recordList: filteredRecordList };
}

export async function getGameRecords({
  dataAccessLayer,
  gameId,
  visibilityMode = "post_game_review",
  filterOptions = {},
  queryOptions = {},
}) {
  const recordList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.RECORDS,
    filterOptions: {
      gameId,
      ...filterOptions,
    },
    queryOptions,
  });

  const filteredRecordList = [];
  for (const recordData of recordList) {
    filteredRecordList.push(await filterRecordDataByVisibility({
      dataAccessLayer,
      gameId,
      requestingPlayerId: null,
      recordData,
      visibilityMode,
    }));
  }

  return { recordList: filteredRecordList };
}

export async function getPublicRecordsDuringGame({
  dataAccessLayer,
  gameId,
  requestingPlayerId,
  queryOptions = {},
}) {
  return getGameRecords({
    dataAccessLayer,
    gameId,
    visibilityMode: "during_game",
    filterOptions: {},
    queryOptions,
  }).then(async ({ recordList }) => ({
    publicRecordList: await Promise.all(recordList.map((recordData) =>
      filterRecordDataByVisibility({
        dataAccessLayer,
        gameId,
        requestingPlayerId,
        recordData,
        visibilityMode: "during_game",
      }),
    )),
  }));
}

export async function getPostGameReviewData({ dataAccessLayer, gameId }) {
  const { recordList } = await getGameRecords({
    dataAccessLayer,
    gameId,
    visibilityMode: "post_game_review",
  });

  return {
    reviewData: {
      recordList,
    },
  };
}
