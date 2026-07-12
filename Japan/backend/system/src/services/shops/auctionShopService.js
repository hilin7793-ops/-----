import { randomUUID } from "node:crypto";
import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { AuctionStatus, TicketStatus } from "../../constants/statuses.js";
import { AppError, assert } from "../../lib/appError.js";
import { recordShopAction, recordTicketAcquisition } from "../records/recordService.js";
import {
  calculateAuctionTicketRating,
  generateRandomTicket,
  getTicketGenerationRules,
} from "../tickets/ticketGenerationService.js";

const AUCTION_ALLOWED_RATING_GRADES = new Set(["A", "S"]);
const MAX_AUCTION_TICKET_REROLLS = 100;

function toDate(input) {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
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
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

export async function isAuctionShopOpenForNewAuction({ currentTime, timeZone = "Asia/Taipei" }) {
  const { hour } = getTimeParts(currentTime, timeZone);
  return {
    isOpen: hour >= 6,
  };
}

export async function initializeAuctionShop({ dataAccessLayer, gameId, mapId }) {
  const existingAuction = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.AUCTIONS,
    filterOptions: { gameId, shopType: "auction_meta" },
  });

  if (existingAuction) {
    return existingAuction;
  }

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTIONS,
    data: {
      id: randomUUID(),
      gameId,
      mapId,
      shopType: "auction_meta",
      status: "meta",
      lastResolvedAuctionId: null,
    },
  });
}

export async function canCreateAuctionRound({ dataAccessLayer, gameId, currentTime, timeZone = "Asia/Taipei" }) {
  const { isOpen } = await isAuctionShopOpenForNewAuction({ currentTime, timeZone });
  if (!isOpen) {
    return { canCreate: false, reason: "Auction shop closed" };
  }

  const { minute, second } = getTimeParts(currentTime, timeZone);
  if (!((minute === 0 || minute === 30) && second === 0)) {
    return { canCreate: false, reason: "Not auction start time" };
  }

  const activeAuction = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.AUCTIONS,
    filterOptions: { gameId, status: AuctionStatus[1] },
  });

  if (activeAuction) {
    return { canCreate: false, reason: "Auction already active" };
  }

  return { canCreate: true, reason: null };
}

export async function createAuctionRound({
  dataAccessLayer,
  gameId,
  mapId,
  startTime,
  endTime,
  availableTransportTypes,
  generationRules = null,
  ruleSetName = "japan-default",
}) {
  const createCheck = await canCreateAuctionRound({ dataAccessLayer, gameId, currentTime: startTime });
  assert(createCheck.canCreate, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: createCheck.reason,
    detail: { gameId, startTime },
  }));

  const resolvedGenerationRules = generationRules ?? await getTicketGenerationRules({ mapId, ruleSetName });
  let ticketData = null;
  let auctionRating = null;

  for (let attempt = 0; attempt < MAX_AUCTION_TICKET_REROLLS; attempt += 1) {
    const generatedTicket = await generateRandomTicket({
      mapId,
      availableTransportTypes,
      generationRules: resolvedGenerationRules,
      now: startTime,
    });
    const calculatedRating = await calculateAuctionTicketRating({
      baseUsableMinutes: generatedTicket.baseDuration ?? generatedTicket.metadata?.baseUsableMinutes,
    });
    if (AUCTION_ALLOWED_RATING_GRADES.has(calculatedRating.ratingGrade)) {
      ticketData = {
        ...generatedTicket,
        ratingScore: calculatedRating.ratingScore,
        ratingGrade: calculatedRating.ratingGrade,
        ratingType: calculatedRating.ratingType,
        ticketSource: "auction_generated",
      };
      auctionRating = calculatedRating;
      break;
    }
  }

  assert(ticketData && auctionRating, () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Unable to generate auction ticket with A or S rating",
    detail: { gameId, mapId, startTime },
  }));

  const createdTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      ...ticketData,
      status: TicketStatus[2],
    },
  });

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTIONS,
    data: {
      id: randomUUID(),
      gameId,
      mapId,
      ticketId: createdTicket.id,
      ticketRatingScore: auctionRating.ratingScore,
      ticketRatingGrade: auctionRating.ratingGrade,
      ticketRatingType: auctionRating.ratingType,
      startTime,
      endTime,
      status: AuctionStatus[1],
      bidCount: 0,
      totalBidAmount: 0,
    },
  });
}

export async function getCurrentAuction({ dataAccessLayer, gameId, currentTime }) {
  const auctions = await dataAccessLayer.listRecords({
    collectionName: CollectionName.AUCTIONS,
    filterOptions: { gameId, status: AuctionStatus[1] },
  });

  const currentAuctionRecord = auctions.find((auction) => {
    const start = toDate(auction.startTime);
    const end = toDate(auction.endTime);
    const current = toDate(currentTime);
    return start && end && current && current >= start && current <= end;
  }) ?? null;

  if (!currentAuctionRecord) {
    return { currentAuction: null };
  }

  const ticket = currentAuctionRecord.ticketId
    ? await dataAccessLayer.getRecordById({
        collectionName: CollectionName.TICKETS,
        recordId: currentAuctionRecord.ticketId,
      })
    : null;

  return {
    currentAuction: {
      ...currentAuctionRecord,
      ticket,
      ticketRating: {
        ratingScore: currentAuctionRecord.ticketRatingScore ?? ticket?.ratingScore ?? null,
        ratingGrade: currentAuctionRecord.ticketRatingGrade ?? ticket?.ratingGrade ?? null,
        ratingType: currentAuctionRecord.ticketRatingType ?? ticket?.ratingType ?? null,
      },
    },
  };
}

export async function hasPlayerBid({ dataAccessLayer, auctionId, playerId }) {
  const existingBid = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.AUCTION_BIDS,
    filterOptions: { auctionId, playerId },
  });

  return {
    hasBid: Boolean(existingBid),
    bidData: existingBid,
  };
}

export async function placeBid({
  dataAccessLayer,
  gameId,
  auctionId,
  playerId,
  bidAmount,
  currentTime,
  canAfford,
  deductPlayerMoney,
}) {
  assert(typeof canAfford === "function" && typeof deductPlayerMoney === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Bid money dependencies are required",
  }));

  assert(typeof bidAmount === "number" && bidAmount >= 0, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Bid amount must be >= 0",
    detail: { bidAmount },
  }));

  const auction = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
  });

  assert(auction && auction.gameId === gameId && auction.status === AuctionStatus[1], () => new AppError({
    code: ErrorCode.INVALID_STATE,
    message: "Auction is not active",
    detail: { gameId, auctionId },
  }));

  const existingBid = await hasPlayerBid({ dataAccessLayer, auctionId, playerId });
  assert(!existingBid.hasBid, () => new AppError({
    code: ErrorCode.AUCTION_ALREADY_BID,
    message: "Player already placed a bid in this round",
    detail: { auctionId, playerId },
  }));

  const affordability = await canAfford({
    dataAccessLayer,
    gameId,
    playerId,
    amount: bidAmount,
  });
  assert(affordability.canAfford, () => new AppError({
    code: ErrorCode.MONEY_NOT_ENOUGH,
    message: "Player cannot afford auction bid",
    detail: { gameId, auctionId, playerId, bidAmount },
  }));

  const updatedMoney = await deductPlayerMoney({
    dataAccessLayer,
    gameId,
    playerId,
    amount: bidAmount,
    reason: "auction_bid",
  });

  const bidData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTION_BIDS,
    data: {
      id: randomUUID(),
      gameId,
      auctionId,
      playerId,
      bidAmount,
      createdAt: currentTime,
    },
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
    data: {
      bidCount: (auction.bidCount ?? 0) + 1,
      totalBidAmount: (auction.totalBidAmount ?? 0) + bidAmount,
    },
  });

  await recordShopAction({
    dataAccessLayer,
    gameId,
    playerId,
    shopType: "auction",
    actionType: "bid",
    actionData: {
      auctionId,
      bidId: bidData.id,
      bidAmount,
      bidAt: currentTime,
    },
  });

  return {
    success: true,
    bidData,
    updatedMoney,
  };
}

export async function getAuctionBids({
  dataAccessLayer,
  auctionId,
  filterOptions = {},
  queryOptions = {},
}) {
  const {
    createdAtAfter,
    createdAtBefore,
    ...bidFilterOptions
  } = filterOptions;

  const bidList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.AUCTION_BIDS,
    filterOptions: { auctionId, ...bidFilterOptions },
    queryOptions,
  });

  return {
    bidList: bidList.filter((bidData) => {
      const bidCreatedAt = bidData.createdAt ? new Date(bidData.createdAt).getTime() : null;
      const createdAtAfterTime = createdAtAfter ? new Date(createdAtAfter).getTime() : null;
      const createdAtBeforeTime = createdAtBefore ? new Date(createdAtBefore).getTime() : null;

      if (createdAtAfterTime !== null && (bidCreatedAt === null || bidCreatedAt < createdAtAfterTime)) {
        return false;
      }

      if (createdAtBeforeTime !== null && (bidCreatedAt === null || bidCreatedAt > createdAtBeforeTime)) {
        return false;
      }

      return true;
    }),
  };
}

function findWinningBid(bidList) {
  const remainingBids = [...bidList];
  while (remainingBids.length > 0) {
    const highestAmount = Math.max(...remainingBids.map((bid) => bid.bidAmount));
    const highestBids = remainingBids.filter((bid) => bid.bidAmount === highestAmount);
    if (highestBids.length === 1) {
      return highestBids[0];
    }
    const filtered = remainingBids.filter((bid) => bid.bidAmount !== highestAmount);
    remainingBids.length = 0;
    remainingBids.push(...filtered);
  }
  return null;
}

export async function awardAuctionTicket({
  dataAccessLayer,
  gameId,
  auctionId,
  winnerPlayerId,
  ticketId,
  currentTime,
  addTicketToPlayer,
}) {
  assert(typeof addTicketToPlayer === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "addTicketToPlayer dependency is required",
  }));

  await addTicketToPlayer({
    dataAccessLayer,
    gameId,
    playerId: winnerPlayerId,
    ticketId,
    source: "auction_reward",
  });

  const ticketData = await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
    data: {
      status: TicketStatus[3],
      ownerPlayerId: winnerPlayerId,
      acquiredAt: currentTime,
      acquiredSource: "auction_reward",
    },
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
    data: {
      winnerPlayerId,
      awardedTicketId: ticketId,
    },
  });

  await recordTicketAcquisition({
    dataAccessLayer,
    gameId,
    playerId: winnerPlayerId,
    ticketId,
    source: "auction_reward",
    sourceDetail: {
      auctionId,
      acquiredAt: currentTime,
    },
  });

  return { ticketData };
}

export async function destroyAuctionTicket({ dataAccessLayer, auctionId, ticketId, reason, currentTime }) {
  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: ticketId,
    data: {
      status: TicketStatus[6],
      destroyedReason: reason,
      destroyedAt: currentTime,
    },
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
    data: {
      destroyedTicketId: ticketId,
      destroyReason: reason,
    },
  });

  const auction = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
  });

  await recordShopAction({
    dataAccessLayer,
    gameId: auction?.gameId ?? null,
    playerId: null,
    shopType: "auction",
    actionType: "destroy_ticket",
    actionData: {
      auctionId,
      ticketId,
      reason,
      destroyedAt: currentTime,
    },
  });

  return { success: true, ticketId };
}

export async function resolveAuction({
  dataAccessLayer,
  gameId,
  auctionId,
  currentTime,
  addTicketToPlayer,
  addPlayerMoney = null,
  consumePlayerBlindBoxSpecialState = null,
}) {
  const auction = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
  });

  assert(auction && auction.gameId === gameId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Auction not found",
    detail: { gameId, auctionId },
  }));

  const { bidList } = await getAuctionBids({ dataAccessLayer, auctionId });
  const winningBid = findWinningBid(bidList);

  let winnerPlayerId = null;
  let awardedTicket = null;
  let wasDestroyed = false;

  if (winningBid) {
    winnerPlayerId = winningBid.playerId;
    const result = await awardAuctionTicket({
      dataAccessLayer,
      gameId,
      auctionId,
      winnerPlayerId,
      ticketId: auction.ticketId,
      currentTime,
      addTicketToPlayer,
    });
    awardedTicket = result.ticketData;
  } else {
    await destroyAuctionTicket({
      dataAccessLayer,
      auctionId,
      ticketId: auction.ticketId,
      reason: "auction_no_unique_winner",
      currentTime,
    });
    wasDestroyed = true;
  }

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: auctionId,
    data: {
      status: AuctionStatus[3],
      resolvedAt: currentTime,
      winnerPlayerId,
    },
  });

  const blindBoxRewards = [];
  if (
    typeof addPlayerMoney === "function"
    && typeof consumePlayerBlindBoxSpecialState === "function"
  ) {
    const allStates = await dataAccessLayer.listRecords({
      collectionName: CollectionName.PLAYER_SPECIAL_STATES,
      filterOptions: { gameId, stateType: "next_auction_bid_pool_reward", isConsumed: false },
    });

    for (const state of allStates) {
      const updatedMoney = await addPlayerMoney({
        dataAccessLayer,
        gameId,
        playerId: state.playerId,
        amount: auction.totalBidAmount ?? 0,
        reason: "blind_box_next_auction_bid_pool_reward",
      });
      await consumePlayerBlindBoxSpecialState({
        dataAccessLayer,
        gameId,
        playerId: state.playerId,
        stateId: state.id,
        reason: `auction_${auctionId}_resolved`,
      });
      blindBoxRewards.push({
        playerId: state.playerId,
        totalBidAmount: auction.totalBidAmount ?? 0,
        updatedMoney,
      });
    }
  }

  await recordShopAction({
    dataAccessLayer,
    gameId,
    playerId: winnerPlayerId,
    shopType: "auction",
    actionType: "resolve",
    actionData: {
      auctionId,
      winnerPlayerId,
      awardedTicketId: awardedTicket?.id ?? null,
      wasDestroyed,
      totalBidAmount: auction.totalBidAmount ?? 0,
      resolvedAt: currentTime,
      blindBoxRewards,
    },
  });

  return {
    winnerPlayerId,
    awardedTicket,
    wasDestroyed,
    totalBidAmount: auction.totalBidAmount ?? 0,
    blindBoxRewards,
  };
}
