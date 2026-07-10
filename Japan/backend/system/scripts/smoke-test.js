import {
  addPlayerBlindBoxSpecialState,
  AppError,
  canRefreshGeneralShop,
  calculateAuctionTicketRating,
  calculateNormalShopTicketRating,
  consumePlayerBlindBoxSpecialState,
  createBlindBox,
  CollectionName,
  createDataAccessLayer,
  createInMemoryDataAccessAdapter,
  createAuctionRound,
  ErrorCode,
  getCurrentAuction,
  getPublicBlindBoxInfo,
  initializeAuctionShop,
  initializeGeneralShop,
  placeBid,
  purchaseGeneralShopTicket,
  refreshGeneralShop,
  resolveAuction,
  generateTicketBatch,
  getCurrentTime,
  JAPAN_DEFAULT_TICKET_GENERATION_RULES,
  openBlindBox,
  TransportType,
} from "../src/index.js";

async function main() {
  const currentTime = await getCurrentTime();
  console.log("currentTime", currentTime);

  const { ticketList } = await generateTicketBatch({
    mapId: "japan-map-001",
    count: 5,
    availableTransportTypes: [
      TransportType.AIRPLANE,
      TransportType.SHINKANSEN,
      TransportType.LIMITED_EXPRESS,
      TransportType.HIGHWAY_NIGHT_BUS,
      TransportType.LOCAL_TRAIN,
      TransportType.TAXI,
      TransportType.ROUTE_BUS,
      TransportType.FERRY,
      TransportType.UNIVERSAL,
    ],
    generationRules: JAPAN_DEFAULT_TICKET_GENERATION_RULES,
  });

  console.log("sampleTickets", ticketList);

  const dataAccessLayer = createDataAccessLayer(createInMemoryDataAccessAdapter());
  const createdGame = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAMES,
    data: {
      id: "game-smoke-test",
      name: "Smoke Test Game",
      status: "waiting",
    },
  });

  console.log("createdGame", createdGame);

  const createdBlindBox = await createBlindBox({
    dataAccessLayer,
    gameId: createdGame.id,
    locationId: "tokyo",
    effectData: {
      effectType: "gain_free_shop_refresh",
      freeRefreshCount: 2,
    },
    createdBy: "referee-001",
  });

  console.log("createdBlindBox", createdBlindBox);

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: createdGame.id,
    data: {
      status: "started",
    },
  });

  const publicBlindBoxes = await getPublicBlindBoxInfo({
    dataAccessLayer,
    gameId: createdGame.id,
  });

  console.log("publicBlindBoxes", publicBlindBoxes);

  const openBlindBoxResult = await openBlindBox({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: "player-001",
    blindBoxId: createdBlindBox.id,
    currentTime: new Date().toISOString(),
    getGame: async ({ gameId }) =>
      dataAccessLayer.getRecordById({
        collectionName: CollectionName.GAMES,
        recordId: gameId,
      }),
    getPlayerLocation: async () => "tokyo",
    executeBlindBoxEffect: async ({ effectData }) => ({
      effectType: effectData.effectType,
      effectApplied: true,
      grantedFreeRefreshCount: effectData.freeRefreshCount,
    }),
  });

  console.log("openBlindBoxResult", openBlindBoxResult);

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAME_PLAYERS,
    data: {
      id: "gp-001",
      gameId: createdGame.id,
      playerId: "player-001",
      money: 10000,
      currentLocationId: "tokyo",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.GAME_PLAYERS,
    data: {
      id: "gp-002",
      gameId: createdGame.id,
      playerId: "player-002",
      money: 10000,
      currentLocationId: "osaka",
    },
  });

  const canAfford = async ({ gameId, playerId, amount }) => {
    const player = await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.GAME_PLAYERS,
      filterOptions: { gameId, playerId },
    });
    return { canAfford: (player?.money ?? 0) >= amount, currentMoney: player?.money ?? 0 };
  };

  const deductPlayerMoney = async ({ gameId, playerId, amount }) => {
    const player = await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.GAME_PLAYERS,
      filterOptions: { gameId, playerId },
    });
    return dataAccessLayer.updateRecordById({
      collectionName: CollectionName.GAME_PLAYERS,
      recordId: player.id,
      data: { money: player.money - amount },
    });
  };

  const addPlayerMoney = async ({ gameId, playerId, amount }) => {
    const player = await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.GAME_PLAYERS,
      filterOptions: { gameId, playerId },
    });
    return dataAccessLayer.updateRecordById({
      collectionName: CollectionName.GAME_PLAYERS,
      recordId: player.id,
      data: { money: player.money + amount },
    });
  };

  const addTicketToPlayer = async ({ gameId, playerId, ticketId, source }) =>
    dataAccessLayer.createRecordInCollection({
      collectionName: CollectionName.PLAYER_TICKETS,
      data: {
        id: `${playerId}-${ticketId}`,
        gameId,
        playerId,
        ticketId,
        source,
      },
    });

  await initializeGeneralShop({
    dataAccessLayer,
    gameId: createdGame.id,
    mapId: "japan-map-001",
  });

  const refreshCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: "player-001",
    currentTime: "2026-07-09T06:20:00+08:00",
    refreshType: "manual",
    playerCount: 2,
  });
  console.log("refreshCheck", refreshCheck);

  const refreshedShop = await refreshGeneralShop({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: "player-001",
    refreshType: "manual",
    currentTime: "2026-07-09T06:20:00+08:00",
    playerCount: 2,
    mapId: "japan-map-001",
    availableTransportTypes: [
      TransportType.AIRPLANE,
      TransportType.SHINKANSEN,
      TransportType.LIMITED_EXPRESS,
      TransportType.HIGHWAY_NIGHT_BUS,
      TransportType.LOCAL_TRAIN,
      TransportType.TAXI,
      TransportType.ROUTE_BUS,
      TransportType.FERRY,
      TransportType.UNIVERSAL,
    ],
  });
  console.log("refreshedShop", refreshedShop.newShopTicketList.length);
  console.log("refreshedShopPrioritySource", (
    await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.SHOPS,
      filterOptions: { gameId: createdGame.id, shopType: "general" },
    })
  ).prioritySource);
  console.log("refreshedShopTicketRatingType", refreshedShop.newShopTicketList[0]?.ticket?.ratingType ?? null);
  console.log("refreshedShopTicketRatingGrade", refreshedShop.newShopTicketList[0]?.ticket?.ratingGrade ?? null);

  const normalShopRatingSample = await calculateNormalShopTicketRating({
    baseUsableMinutes: 100,
    basePrice: 0,
  });
  const auctionRatingSample = await calculateAuctionTicketRating({
    baseUsableMinutes: 100,
  });
  console.log("normalShopRatingSample", normalShopRatingSample.ratingGrade, normalShopRatingSample.ratingType);
  console.log("auctionRatingSample", auctionRatingSample.ratingGrade, auctionRatingSample.ratingType);

  let blockedByPriority = false;
  try {
    await purchaseGeneralShopTicket({
      dataAccessLayer,
      gameId: createdGame.id,
      playerId: "player-002",
      shopItemId: refreshedShop.newShopTicketList[0].shopItemId,
      currentTime: "2026-07-09T06:21:00+08:00",
      canAfford,
      deductPlayerMoney,
      addTicketToPlayer,
    });
  } catch (error) {
    blockedByPriority = error instanceof AppError && error.code === ErrorCode.FORBIDDEN;
  }
  console.log("priorityPurchaseBlocked", blockedByPriority);

  const purchasedShopItem = refreshedShop.newShopTicketList.find(
    (item) => (item.ticket?.price ?? item.price ?? Infinity) <= 10000,
  ) ?? refreshedShop.newShopTicketList[0];
  const purchaseResult = await purchaseGeneralShopTicket({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: "player-001",
    shopItemId: purchasedShopItem.shopItemId,
    currentTime: "2026-07-09T06:21:00+08:00",
    canAfford,
    deductPlayerMoney,
    addTicketToPlayer,
  });
  console.log("purchaseResult", purchaseResult.success, purchaseResult.purchasedTicket.transportType);

  await initializeAuctionShop({
    dataAccessLayer,
    gameId: createdGame.id,
    mapId: "japan-map-001",
  });

  await addPlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: createdGame.id,
    playerId: "player-001",
    stateType: "next_auction_bid_pool_reward",
    stateData: {},
    sourceBlindBoxId: createdBlindBox.id,
  });

  const auctionRound = await createAuctionRound({
    dataAccessLayer,
    gameId: createdGame.id,
    mapId: "japan-map-001",
    startTime: "2026-07-09T06:30:00+08:00",
    endTime: "2026-07-09T06:40:00+08:00",
    availableTransportTypes: [
      TransportType.AIRPLANE,
      TransportType.SHINKANSEN,
      TransportType.LIMITED_EXPRESS,
      TransportType.HIGHWAY_NIGHT_BUS,
      TransportType.LOCAL_TRAIN,
      TransportType.TAXI,
      TransportType.ROUTE_BUS,
      TransportType.FERRY,
      TransportType.UNIVERSAL,
    ],
  });
  console.log("auctionRound", auctionRound.id);
  console.log("auctionRoundRatingGrade", auctionRound.ticketRatingGrade);
  console.log("auctionRoundRatingType", auctionRound.ticketRatingType);
  console.log("auctionRoundIsHighGrade", ["A", "S"].includes(auctionRound.ticketRatingGrade));

  const currentAuction = await getCurrentAuction({
    dataAccessLayer,
    gameId: createdGame.id,
    currentTime: "2026-07-09T06:31:00+08:00",
  });
  console.log("currentAuction", currentAuction.currentAuction?.id);

  await placeBid({
    dataAccessLayer,
    gameId: createdGame.id,
    auctionId: auctionRound.id,
    playerId: "player-001",
    bidAmount: 1000,
    currentTime: "2026-07-09T06:31:00+08:00",
    canAfford,
    deductPlayerMoney,
  });
  await placeBid({
    dataAccessLayer,
    gameId: createdGame.id,
    auctionId: auctionRound.id,
    playerId: "player-002",
    bidAmount: 800,
    currentTime: "2026-07-09T06:32:00+08:00",
    canAfford,
    deductPlayerMoney,
  });

  const resolvedAuction = await resolveAuction({
    dataAccessLayer,
    gameId: createdGame.id,
    auctionId: auctionRound.id,
    currentTime: "2026-07-09T06:40:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  console.log("resolvedAuction", resolvedAuction);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
