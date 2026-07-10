import {
  addPlayerBlindBoxSpecialState,
  addPlayerMoney,
  addTicketToPlayer,
  createTicket,
  canAfford,
  CollectionName,
  createMap,
  createBlindBox,
  createBlindBoxBatch,
  createJourney,
  createDataAccessLayer,
  createGame,
  addLocation,
  createPlayer,
  createPocketBaseRestAdapter,
  determineWinner,
  deductPlayerMoney,
  getGame,
  getGeneralShopItems,
  getCurrentAuction,
  getPlayerCurrentJourney,
  getPlayerLocation,
  getPlayerRecords,
  getPlayerReservedJourney,
  getPlayerTickets,
  getRanking,
  setGoalLocation,
  setStartLocation,
  getPublicJourneyInfo,
  getPublicRecordsDuringGame,
  getPostGameReviewData,
  getPublicBlindBoxInfo,
  getBlindBoxReviewData,
  getBlindBox,
  initializeAuctionShop,
  initializeGeneralShop,
  initializePlayerForGame,
  openBlindBox,
  placeBid,
  processAllScheduledEvents,
  purchaseGeneralShopTicket,
  refreshGeneralShop,
  recordPlayerAction,
  recordPlayerArrival,
  recordShopAction,
  recordBlindBoxAction,
  recordTicketAcquisition,
  recordTicketUsage,
  recordTrafficIncidentRequest,
  recordJourney,
  updateJourney,
  processJourneyTimeEvents,
  startGame,
  submitTrafficIncidentRequest,
  TransportType,
  consumePlayerBlindBoxSpecialState,
  approveTrafficIncidentRequest,
  hasReachedGoal,
  updateBlindBox,
  deleteBlindBox,
  validateBlindBoxSetup,
} from "../src/index.js";

function testStamp() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `smoke-${iso}`;
}

async function main() {
  const {
    POCKETBASE_URL,
    POCKETBASE_ADMIN_EMAIL,
    POCKETBASE_ADMIN_PASSWORD,
    POCKETBASE_AUTH_TOKEN,
  } = process.env;

  if (!POCKETBASE_AUTH_TOKEN && (!POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD)) {
    throw new Error(
      "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD, or POCKETBASE_AUTH_TOKEN, before running pocketbase flow smoke test.",
    );
  }

  const adapter = createPocketBaseRestAdapter({
    baseUrl: POCKETBASE_URL ?? "http://127.0.0.1:8090",
    adminEmail: POCKETBASE_ADMIN_EMAIL,
    adminPassword: POCKETBASE_ADMIN_PASSWORD,
    authToken: POCKETBASE_AUTH_TOKEN ?? null,
    requireAuth: false,
  });
  const dataAccessLayer = createDataAccessLayer(adapter);

  const stamp = testStamp();

  const map = await createMap({
    dataAccessLayer,
    mapName: `Japan Smoke Map ${stamp}`,
    description: "PocketBase flow smoke test map",
    countryOrRegion: "Japan",
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
    customRules: {},
  });

  const startLocation = await addLocation({
    dataAccessLayer,
    mapId: map.id,
    locationName: `Tokyo ${stamp}`,
    locationType: "city",
    metadata: {},
  });

  const goalLocation = await addLocation({
    dataAccessLayer,
    mapId: map.id,
    locationName: `Osaka ${stamp}`,
    locationType: "city",
    metadata: {},
  });

  await setStartLocation({
    dataAccessLayer,
    mapId: map.id,
    locationId: startLocation.id,
  });
  await setGoalLocation({
    dataAccessLayer,
    mapId: map.id,
    locationId: goalLocation.id,
  });

  const player1 = await createPlayer({
    dataAccessLayer,
    userId: `player1-${stamp}`,
    displayName: `Player 1 ${stamp}`,
    metadata: {},
  });

  const player2 = await createPlayer({
    dataAccessLayer,
    userId: `player2-${stamp}`,
    displayName: `Player 2 ${stamp}`,
    metadata: {},
  });

  const game = await createGame({
    dataAccessLayer,
    name: `Smoke Game ${stamp}`,
    hostPlayerId: player1.id,
    mapId: map.id,
    startLocationId: startLocation.id,
    goalLocationId: goalLocation.id,
    initialMoney: 50000,
    gameSettings: {},
    blindBoxSettings: {},
  });

  await initializePlayerForGame({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    startLocationId: startLocation.id,
    initialMoney: 50000,
  });

  await initializePlayerForGame({
    dataAccessLayer,
    gameId: game.id,
    playerId: player2.id,
    startLocationId: startLocation.id,
    initialMoney: 50000,
  });

  const blindBox = await createBlindBox({
    dataAccessLayer,
    gameId: game.id,
    locationId: startLocation.id,
    effectData: {
      effectType: "gain_free_shop_refresh",
      freeRefreshCount: 2,
    },
    createdBy: player1.id,
  });

  const preGameBlindBoxBatch = await createBlindBoxBatch({
    dataAccessLayer,
    gameId: game.id,
    createdBy: player1.id,
    blindBoxConfigList: [
      {
        locationId: goalLocation.id,
        effectData: {
          effectType: "money",
          operator: "+=",
          value: 500,
        },
      },
      {
        locationId: startLocation.id,
        effectData: {
          effectType: "gain_free_shop_refresh",
          freeRefreshCount: 1,
        },
      },
    ],
  });
  console.log("preGameBlindBoxBatch", preGameBlindBoxBatch.blindBoxList.length);

  const blindBoxSetupCheck = await validateBlindBoxSetup({
    dataAccessLayer,
    gameId: game.id,
    blindBoxConfigList: [
      {
        locationId: goalLocation.id,
        effectData: {
          effectType: "money",
          operator: "+=",
          value: 500,
        },
      },
    ],
  });
  console.log("blindBoxSetupValid", blindBoxSetupCheck.isValid);

  const updatedBlindBox = await updateBlindBox({
    dataAccessLayer,
    gameId: game.id,
    blindBoxId: preGameBlindBoxBatch.blindBoxList[0].id,
    locationId: goalLocation.id,
    effectData: {
      effectType: "money",
      operator: "+=",
      value: 1000,
    },
    updatedBy: player1.id,
  });
  console.log("updatedBlindBoxEffect", updatedBlindBox.effectData.value);

  const deletedBlindBox = await deleteBlindBox({
    dataAccessLayer,
    gameId: game.id,
    blindBoxId: preGameBlindBoxBatch.blindBoxList[1].id,
    deletedBy: player1.id,
  });
  console.log("deletedBlindBox", deletedBlindBox.success);

  await startGame({
    dataAccessLayer,
    gameId: game.id,
    startTime: "2026-07-09T06:00:00+08:00",
  });
  await recordPlayerAction({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    actionType: "start_game",
    actionData: { stamp },
  });

  const publicBlindBoxes = await getPublicBlindBoxInfo({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("publicBlindBoxes", publicBlindBoxes.publicBlindBoxList.length);

  const openBlindBoxResult = await openBlindBox({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    blindBoxId: blindBox.id,
    currentTime: new Date().toISOString(),
    getGame: async ({ gameId }) => getGame({ dataAccessLayer, gameId }),
    getPlayerLocation: async ({ gameId, playerId }) => getPlayerLocation({ dataAccessLayer, gameId, playerId }),
    executeBlindBoxEffect: async ({ gameId, playerId, blindBoxId, effectData }) => {
      if (effectData.effectType === "gain_free_shop_refresh") {
        await addPlayerBlindBoxSpecialState({
          dataAccessLayer,
          gameId,
          playerId,
          stateType: "free_shop_refresh_count",
          stateData: { remainingCount: effectData.freeRefreshCount },
          sourceBlindBoxId: blindBoxId,
        });
      }

      return {
        effectType: effectData.effectType,
        effectApplied: true,
      };
    },
  });
  console.log("openBlindBoxResult", openBlindBoxResult.success);
  await recordBlindBoxAction({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    blindBoxId: blindBox.id,
    actionType: "open_blind_box_record",
    actionData: {
      openedStatus: true,
    },
  });

  const filteredBlindBox = await getBlindBox({
    dataAccessLayer,
    gameId: game.id,
    blindBoxId: updatedBlindBox.id,
    requesterId: player2.id,
    visibilityMode: "during_game",
  });
  console.log("filteredBlindBoxEffectHidden", filteredBlindBox.effectData === undefined);

  await initializeGeneralShop({
    dataAccessLayer,
    gameId: game.id,
    mapId: map.id,
  });

  await initializeAuctionShop({
    dataAccessLayer,
    gameId: game.id,
    mapId: map.id,
  });

  const openingScheduledResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T06:00:00+08:00",
    addTicketToPlayer: (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
    addPlayerMoney: (input) => addPlayerMoney({ dataAccessLayer, ...input }),
    consumePlayerBlindBoxSpecialState,
  });
  console.log("openingScheduledEvents", openingScheduledResult.shopResult.processedShopEvents.length);

  const dailyShopItems = await dataAccessLayer.listRecords({
    collectionName: CollectionName.SHOP_ITEMS,
    filterOptions: { gameId: game.id, shopType: "general", status: "listed" },
  });
  console.log("dailyShopItems", dailyShopItems.length);
  const dailyShopItemView = await getGeneralShopItems({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("dailyShopPrioritySource", dailyShopItemView.priorityState.prioritySource);
  console.log(
    "dailyShopHasNoPriority",
    dailyShopItemView.shopTicketList.every((item) => item.priorityAccess?.prioritySource === "none"),
  );

  const refreshedShop = await refreshGeneralShop({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    refreshType: "manual",
    currentTime: "2026-07-09T06:20:00+08:00",
    playerCount: 2,
    mapId: map.id,
    availableTransportTypes: map.availableTransportTypes,
  });
  console.log("refreshedShop", refreshedShop.newShopTicketList.length);
  const refreshedShopView = await getGeneralShopItems({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("manualRefreshPrioritySource", refreshedShopView.priorityState.prioritySource);
  console.log("manualRefreshPriorityBuyer", refreshedShopView.priorityState.priorityBuyerPlayerId === player1.id);
  console.log(
    "manualRefreshItemsPriorityTagged",
    refreshedShopView.shopTicketList.every((item) => item.priorityAccess?.priorityBuyerPlayerId === player1.id),
  );

  const purchasableShopItem = refreshedShop.newShopTicketList.find(
    (item) => item.ticket.transportType !== TransportType.UNIVERSAL,
  );
  if (!purchasableShopItem) {
    throw new Error("Smoke test requires at least one non-universal shop ticket");
  }

  let priorityBlocked = false;
  try {
    await purchaseGeneralShopTicket({
      dataAccessLayer,
      gameId: game.id,
      playerId: player2.id,
      shopItemId: purchasableShopItem.shopItemId,
      currentTime: "2026-07-09T06:21:00+08:00",
      canAfford: (input) => canAfford({ dataAccessLayer, ...input }),
      deductPlayerMoney: (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
      addTicketToPlayer: (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
    });
  } catch (error) {
    priorityBlocked = error?.code === "FORBIDDEN" || error?.message === "Shop item is currently reserved for the refresh owner";
  }
  console.log("manualRefreshPriorityBlocked", priorityBlocked);

  await recordShopAction({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    shopType: "general",
    actionType: "refresh",
    actionData: { refreshedAt: refreshedShop.refreshedAt },
  });

  const purchaseResult = await purchaseGeneralShopTicket({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    shopItemId: purchasableShopItem.shopItemId,
    currentTime: "2026-07-09T06:21:00+08:00",
    canAfford: (input) => canAfford({ dataAccessLayer, ...input }),
    deductPlayerMoney: (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
    addTicketToPlayer: (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
  });
  console.log("purchaseResult", purchaseResult.success);
  await recordShopAction({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    shopType: "general",
    actionType: "purchase",
    actionData: { shopItemId: purchasableShopItem.shopItemId },
  });
  await recordTicketAcquisition({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    ticketId: purchaseResult.purchasedTicket.id,
    source: "general_shop_purchase",
    sourceDetail: { shopItemId: purchasableShopItem.shopItemId },
  });
  const playerTicketsAfterPurchase = await getPlayerTickets({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
  });
  console.log("playerTicketsAfterPurchase", playerTicketsAfterPurchase.ticketList.length);

  const initialJourneyDurationMinutes = Math.max(
    5,
    Math.min(purchaseResult.purchasedTicket.usableMinutes, 10),
  );
  const initialJourneyArrivalTime = new Date(
    new Date("2026-07-09T07:00:00+08:00").getTime() + (initialJourneyDurationMinutes * 60 * 1000),
  ).toISOString();

  const createdJourney = await createJourney({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: purchaseResult.purchasedTicket.transportType,
    ticketIdList: [purchaseResult.purchasedTicket.id],
    departureTime: "2026-07-09T07:00:00+08:00",
    arrivalTime: initialJourneyArrivalTime,
    currentTime: "2026-07-09T06:21:00+08:00",
    metadata: { source: "smoke_test" },
  });
  console.log("createdJourney", createdJourney.id);

  const extraTicketTemplate = await createTicket({
    transportType: purchaseResult.purchasedTicket.transportType,
    usableMinutes: 20,
    price: 0,
    ticketSource: "smoke_test_bonus",
    metadata: { source: "update_journey_test" },
  });
  const extraTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      ...extraTicketTemplate,
      gameId: game.id,
      status: "owned",
      ownerPlayerId: player1.id,
      acquiredAt: "2026-07-09T06:22:00+08:00",
    },
  });
  await addTicketToPlayer({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    ticketId: extraTicket.id,
    source: "smoke_test_bonus",
  });

  const updatedReservedJourney = await updateJourney({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    journeyId: createdJourney.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: purchaseResult.purchasedTicket.transportType,
    ticketIdList: [purchaseResult.purchasedTicket.id, extraTicket.id],
    departureTime: "2026-07-09T07:05:00+08:00",
    arrivalTime: "2026-07-09T07:25:00+08:00",
    currentTime: "2026-07-09T06:23:00+08:00",
    metadata: { source: "smoke_test_updated" },
  });
  console.log("updatedJourneyTicketCount", updatedReservedJourney.ticketIdList.length);

  await recordJourney({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    journeyId: createdJourney.id,
    journeyAction: "create",
    journeyData: {
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      ticketIdList: [purchaseResult.purchasedTicket.id, extraTicket.id],
    },
  });
  const reservedJourney = await getPlayerReservedJourney({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
  });
  console.log("reservedJourney", Boolean(reservedJourney.reservedJourney));

  const processedStart = await processJourneyTimeEvents({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T07:05:00+08:00",
  });
  console.log("processedJourneyStart", processedStart.processedJourneyEvents.length);
  const currentJourney = await getPlayerCurrentJourney({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
  });
  console.log("currentJourney", Boolean(currentJourney.currentJourney));
  if (processedStart.processedJourneyEvents[0]) {
    await recordTicketUsage({
      dataAccessLayer,
      gameId: game.id,
      playerId: player1.id,
      journeyId: createdJourney.id,
      ticketIdList: [purchaseResult.purchasedTicket.id, extraTicket.id],
      usedAt: "2026-07-09T07:05:00+08:00",
    });
  }

  const incidentRequest = await submitTrafficIncidentRequest({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    journeyId: createdJourney.id,
    evidenceList: ["operator announcement"],
    actualEndLocationId: startLocation.id,
    actualEndedAt: "2026-07-09T07:20:00+08:00",
    description: "Service interrupted before reaching original destination.",
  });
  console.log("incidentRequest", incidentRequest.status);

  await recordTrafficIncidentRequest({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    requestId: incidentRequest.id,
    requestAction: "submit",
    requestData: {
      journeyId: createdJourney.id,
      actualEndLocationId: startLocation.id,
    },
  });

  const approvedIncident = await approveTrafficIncidentRequest({
    dataAccessLayer,
    requestId: incidentRequest.id,
    reviewerId: "system-reviewer",
    reviewNote: "Smoke test approval",
  });
  console.log("approvedIncident", approvedIncident.returnedTicket?.usableMinutes ?? 0);

  await recordTrafficIncidentRequest({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    requestId: incidentRequest.id,
    requestAction: "approve",
    requestData: {
      returnedTicketId: approvedIncident.returnedTicket?.id ?? null,
    },
  });

  await initializeAuctionShop({
    dataAccessLayer,
    gameId: game.id,
    mapId: map.id,
  });

  await addPlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    stateType: "next_auction_bid_pool_reward",
    stateData: {},
    sourceBlindBoxId: blindBox.id,
  });

  const auctionStartScheduledResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T06:30:00+08:00",
    addTicketToPlayer: (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
    addPlayerMoney: (input) => addPlayerMoney({ dataAccessLayer, ...input }),
    consumePlayerBlindBoxSpecialState,
  });
  console.log("auctionStartEvents", auctionStartScheduledResult.shopResult.processedShopEvents.length);

  const currentAuction = await getCurrentAuction({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T06:31:00+08:00",
  });
  console.log("currentAuction", Boolean(currentAuction.currentAuction));
  console.log("currentAuctionRatingGrade", currentAuction.currentAuction?.ticketRating?.ratingGrade ?? null);
  console.log("currentAuctionRatingType", currentAuction.currentAuction?.ticketRating?.ratingType ?? null);
  console.log(
    "currentAuctionIsHighGrade",
    ["A", "S"].includes(currentAuction.currentAuction?.ticketRating?.ratingGrade),
  );

  await placeBid({
    dataAccessLayer,
    gameId: game.id,
    auctionId: currentAuction.currentAuction.id,
    playerId: player1.id,
    bidAmount: 1000,
    currentTime: "2026-07-09T06:31:00+08:00",
    canAfford: (input) => canAfford({ dataAccessLayer, ...input }),
    deductPlayerMoney: (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
  });
  await placeBid({
    dataAccessLayer,
    gameId: game.id,
    auctionId: currentAuction.currentAuction.id,
    playerId: player2.id,
    bidAmount: 800,
    currentTime: "2026-07-09T06:32:00+08:00",
    canAfford: (input) => canAfford({ dataAccessLayer, ...input }),
    deductPlayerMoney: (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
  });

  const auctionResolveScheduledResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T06:40:00+08:00",
    addTicketToPlayer: (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
    addPlayerMoney: (input) => addPlayerMoney({ dataAccessLayer, ...input }),
    consumePlayerBlindBoxSpecialState,
  });
  console.log("auctionResolveEvents", auctionResolveScheduledResult.shopResult.processedShopEvents.length);
  const resolvedAuctionRecord = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.AUCTIONS,
    recordId: currentAuction.currentAuction.id,
  });
  const awardedTicket = resolvedAuctionRecord.awardedTicketId
    ? await dataAccessLayer.getRecordById({
        collectionName: CollectionName.TICKETS,
        recordId: resolvedAuctionRecord.awardedTicketId,
      })
    : null;
  const blindBoxRewardCount = auctionResolveScheduledResult.shopResult.processedShopEvents.filter(
    (event) => event.type === "auction_resolved",
  ).length;
  const resolvedAuction = {
    winnerPlayerId: resolvedAuctionRecord.winnerPlayerId ?? null,
    totalBidAmount: resolvedAuctionRecord.totalBidAmount ?? 0,
    blindBoxRewards: Array.from({ length: blindBoxRewardCount }),
    awardedTicket,
  };
  console.log("resolvedAuction", {
    winnerPlayerId: resolvedAuction.winnerPlayerId,
    totalBidAmount: resolvedAuction.totalBidAmount,
    blindBoxRewards: resolvedAuction.blindBoxRewards.length,
  });

  const publicJourney = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: game.id,
    requestingPlayerId: player2.id,
    targetPlayerId: player1.id,
  });
  console.log("publicJourneyVisible", Boolean(publicJourney.publicJourneyInfo));

  const playerRecords = await getPlayerRecords({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    visibilityMode: "during_game",
  });
  console.log("playerRecords", playerRecords.recordList.length);

  const publicRecords = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: game.id,
    requestingPlayerId: player2.id,
  });
  console.log("publicRecords", publicRecords.publicRecordList.length);

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: (
      await dataAccessLayer.findOneRecord({
        collectionName: CollectionName.GAME_PLAYERS,
        filterOptions: { gameId: game.id, playerId: player1.id },
      })
    ).id,
    data: {
      currentLocationId: goalLocation.id,
    },
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAME_PLAYERS,
    recordId: (
      await dataAccessLayer.findOneRecord({
        collectionName: CollectionName.GAME_PLAYERS,
        filterOptions: { gameId: game.id, playerId: player2.id },
      })
    ).id,
    data: {
      currentLocationId: goalLocation.id,
    },
  });

  await recordPlayerArrival({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    arrivalTime: "2026-07-09T09:00:00+08:00",
  });

  const scheduledResult = await processAllScheduledEvents({
    dataAccessLayer,
    gameId: game.id,
    currentTime: "2026-07-09T09:05:00+08:00",
  });
  console.log("scheduledEndedGame", Boolean(scheduledResult.gameResult.endedGame));

  const ranking = await getRanking({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("rankingCount", ranking.ranking.length);
  const player1ReachedGoal = await hasReachedGoal({
    dataAccessLayer,
    gameId: game.id,
    playerId: player1.id,
    goalLocationId: goalLocation.id,
  });
  console.log("player1ReachedGoal", player1ReachedGoal.hasReachedGoal);

  const winner = await determineWinner({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("winnerPlayerId", winner.winnerPlayerId ?? "tie");

  const reviewData = await getPostGameReviewData({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("postGameReviewRecords", reviewData.reviewData.recordList.length);
  const blindBoxReviewData = await getBlindBoxReviewData({
    dataAccessLayer,
    gameId: game.id,
  });
  console.log("blindBoxReviewCount", blindBoxReviewData.blindBoxReviewData.blindBoxList.length);

  console.log("smokeTestGameId", game.id);
  console.log("smokeTestMapId", map.id);
  console.log("smokeTestPlayers", [player1.id, player2.id]);
}

main().catch((error) => {
  console.error(error);
  if (error?.detail) {
    console.error("errorDetail", JSON.stringify(error.detail, null, 2));
  }
  process.exitCode = 1;
});
