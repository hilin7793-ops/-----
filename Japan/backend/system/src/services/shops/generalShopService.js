import { randomUUID } from "node:crypto";
import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { ShopStatus, TicketStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import { recordShopAction, recordTicketAcquisition } from "../records/recordService.js";
import {
  generateTicketBatch,
  getTicketGenerationRules,
} from "../tickets/ticketGenerationService.js";

const MANUAL_REFRESH_COOLDOWN_MINUTES = 10;
const FREE_REFRESH_AFTER_DAILY_MINUTES = 10;
const DAILY_FREE_REFRESH_HOUR = 6;
const SHOP_ITEM_COUNT = 5;
const GENERAL_SHOP_PRIORITY_MINUTES = 5;

function toDate(input) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesBetween(olderTime, newerTime) {
  return Math.floor((toDate(newerTime).getTime() - toDate(olderTime).getTime()) / 60000);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getTimeParts(currentTime, timeZone = "Asia/Taipei") {
  const date = toDate(currentTime);
  assert(date, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid time input",
    detail: { currentTime },
  }));

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
}

async function getShopState(dataAccessLayer, gameId) {
  return dataAccessLayer.findOneRecord({
    collectionName: CollectionName.SHOPS,
    filterOptions: { gameId, shopType: "general" },
  });
}

function buildPriorityState({ refreshType, playerId, currentTime }) {
  if (refreshType === "manual" && playerId) {
    return {
      priorityBuyerPlayerId: playerId,
      priorityStartedAt: currentTime,
      priorityEndsAt: new Date(new Date(currentTime).getTime() + (GENERAL_SHOP_PRIORITY_MINUTES * 60000)).toISOString(),
      prioritySource: "paid_refresh",
    };
  }

  if (refreshType === "free_refresh" && playerId) {
    return {
      priorityBuyerPlayerId: playerId,
      priorityStartedAt: currentTime,
      priorityEndsAt: new Date(new Date(currentTime).getTime() + (GENERAL_SHOP_PRIORITY_MINUTES * 60000)).toISOString(),
      prioritySource: "free_refresh_effect",
    };
  }

  return {
    priorityBuyerPlayerId: null,
    priorityStartedAt: null,
    priorityEndsAt: null,
    prioritySource: "none",
  };
}

export async function getGeneralShopPriorityState({ dataAccessLayer, gameId }) {
  const shopState = await getShopState(dataAccessLayer, gameId);
  assert(shopState, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "General shop not initialized",
    detail: { gameId },
  }));

  return {
    priorityBuyerPlayerId: shopState.priorityBuyerPlayerId ?? null,
    priorityStartedAt: shopState.priorityStartedAt ?? null,
    priorityEndsAt: shopState.priorityEndsAt ?? null,
    prioritySource: shopState.prioritySource ?? "none",
  };
}

export async function setGeneralShopPriorityState({
  dataAccessLayer,
  gameId,
  priorityBuyerPlayerId,
  priorityStartedAt,
  priorityEndsAt,
  prioritySource,
}) {
  const shopState = await getShopState(dataAccessLayer, gameId);
  assert(shopState, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "General shop not initialized",
    detail: { gameId },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOPS,
    recordId: shopState.id,
    data: {
      priorityBuyerPlayerId,
      priorityStartedAt,
      priorityEndsAt,
      prioritySource,
    },
  });
}

export async function clearGeneralShopPriorityState({ dataAccessLayer, gameId }) {
  return setGeneralShopPriorityState({
    dataAccessLayer,
    gameId,
    priorityBuyerPlayerId: null,
    priorityStartedAt: null,
    priorityEndsAt: null,
    prioritySource: "none",
  });
}

async function getActiveShopItems(dataAccessLayer, gameId) {
  const items = await dataAccessLayer.listRecords({
    collectionName: CollectionName.SHOP_ITEMS,
    filterOptions: { gameId, shopType: "general", status: "listed" },
  });
  return items;
}

export async function isGeneralShopOpen({ currentTime, timeZone = "Asia/Taipei" }) {
  const { hour } = getTimeParts(currentTime, timeZone);
  return {
    isOpen: hour >= DAILY_FREE_REFRESH_HOUR,
  };
}

export async function initializeGeneralShop({ dataAccessLayer, gameId, mapId }) {
  const existingShop = await getShopState(dataAccessLayer, gameId);
  if (existingShop) {
    return existingShop;
  }

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.SHOPS,
    data: {
      id: randomUUID(),
      gameId,
      mapId,
      shopType: "general",
      status: ShopStatus[0],
      lastRefreshAt: null,
      lastRefreshType: null,
      lastDailyFreeRefreshAt: null,
      priorityBuyerPlayerId: null,
      priorityStartedAt: null,
      priorityEndsAt: null,
      prioritySource: "none",
    },
  });
}

export async function canRefreshGeneralShop({
  dataAccessLayer,
  gameId,
  playerId = null,
  currentTime,
  refreshType,
  playerCount,
  timeZone = "Asia/Taipei",
  getPlayerBlindBoxSpecialStates = null,
}) {
  const shopState = await getShopState(dataAccessLayer, gameId);
  assert(shopState, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "General shop not initialized",
    detail: { gameId },
  }));

  const { isOpen } = await isGeneralShopOpen({ currentTime, timeZone });
  if (!isOpen) {
    return { canRefresh: false, reason: "Shop closed", refreshCost: 0 };
  }

  const refreshCost = refreshType === "manual" ? 500 * playerCount : 0;
  const lastRefreshAt = shopState.lastRefreshAt;
  const timeSinceLastRefresh = lastRefreshAt ? minutesBetween(lastRefreshAt, currentTime) : Infinity;

  if (refreshType === "manual" && timeSinceLastRefresh < MANUAL_REFRESH_COOLDOWN_MINUTES) {
    return {
      canRefresh: false,
      reason: "Manual refresh cooldown",
      refreshCost,
    };
  }

  if (refreshType === "free_refresh") {
    const dailyReference = shopState.lastDailyFreeRefreshAt;
    if (timeSinceLastRefresh < MANUAL_REFRESH_COOLDOWN_MINUTES) {
      return {
        canRefresh: false,
        reason: "Free refresh cooldown",
        refreshCost: 0,
      };
    }

    if (playerId && typeof getPlayerBlindBoxSpecialStates === "function") {
      const { specialStateList } = await getPlayerBlindBoxSpecialStates({ dataAccessLayer, gameId, playerId });
      const freeRefreshState = specialStateList.find((state) => state.stateType === "free_shop_refresh_count");
      if (!freeRefreshState) {
        return {
          canRefresh: false,
          reason: "No free refresh count",
          refreshCost: 0,
        };
      }
    }

    if (dailyReference && minutesBetween(dailyReference, currentTime) < FREE_REFRESH_AFTER_DAILY_MINUTES) {
      return {
        canRefresh: false,
        reason: "Daily free refresh lock",
        refreshCost: 0,
      };
    }
  }

  if (refreshType === "daily_free") {
    const currentParts = getTimeParts(currentTime, timeZone);
    const sameLocalDay = shopState.lastDailyFreeRefreshAt
      ? (() => {
          const lastParts = getTimeParts(shopState.lastDailyFreeRefreshAt, timeZone);
          return lastParts.year === currentParts.year
            && lastParts.month === currentParts.month
            && lastParts.day === currentParts.day;
        })()
      : false;

    if (sameLocalDay) {
      return {
        canRefresh: false,
        reason: "Daily free refresh already used",
        refreshCost: 0,
      };
    }

    if (currentParts.hour !== DAILY_FREE_REFRESH_HOUR || currentParts.minute !== 0) {
      return {
        canRefresh: false,
        reason: "Not daily free refresh time",
        refreshCost: 0,
      };
    }
  }

  return {
    canRefresh: true,
    reason: null,
    refreshCost,
  };
}

export async function refreshGeneralShop({
  dataAccessLayer,
  gameId,
  playerId = null,
  refreshType,
  currentTime,
  playerCount,
  availableTransportTypes,
  mapId,
  generationRules = null,
  ruleSetName = "japan-default",
  getPlayerBlindBoxSpecialStates = null,
  consumePlayerBlindBoxSpecialState = null,
}) {
  const refreshCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId,
    playerId,
    currentTime,
    refreshType,
    playerCount,
    getPlayerBlindBoxSpecialStates,
  });

  assert(refreshCheck.canRefresh, () => new AppError({
    code: refreshCheck.reason?.includes("closed") ? ErrorCode.SHOP_CLOSED : ErrorCode.SHOP_REFRESH_COOLDOWN,
    message: refreshCheck.reason,
    detail: { gameId, playerId, refreshType },
  }));

  const activeItems = await getActiveShopItems(dataAccessLayer, gameId);
  for (const item of activeItems) {
    await dataAccessLayer.updateRecordById({
      collectionName: CollectionName.SHOP_ITEMS,
      recordId: item.id,
      data: {
        status: "removed",
        removedReason: "shop_refresh",
        removedAt: currentTime,
      },
    });
  }

  const resolvedGenerationRules = generationRules ?? await getTicketGenerationRules({ mapId, ruleSetName });
  const { ticketList } = await generateTicketBatch({
    mapId,
    count: SHOP_ITEM_COUNT,
    availableTransportTypes,
    generationRules: resolvedGenerationRules,
    now: currentTime,
  });

  const newShopTicketList = [];
  for (const ticketData of ticketList) {
    const createdTicket = await dataAccessLayer.createRecordInCollection({
      collectionName: CollectionName.TICKETS,
      data: {
        ...ticketData,
        status: TicketStatus[1],
      },
    });

    const shopItemData = await dataAccessLayer.createRecordInCollection({
      collectionName: CollectionName.SHOP_ITEMS,
      data: {
        id: randomUUID(),
        gameId,
        mapId,
        shopType: "general",
        ticketId: createdTicket.id,
        price: createdTicket.price,
        status: "listed",
        listedAt: currentTime,
      },
    });

    newShopTicketList.push({
      shopItemId: shopItemData.id,
      ticket: createdTicket,
    });
  }

  const shopUpdate = {
    lastRefreshAt: currentTime,
    lastRefreshType: refreshType,
    ...buildPriorityState({ refreshType, playerId, currentTime }),
  };

  if (refreshType === "daily_free") {
    shopUpdate.lastDailyFreeRefreshAt = currentTime;
  }

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOPS,
    recordId: (await getShopState(dataAccessLayer, gameId)).id,
    data: shopUpdate,
  });

  if (
    refreshType === "free_refresh"
    && playerId
    && typeof getPlayerBlindBoxSpecialStates === "function"
    && typeof consumePlayerBlindBoxSpecialState === "function"
  ) {
    const { specialStateList } = await getPlayerBlindBoxSpecialStates({ dataAccessLayer, gameId, playerId });
    const freeRefreshState = specialStateList.find((state) => state.stateType === "free_shop_refresh_count");
    if (freeRefreshState) {
      const remainingCount = Math.max((freeRefreshState.stateData.remainingCount ?? 1) - 1, 0);
      if (remainingCount === 0) {
        await consumePlayerBlindBoxSpecialState({
          dataAccessLayer,
          gameId,
          playerId,
          stateId: freeRefreshState.id,
          reason: "used_free_shop_refresh",
        });
      } else {
        await dataAccessLayer.updateRecordById({
          collectionName: CollectionName.PLAYER_SPECIAL_STATES,
          recordId: freeRefreshState.id,
          data: {
            stateData: {
              ...clone(freeRefreshState.stateData),
              remainingCount,
            },
          },
        });
      }
    }
  }

  await recordShopAction({
    dataAccessLayer,
    gameId,
    playerId,
    shopType: "general",
    actionType: "refresh",
    actionData: {
      refreshType,
      refreshCost: refreshCheck.refreshCost,
      refreshedAt: currentTime,
      itemCount: newShopTicketList.length,
      shopItemIdList: newShopTicketList.map((item) => item.shopItemId),
      ticketIdList: newShopTicketList.map((item) => item.ticket.id),
    },
  });

  return {
    newShopTicketList,
    refreshCost: refreshCheck.refreshCost,
    refreshedAt: currentTime,
  };
}

export async function getGeneralShopItems({ dataAccessLayer, gameId }) {
  const activeItems = await getActiveShopItems(dataAccessLayer, gameId);
  const priorityState = await getGeneralShopPriorityState({ dataAccessLayer, gameId }).catch(() => ({
    priorityBuyerPlayerId: null,
    priorityStartedAt: null,
    priorityEndsAt: null,
    prioritySource: "none",
  }));
  const shopTicketList = [];

  for (const item of activeItems) {
    const ticket = await dataAccessLayer.getRecordById({
      collectionName: CollectionName.TICKETS,
      recordId: item.ticketId,
    });
    if (ticket) {
      const listedAt = item.listedAt ? toDate(item.listedAt) : null;
      const priorityStartedAt = priorityState.priorityStartedAt ? toDate(priorityState.priorityStartedAt) : null;
      const isPriorityItem = Boolean(
        priorityState.priorityBuyerPlayerId
        && listedAt
        && priorityStartedAt
        && listedAt.getTime() === priorityStartedAt.getTime(),
      );
      shopTicketList.push({
        ...item,
        ticket,
        priorityAccess: {
          isPriorityItem,
          priorityBuyerPlayerId: isPriorityItem ? priorityState.priorityBuyerPlayerId : null,
          priorityStartedAt: isPriorityItem ? priorityState.priorityStartedAt : null,
          priorityEndsAt: isPriorityItem ? priorityState.priorityEndsAt : null,
          prioritySource: isPriorityItem ? priorityState.prioritySource : "none",
        },
      });
    }
  }

  return {
    shopTicketList,
    priorityState,
  };
}

export async function removeGeneralShopItem({ dataAccessLayer, gameId, shopItemId, reason, removedAt }) {
  const shopItem = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.SHOP_ITEMS,
    recordId: shopItemId,
  });

  assert(shopItem && shopItem.gameId === gameId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "General shop item not found",
    detail: { gameId, shopItemId },
  }));

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOP_ITEMS,
    recordId: shopItemId,
    data: {
      status: "removed",
      removedReason: reason,
      removedAt,
    },
  });
}

export async function purchaseGeneralShopTicket({
  dataAccessLayer,
  gameId,
  playerId,
  shopItemId,
  currentTime,
  canAfford,
  deductPlayerMoney,
  addTicketToPlayer,
}) {
  assert(typeof canAfford === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "canAfford dependency is required",
  }));
  assert(typeof deductPlayerMoney === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "deductPlayerMoney dependency is required",
  }));
  assert(typeof addTicketToPlayer === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "addTicketToPlayer dependency is required",
  }));

  const shopItem = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.SHOP_ITEMS,
    recordId: shopItemId,
  });

  assert(
    shopItem && shopItem.gameId === gameId && shopItem.status === "listed",
    () => new AppError({
      code: ErrorCode.NOT_FOUND,
      message: "Shop item no longer available",
      detail: { gameId, shopItemId },
    }),
  );

  const priorityState = await getGeneralShopPriorityState({ dataAccessLayer, gameId });
  const priorityStartedAt = priorityState.priorityStartedAt ? toDate(priorityState.priorityStartedAt) : null;
  const priorityEndsAt = priorityState.priorityEndsAt ? toDate(priorityState.priorityEndsAt) : null;
  const itemListedAt = shopItem.listedAt ? toDate(shopItem.listedAt) : null;
  const purchaseTime = toDate(currentTime);
  const isPriorityWindowActive = priorityState.priorityBuyerPlayerId
    && priorityStartedAt
    && priorityEndsAt
    && purchaseTime
    && purchaseTime >= priorityStartedAt
    && purchaseTime < priorityEndsAt;
  const isPriorityItem = isPriorityWindowActive
    && itemListedAt
    && itemListedAt.getTime() === priorityStartedAt.getTime();

  assert(
    !(isPriorityItem && priorityState.priorityBuyerPlayerId !== playerId),
    () => new AppError({
      code: ErrorCode.FORBIDDEN,
      message: "Shop item is currently reserved for the refresh owner",
      detail: {
        gameId,
        playerId,
        shopItemId,
        priorityBuyerPlayerId: priorityState.priorityBuyerPlayerId,
        priorityEndsAt: priorityState.priorityEndsAt,
      },
    }),
  );

  const affordability = await canAfford({
    gameId,
    playerId,
    amount: shopItem.price,
  });

  assert(affordability.canAfford, () => new AppError({
    code: ErrorCode.MONEY_NOT_ENOUGH,
    message: "Player cannot afford shop ticket",
    detail: { gameId, playerId, shopItemId, price: shopItem.price },
  }));

  const updatedMoney = await deductPlayerMoney({
    gameId,
    playerId,
    amount: shopItem.price,
    reason: "purchase_general_shop_ticket",
  });

  await addTicketToPlayer({
    gameId,
    playerId,
    ticketId: shopItem.ticketId,
    source: "general_shop_purchase",
  });

  const purchasedItem = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOP_ITEMS,
    recordId: shopItemId,
    data: {
      status: "purchased",
      purchasedBy: playerId,
      purchasedAt: currentTime,
    },
  });

  const purchasedTicket = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: shopItem.ticketId,
    data: {
      status: TicketStatus[3],
      ownerPlayerId: playerId,
      acquiredAt: currentTime,
      acquiredSource: "general_shop_purchase",
    },
  });

  await recordShopAction({
    dataAccessLayer,
    gameId,
    playerId,
    shopType: "general",
    actionType: "purchase",
    actionData: {
      shopItemId,
      ticketId: purchasedTicket.id,
      price: shopItem.price,
      purchasedAt: currentTime,
    },
  });

  await recordTicketAcquisition({
    dataAccessLayer,
    gameId,
    playerId,
    ticketId: purchasedTicket.id,
    source: "general_shop_purchase",
    sourceDetail: {
      shopItemId,
      price: shopItem.price,
      purchasedAt: currentTime,
    },
  });

  return {
    success: true,
    purchasedTicket,
    purchasedItem,
    updatedMoney,
  };
}
