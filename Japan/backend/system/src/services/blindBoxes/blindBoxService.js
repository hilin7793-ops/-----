import { randomUUID } from "node:crypto";
import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import {
  BlindBoxEffectType,
  BlindBoxSpecialStateType,
  BlindBoxStatus,
  GameStatus,
} from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import { getTicketGenerationRules, generateRandomTicket, destroyTicket } from "../tickets/ticketGenerationService.js";
import { addPlayerMoney, deductPlayerMoney, addTicketToPlayer, getPlayerTickets } from "../players/playerService.js";
import { recordBlindBoxAction } from "../records/recordService.js";
import { getGeneralShopItems, removeGeneralShopItem } from "../shops/generalShopService.js";
import { filterBlindBoxDataByVisibility as filterBlindBoxVisibility } from "../visibility/visibilityService.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDataAccessLayer(dataAccessLayer) {
  assert(dataAccessLayer, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "dataAccessLayer is required",
  }));
}

async function getGameForBlindBox(dataAccessLayer, gameId) {
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

async function assertBlindBoxEditableGame(dataAccessLayer, gameId) {
  const gameData = await getGameForBlindBox(dataAccessLayer, gameId);
  assert(gameData.status !== GameStatus[1] && gameData.status !== GameStatus[2], () => new AppError({
    code: ErrorCode.GAME_ALREADY_STARTED,
    message: "Blind boxes can only be managed before game start",
    detail: { gameId, status: gameData.status },
  }));
}

function assertValidEffectType(effectType) {
  assert(BlindBoxEffectType.includes(effectType), () => new AppError({
    code: ErrorCode.BLIND_BOX_EFFECT_INVALID,
    message: "Unsupported blind box effect type",
    detail: { effectType },
  }));
}

function validateMoneyEffect(effectData) {
  const supportedOperators = ["+=", "-=", "*=", "/=", "="];
  assert(
    supportedOperators.includes(effectData.operator) && typeof effectData.value === "number",
    () => new AppError({
      code: ErrorCode.BLIND_BOX_EFFECT_INVALID,
      message: "Invalid money effect definition",
      detail: { effectData },
    }),
  );
}

function validateConditionalEffect(effectData) {
  assert(effectData.conditionData && effectData.thenEffectData, () => new AppError({
    code: ErrorCode.BLIND_BOX_EFFECT_INVALID,
    message: "Conditional effect requires conditionData and thenEffectData",
    detail: { effectData },
  }));
}

async function getGameAndMapData(dataAccessLayer, gameId) {
  const gameData = await getGameForBlindBox(dataAccessLayer, gameId);
  const mapData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.MAPS,
    recordId: gameData.mapId,
  });

  return { gameData, mapData };
}

export async function validateBlindBoxEffect({ effectData }) {
  assert(effectData && typeof effectData === "object", () => new AppError({
    code: ErrorCode.BLIND_BOX_EFFECT_INVALID,
    message: "effectData is required",
  }));

  assertValidEffectType(effectData.effectType);

  if (effectData.effectType === "money") {
    validateMoneyEffect(effectData);
  }

  if (effectData.effectType === "gain_free_shop_refresh") {
    assert(Number.isInteger(effectData.freeRefreshCount) && effectData.freeRefreshCount > 0, () => new AppError({
      code: ErrorCode.BLIND_BOX_EFFECT_INVALID,
      message: "freeRefreshCount must be a positive integer",
      detail: { effectData },
    }));
  }

  if (effectData.effectType === "conditional") {
    validateConditionalEffect(effectData);
  }

  return {
    isValid: true,
    reasonList: [],
  };
}

export async function createBlindBox({
  dataAccessLayer,
  gameId,
  locationId,
  effectData,
  createdBy,
}) {
  assertDataAccessLayer(dataAccessLayer);
  await assertBlindBoxEditableGame(dataAccessLayer, gameId);
  await validateBlindBoxEffect({ effectData });

  const blindBoxData = {
    id: randomUUID(),
    gameId,
    locationId,
    effectData: clone(effectData),
    status: BlindBoxStatus[0],
    openedStatus: false,
    openedBy: null,
    openedAt: null,
    createdBy,
    createdAt: new Date().toISOString(),
  };

  const createdBlindBox = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.BLIND_BOXES,
    data: blindBoxData,
  });

  await recordBlindBoxAction({
    dataAccessLayer,
    gameId,
    playerId: createdBy ?? null,
    blindBoxId: createdBlindBox.id,
    actionType: "create",
    actionData: {
      locationId,
      effectData: clone(effectData),
      createdBy,
    },
  });

  return createdBlindBox;
}

export async function createBlindBoxBatch({
  dataAccessLayer,
  gameId,
  blindBoxConfigList,
  createdBy,
}) {
  assert(Array.isArray(blindBoxConfigList) && blindBoxConfigList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "blindBoxConfigList must be a non-empty array",
  }));

  const blindBoxList = [];
  for (const config of blindBoxConfigList) {
    const blindBoxData = await createBlindBox({
      dataAccessLayer,
      gameId,
      locationId: config.locationId,
      effectData: config.effectData,
      createdBy,
    });
    blindBoxList.push(blindBoxData);
  }

  return { blindBoxList };
}

export async function getBlindBox({
  dataAccessLayer,
  gameId,
  blindBoxId,
  requesterId = null,
  visibilityMode = "player",
}) {
  assertDataAccessLayer(dataAccessLayer);
  const blindBoxData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: blindBoxId,
  });

  assert(blindBoxData && blindBoxData.gameId === gameId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Blind box not found",
    detail: { gameId, blindBoxId, requesterId },
  }));

  return filterBlindBoxVisibility({
    dataAccessLayer,
    gameId,
    requesterId,
    blindBoxData,
    visibilityMode,
  });
}

export async function listBlindBoxes({
  dataAccessLayer,
  gameId,
  requesterId = null,
  visibilityMode = "player",
  filterOptions = {},
  queryOptions = {},
}) {
  assertDataAccessLayer(dataAccessLayer);
  const {
    openedStatus,
    ...recordFilterOptions
  } = filterOptions;

  const blindBoxList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.BLIND_BOXES,
    filterOptions: { gameId, ...recordFilterOptions },
    queryOptions,
  });

  return {
    blindBoxList: await Promise.all(blindBoxList
      .filter((blindBoxData) => {
        if (openedStatus === true && blindBoxData.openedStatus !== true) {
          return false;
        }

        if (openedStatus === false && blindBoxData.openedStatus === true) {
          return false;
        }

        return true;
      })
      .map((blindBoxData) =>
        filterBlindBoxVisibility({
          dataAccessLayer,
          gameId,
          requesterId,
          blindBoxData,
          visibilityMode,
        }))),
  };
}

export async function updateBlindBox({
  dataAccessLayer,
  gameId,
  blindBoxId,
  locationId,
  effectData,
  updatedBy,
}) {
  assertDataAccessLayer(dataAccessLayer);
  await assertBlindBoxEditableGame(dataAccessLayer, gameId);

  const blindBoxData = await getBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
    visibilityMode: "admin",
  });

  assert(!blindBoxData.openedStatus, () => new AppError({
    code: ErrorCode.BLIND_BOX_ALREADY_OPENED,
    message: "Opened blind box cannot be updated",
    detail: { gameId, blindBoxId },
  }));

  if (effectData !== undefined) {
    await validateBlindBoxEffect({ effectData });
  }

  const updatedBlindBox = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: blindBoxId,
    data: {
      ...(locationId !== undefined ? { locationId } : {}),
      ...(effectData !== undefined ? { effectData: clone(effectData) } : {}),
      updatedBy,
      updatedAt: new Date().toISOString(),
    },
  });

  await recordBlindBoxAction({
    dataAccessLayer,
    gameId,
    playerId: updatedBy ?? null,
    blindBoxId,
    actionType: "update",
    actionData: {
      locationId: locationId ?? blindBoxData.locationId,
      effectData: effectData !== undefined ? clone(effectData) : clone(blindBoxData.effectData),
      updatedBy,
    },
  });

  return updatedBlindBox;
}

export async function updateBlindBoxBatch({
  dataAccessLayer,
  gameId,
  blindBoxUpdateList,
  updatedBy,
}) {
  assert(Array.isArray(blindBoxUpdateList) && blindBoxUpdateList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "blindBoxUpdateList must be a non-empty array",
    detail: { gameId },
  }));

  const blindBoxList = [];
  for (const updateItem of blindBoxUpdateList) {
    blindBoxList.push(await updateBlindBox({
      dataAccessLayer,
      gameId,
      blindBoxId: updateItem.blindBoxId,
      locationId: updateItem.locationId,
      effectData: updateItem.effectData,
      updatedBy: updateItem.updatedBy ?? updatedBy,
    }));
  }

  return {
    success: true,
    updatedCount: blindBoxList.length,
    blindBoxList,
  };
}

export async function deleteBlindBox({
  dataAccessLayer,
  gameId,
  blindBoxId,
  deletedBy,
}) {
  assertDataAccessLayer(dataAccessLayer);
  await assertBlindBoxEditableGame(dataAccessLayer, gameId);

  const blindBoxData = await getBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
    visibilityMode: "admin",
  });

  assert(!blindBoxData.openedStatus, () => new AppError({
    code: ErrorCode.BLIND_BOX_ALREADY_OPENED,
    message: "Opened blind box cannot be deleted",
    detail: { gameId, blindBoxId },
  }));

  const success = await dataAccessLayer.deleteRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: blindBoxId,
  });

  if (success) {
    await recordBlindBoxAction({
      dataAccessLayer,
      gameId,
      playerId: deletedBy ?? null,
      blindBoxId,
      actionType: "delete",
      actionData: {
        locationId: blindBoxData.locationId,
        deletedBy,
      },
    });
  }

  return {
    success,
    deletedBlindBoxId: success ? blindBoxId : null,
    deletedBy,
  };
}

export async function deleteBlindBoxBatch({
  dataAccessLayer,
  gameId,
  blindBoxIdList,
  deletedBy,
}) {
  assert(Array.isArray(blindBoxIdList) && blindBoxIdList.length > 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "blindBoxIdList must be a non-empty array",
    detail: { gameId },
  }));

  const resultList = [];
  for (const blindBoxId of blindBoxIdList) {
    resultList.push(await deleteBlindBox({
      dataAccessLayer,
      gameId,
      blindBoxId,
      deletedBy,
    }));
  }

  return {
    success: true,
    deletedCount: resultList.filter((item) => item.success).length,
    resultList,
  };
}

export async function getPublicBlindBoxInfo({
  dataAccessLayer,
  gameId,
  queryOptions = {},
}) {
  const { blindBoxList } = await listBlindBoxes({
    dataAccessLayer,
    gameId,
    visibilityMode: "player",
    queryOptions,
  });

  return {
    publicBlindBoxList: blindBoxList.map((blindBoxData) => ({
      blindBoxId: blindBoxData.id,
      locationId: blindBoxData.locationId,
      openedStatus: blindBoxData.openedStatus,
    })),
  };
}

export async function validateBlindBoxSetup({
  dataAccessLayer,
  gameId,
  blindBoxConfigList,
  locationExists,
}) {
  assert(Array.isArray(blindBoxConfigList), () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "blindBoxConfigList must be an array",
  }));

  const reasonList = [];
  const uniqueKeys = new Set();

  for (const [index, config] of blindBoxConfigList.entries()) {
    if (!config.locationId) {
      reasonList.push(`blindBoxConfigList[${index}] missing locationId`);
    }

    if (!config.effectData) {
      reasonList.push(`blindBoxConfigList[${index}] missing effectData`);
    }

    if (config.locationId) {
      const locationKey = `${gameId}:${config.locationId}`;
      if (uniqueKeys.has(locationKey)) {
        reasonList.push(`blindBoxConfigList[${index}] duplicated locationId`);
      }
      uniqueKeys.add(locationKey);
    }

    if (config.effectData) {
      try {
        await validateBlindBoxEffect({ effectData: config.effectData });
      } catch (error) {
        reasonList.push(error.message);
      }
    }

    if (typeof locationExists === "function" && config.locationId) {
      const exists = await locationExists({ gameId, locationId: config.locationId });
      if (!exists) {
        reasonList.push(`blindBoxConfigList[${index}] location does not exist`);
      }
    } else if (dataAccessLayer && config.locationId) {
      const locationData = await dataAccessLayer.getRecordById({
        collectionName: CollectionName.LOCATIONS,
        recordId: config.locationId,
      });
      if (!locationData) {
        reasonList.push(`blindBoxConfigList[${index}] location does not exist`);
      }
    }
  }

  if (dataAccessLayer) {
    const gameData = await getGameForBlindBox(dataAccessLayer, gameId);
    if (gameData.status !== GameStatus[0]) {
      reasonList.push("blind boxes must be finalized before game start");
    }
  }

  return {
    isValid: reasonList.length === 0,
    reasonList,
  };
}

export async function canOpenBlindBox({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  currentTime,
  getPlayerLocation,
  getGame,
}) {
  assert(typeof getPlayerLocation === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "getPlayerLocation dependency is required",
  }));

  const blindBoxData = await getBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
    visibilityMode: "admin",
  });

  if (typeof getGame === "function") {
    const gameData = await getGame({ gameId });
    if (gameData?.status !== GameStatus[1]) {
      return {
        canOpen: false,
        reason: "Game has not started",
        checkedAt: currentTime,
      };
    }
  }

  if (blindBoxData.openedStatus || blindBoxData.status === "opened" || blindBoxData.status === "removed") {
    return {
      canOpen: false,
      reason: "Blind box already opened",
      checkedAt: currentTime,
    };
  }

  const playerLocation = await getPlayerLocation({ gameId, playerId });
  if (playerLocation !== blindBoxData.locationId) {
    return {
      canOpen: false,
      reason: "Player location mismatch",
      checkedAt: currentTime,
    };
  }

  return {
    canOpen: true,
    reason: null,
    checkedAt: currentTime,
  };
}

export async function markBlindBoxAsOpened({
  dataAccessLayer,
  gameId,
  blindBoxId,
  playerId,
  openedAt,
}) {
  const blindBoxData = await getBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
    visibilityMode: "admin",
  });

  assert(!(blindBoxData.openedStatus || blindBoxData.status === "opened"), () => new AppError({
    code: ErrorCode.BLIND_BOX_ALREADY_OPENED,
    message: "Blind box already opened",
    detail: { gameId, blindBoxId },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: blindBoxId,
    data: {
      status: "opened",
      openedStatus: true,
      openedBy: playerId,
      openedAt,
    },
  });
}

export async function removeOpenedBlindBox({ dataAccessLayer, gameId, blindBoxId }) {
  const blindBoxData = await getBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
    visibilityMode: "admin",
  });

  assert(blindBoxData.openedStatus, () => new AppError({
    code: ErrorCode.BLIND_BOX_NOT_AVAILABLE,
    message: "Blind box must be opened before removal",
    detail: { gameId, blindBoxId },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.BLIND_BOXES,
    recordId: blindBoxId,
    data: {
      status: "removed",
      removedAt: new Date().toISOString(),
    },
  });
}

export async function addPlayerBlindBoxSpecialState({
  dataAccessLayer,
  gameId,
  playerId,
  stateType,
  stateData,
  sourceBlindBoxId,
}) {
  assert(BlindBoxSpecialStateType.includes(stateType), () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Unknown blind box special state type",
    detail: { stateType },
  }));

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      id: randomUUID(),
      gameId,
      playerId,
      stateType,
      stateData: clone(stateData),
      sourceBlindBoxId,
      isConsumed: false,
      createdAt: new Date().toISOString(),
      consumedAt: null,
    },
  });
}

export async function executeMoneyEffect({
  dataAccessLayer,
  gameId,
  playerId,
  operator,
  value,
}) {
  const { money: oldMoney } = await getPlayerMoneyLike({ dataAccessLayer, gameId, playerId });
  let newMoney = oldMoney;

  if (operator === "+=") newMoney = oldMoney + value;
  if (operator === "-=") newMoney = oldMoney - value;
  if (operator === "*=") newMoney = oldMoney * value;
  if (operator === "/=") newMoney = value === 0 ? oldMoney : Math.floor(oldMoney / value);
  if (operator === "=") newMoney = value;

  newMoney = Math.max(0, Math.round(newMoney));

  if (newMoney >= oldMoney) {
    await addPlayerMoney({
      dataAccessLayer,
      gameId,
      playerId,
      amount: newMoney - oldMoney,
      reason: "blind_box_money_effect",
    });
  } else {
    await deductPlayerMoney({
      dataAccessLayer,
      gameId,
      playerId,
      amount: oldMoney - newMoney,
      reason: "blind_box_money_effect",
    });
  }

  return {
    oldMoney,
    newMoney,
    moneyChange: newMoney - oldMoney,
  };
}

async function getPlayerMoneyLike({ dataAccessLayer, gameId, playerId }) {
  const gamePlayer = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.GAME_PLAYERS,
    filterOptions: { gameId, playerId },
  });

  assert(gamePlayer, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Game player record not found",
    detail: { gameId, playerId },
  }));

  return { money: gamePlayer.money ?? 0, gamePlayer };
}

export async function executeRandomTicketGainEffect({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const { gameData, mapData } = await getGameAndMapData(dataAccessLayer, gameId);
  const generationRules = await getTicketGenerationRules({ mapId: gameData.mapId });
  const ticketData = await generateRandomTicket({
    mapId: gameData.mapId,
    availableTransportTypes: mapData?.availableTransportTypes ?? [],
    generationRules,
  });

  const createdTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      ...ticketData,
      status: "owned",
      ownerPlayerId: playerId,
      acquiredAt: new Date().toISOString(),
      acquiredSource: "blind_box_gain_random_ticket",
    },
  });

  await addTicketToPlayer({
    dataAccessLayer,
    gameId,
    playerId,
    ticketId: createdTicket.id,
    source: "blind_box_gain_random_ticket",
  });

  return {
    gainedTicketData: createdTicket,
  };
}

export async function executeRandomTicketLossEffect({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const { ticketList } = await getPlayerTickets({ dataAccessLayer, gameId, playerId });
  const ownedTicketEntry = ticketList.find((entry) => entry.ticket?.status !== "reserved");

  if (!ownedTicketEntry?.ticket) {
    return {
      lostTicketData: null,
      effectApplied: false,
    };
  }

  await destroyTicket({
    dataAccessLayer,
    ticketId: ownedTicketEntry.ticket.id,
    reason: "blind_box_random_ticket_loss",
  });

  return {
    lostTicketData: ownedTicketEntry.ticket,
    effectApplied: true,
  };
}

export async function executeFreeShopTicketEffect({
  dataAccessLayer,
  gameId,
  playerId,
}) {
  const { shopTicketList } = await getGeneralShopItems({ dataAccessLayer, gameId });
  const selectedItem = shopTicketList[0] ?? null;

  if (!selectedItem?.ticket) {
    return {
      gainedTicketData: null,
      removedShopItemData: null,
      effectApplied: false,
    };
  }

  await addTicketToPlayer({
    dataAccessLayer,
    gameId,
    playerId,
    ticketId: selectedItem.ticket.id,
    source: "blind_box_gain_shop_ticket",
  });

  const updatedTicket = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: selectedItem.ticket.id,
    data: {
      status: "owned",
      ownerPlayerId: playerId,
      acquiredAt: new Date().toISOString(),
      acquiredSource: "blind_box_gain_shop_ticket",
    },
  });

  const removedShopItemData = await removeGeneralShopItem({
    dataAccessLayer,
    gameId,
    shopItemId: selectedItem.id ?? selectedItem.shopItemId,
    reason: "blind_box_gain_shop_ticket",
    removedAt: new Date().toISOString(),
  });

  return {
    gainedTicketData: updatedTicket,
    removedShopItemData,
    effectApplied: true,
  };
}

export async function executeFreeShopRefreshEffect({
  dataAccessLayer,
  gameId,
  playerId,
  freeRefreshCount,
  blindBoxId,
}) {
  const state = await addPlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId,
    playerId,
    stateType: "free_shop_refresh_count",
    stateData: { remainingCount: freeRefreshCount },
    sourceBlindBoxId: blindBoxId,
  });

  return {
    updatedFreeRefreshCount: freeRefreshCount,
    specialStateData: state,
  };
}

export async function executeGainNextAuctionBidPoolEffect({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
}) {
  const state = await addPlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId,
    playerId,
    stateType: "next_auction_bid_pool_reward",
    stateData: {},
    sourceBlindBoxId: blindBoxId,
  });

  return {
    playerSpecialState: state,
  };
}

export async function evaluateBlindBoxCondition({
  dataAccessLayer,
  gameId,
  playerId,
  conditionData,
}) {
  const { money } = await getPlayerMoneyLike({ dataAccessLayer, gameId, playerId });
  let evaluatedValue = null;
  let conditionMatched = false;

  if (conditionData?.field === "money") {
    evaluatedValue = money;
    if (conditionData.operator === ">") conditionMatched = money > conditionData.value;
    if (conditionData.operator === ">=") conditionMatched = money >= conditionData.value;
    if (conditionData.operator === "<") conditionMatched = money < conditionData.value;
    if (conditionData.operator === "<=") conditionMatched = money <= conditionData.value;
    if (conditionData.operator === "===") conditionMatched = money === conditionData.value;
  }

  return {
    conditionMatched,
    evaluatedValue,
  };
}

export async function executeConditionalBlindBoxEffect({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  conditionData,
  thenEffectData,
  elseEffectData = null,
}) {
  const { conditionMatched, evaluatedValue } = await evaluateBlindBoxCondition({
    dataAccessLayer,
    gameId,
    playerId,
    conditionData,
  });

  const executedEffect = conditionMatched ? thenEffectData : elseEffectData;
  if (!executedEffect) {
    return {
      conditionMatched,
      executedEffect: null,
      effectResult: { effectApplied: false, evaluatedValue },
    };
  }

  const effectResult = await executeBlindBoxEffect({
    dataAccessLayer,
    gameId,
    playerId,
    blindBoxId,
    effectData: executedEffect,
  });

  return {
    conditionMatched,
    executedEffect,
    effectResult: {
      ...effectResult,
      evaluatedValue,
    },
  };
}

export async function executeBlindBoxEffect({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  effectData,
}) {
  assertDataAccessLayer(dataAccessLayer);
  await validateBlindBoxEffect({ effectData });

  if (effectData.effectType === "money") {
    return {
      effectType: effectData.effectType,
      effectApplied: true,
      ...(await executeMoneyEffect({
        dataAccessLayer,
        gameId,
        playerId,
        operator: effectData.operator,
        value: effectData.value,
      })),
    };
  }

  if (effectData.effectType === "gain_random_ticket") {
    return {
      effectType: effectData.effectType,
      effectApplied: true,
      ...(await executeRandomTicketGainEffect({ dataAccessLayer, gameId, playerId })),
    };
  }

  if (effectData.effectType === "lose_random_ticket") {
    return {
      effectType: effectData.effectType,
      ...(await executeRandomTicketLossEffect({ dataAccessLayer, gameId, playerId })),
    };
  }

  if (effectData.effectType === "gain_shop_ticket") {
    return {
      effectType: effectData.effectType,
      ...(await executeFreeShopTicketEffect({ dataAccessLayer, gameId, playerId })),
    };
  }

  if (effectData.effectType === "gain_next_auction_bid_pool") {
    return {
      effectType: effectData.effectType,
      effectApplied: true,
      ...(await executeGainNextAuctionBidPoolEffect({ dataAccessLayer, gameId, playerId, blindBoxId })),
    };
  }

  if (effectData.effectType === "gain_free_shop_refresh") {
    return {
      effectType: effectData.effectType,
      effectApplied: true,
      ...(await executeFreeShopRefreshEffect({
        dataAccessLayer,
        gameId,
        playerId,
        freeRefreshCount: effectData.freeRefreshCount,
        blindBoxId,
      })),
    };
  }

  if (effectData.effectType === "conditional") {
    return {
      effectType: effectData.effectType,
      effectApplied: true,
      ...(await executeConditionalBlindBoxEffect({
        dataAccessLayer,
        gameId,
        playerId,
        blindBoxId,
        conditionData: effectData.conditionData,
        thenEffectData: effectData.thenEffectData,
        elseEffectData: effectData.elseEffectData,
      })),
    };
  }

  return {
    effectType: effectData.effectType,
    effectApplied: false,
    message: "No matching blind box effect executor",
  };
}

export async function getPlayerBlindBoxSpecialStates({
  dataAccessLayer,
  gameId,
  playerId,
  filterOptions = {},
  queryOptions = {},
}) {
  const {
    stateType,
    createdAtAfter,
    createdAtBefore,
    ...specialStateFilterOptions
  } = filterOptions;

  const specialStateList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    filterOptions: {
      gameId,
      playerId,
      isConsumed: false,
      ...specialStateFilterOptions,
    },
    queryOptions,
  });

  return {
    specialStateList: specialStateList.filter((state) => {
      if (stateType && state.stateType !== stateType) {
        return false;
      }

      const stateCreatedAt = state.createdAt ? new Date(state.createdAt).getTime() : null;
      const createdAtAfterTime = createdAtAfter ? new Date(createdAtAfter).getTime() : null;
      const createdAtBeforeTime = createdAtBefore ? new Date(createdAtBefore).getTime() : null;

      if (createdAtAfterTime !== null && (stateCreatedAt === null || stateCreatedAt < createdAtAfterTime)) {
        return false;
      }

      if (createdAtBeforeTime !== null && (stateCreatedAt === null || stateCreatedAt > createdAtBeforeTime)) {
        return false;
      }

      return true;
    }),
  };
}

export async function consumePlayerBlindBoxSpecialState({
  dataAccessLayer,
  gameId,
  playerId,
  stateId,
  reason,
}) {
  const stateData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    recordId: stateId,
  });

  assert(
    stateData && stateData.gameId === gameId && stateData.playerId === playerId && !stateData.isConsumed,
    () => new AppError({
      code: ErrorCode.SPECIAL_STATE_NOT_FOUND,
      message: "Blind box special state not found",
      detail: { gameId, playerId, stateId },
    }),
  );

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    recordId: stateId,
    data: {
      isConsumed: true,
      consumedAt: new Date().toISOString(),
      consumeReason: reason,
    },
  });
}

export async function recordBlindBoxEffectLogAction({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  actionType,
  actionData,
}) {
  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.BLIND_BOX_EFFECT_LOGS,
    data: {
      id: randomUUID(),
      gameId,
      blindBoxId,
      playerId,
      actionType,
      actionData: clone(actionData),
      createdAt: new Date().toISOString(),
    },
  });
}

export async function getBlindBoxReviewData({
  dataAccessLayer,
  gameId,
  blindBoxFilterOptions = {},
  blindBoxEffectLogFilterOptions = {},
  recordFilterOptions = {},
  queryOptions = {},
}) {
  const blindBoxList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.BLIND_BOXES,
    filterOptions: { gameId, ...blindBoxFilterOptions },
    queryOptions: queryOptions.blindBoxList ?? queryOptions,
  });
  const blindBoxEffectLogList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.BLIND_BOX_EFFECT_LOGS,
    filterOptions: { gameId, ...blindBoxEffectLogFilterOptions },
    queryOptions: queryOptions.blindBoxEffectLogList ?? queryOptions,
  });
  const recordList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.RECORDS,
    filterOptions: { gameId, ...recordFilterOptions },
    queryOptions: queryOptions.recordList ?? queryOptions,
  });

  return {
    blindBoxReviewData: {
      blindBoxList,
      blindBoxEffectLogList,
      recordList,
    },
  };
}

export async function filterBlindBoxDataByVisibility({
  dataAccessLayer,
  gameId,
  requesterId,
  blindBoxData,
  visibilityMode,
}) {
  return filterBlindBoxVisibility({
    dataAccessLayer,
    gameId,
    requesterId,
    blindBoxData: {
      ...blindBoxData,
      gameId,
      requesterId,
    },
    visibilityMode,
  });
}

export async function openBlindBox({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  currentTime,
  getPlayerLocation,
  getGame,
  executeBlindBoxEffect,
}) {
  const openCheck = await canOpenBlindBox({
    dataAccessLayer,
    gameId,
    playerId,
    blindBoxId,
    currentTime,
    getPlayerLocation,
    getGame,
  });

  assert(openCheck.canOpen, () => new AppError({
    code: openCheck.reason === "Player location mismatch"
      ? ErrorCode.PLAYER_LOCATION_MISMATCH
      : ErrorCode.BLIND_BOX_NOT_AVAILABLE,
    message: openCheck.reason,
    detail: { gameId, playerId, blindBoxId },
  }));

  const openedBlindBoxData = await markBlindBoxAsOpened({
    dataAccessLayer,
    gameId,
    blindBoxId,
    playerId,
    openedAt: currentTime,
  });

  const effectExecutor = typeof executeBlindBoxEffect === "function"
    ? executeBlindBoxEffect
    : async (input) => executeBlindBoxEffectDefault({ dataAccessLayer, ...input });

  const effectResult = await effectExecutor({
        gameId,
        playerId,
        blindBoxId,
        effectData: openedBlindBoxData.effectData,
      });

  await removeOpenedBlindBox({
    dataAccessLayer,
    gameId,
    blindBoxId,
  });

  await recordBlindBoxEffectLogAction({
    dataAccessLayer,
    gameId,
    playerId,
    blindBoxId,
    actionType: "open_blind_box",
    actionData: {
      openedAt: currentTime,
      effectResult,
    },
  });

  await recordBlindBoxAction({
    dataAccessLayer,
    gameId,
    playerId,
    blindBoxId,
    actionType: "open",
    actionData: {
      openedAt: currentTime,
      effectResult,
    },
  });

  return {
    success: true,
    openedBlindBoxData,
    effectResult,
  };
}

async function executeBlindBoxEffectDefault({
  dataAccessLayer,
  gameId,
  playerId,
  blindBoxId,
  effectData,
}) {
  return executeBlindBoxEffect({
    dataAccessLayer,
    gameId,
    playerId,
    blindBoxId,
    effectData,
  });
}
