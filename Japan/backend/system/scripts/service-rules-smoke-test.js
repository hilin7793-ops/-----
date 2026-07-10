import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import { CollectionName, GameStatus, createGame, createPlayer, createRecord } from "../src/index.js";
import {
  createJourney,
  getJourney,
  getPlayerCurrentJourney,
  getPlayerReservedJourney,
  validateCreateJourney,
  validateJourneyTime,
  validateTaxiJourney,
  validateWalkingJourney,
} from "../src/services/journeys/journeyService.js";
import {
  consumePlayerBlindBoxSpecialState,
  executeFreeShopRefreshEffect,
  getPlayerBlindBoxSpecialStates,
} from "../src/services/blindBoxes/blindBoxService.js";
import { addPlayerMoney, addTicketToPlayer, canAfford, deductPlayerMoney, getPlayerTickets, initializePlayerForGame } from "../src/services/players/playerService.js";
import { resolveAuction } from "../src/services/shops/auctionShopService.js";
import { canRefreshGeneralShop, initializeGeneralShop, purchaseGeneralShopTicket } from "../src/services/shops/generalShopService.js";
import { canViewPlayerExactLocation, filterRecordDataByVisibility } from "../src/services/visibility/visibilityService.js";

async function main() {
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });

  const hostPlayer = await createPlayer({
    dataAccessLayer,
    userId: "rules-host",
    authUserId: "auth-rules-host",
    displayName: "Host",
  });

  const memberPlayer = await createPlayer({
    dataAccessLayer,
    userId: "rules-member",
    authUserId: "auth-rules-member",
    displayName: "Member",
  });

  const mapData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.MAPS,
    data: {
      name: "Rules Smoke Map",
      description: "",
      countryOrRegion: "Japan",
      customRules: {},
      availableTransportTypes: [],
    },
  });

  const startLocation = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.LOCATIONS,
    data: {
      mapId: mapData.id,
      name: "Start",
      locationType: "city",
      metadata: {},
    },
  });

  const goalLocation = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.LOCATIONS,
    data: {
      mapId: mapData.id,
      name: "Goal",
      locationType: "city",
      metadata: {},
    },
  });

  const gameData = await createGame({
    dataAccessLayer,
    hostPlayerId: hostPlayer.id,
    mapId: mapData.id,
    startLocationId: startLocation.id,
    goalLocationId: goalLocation.id,
    initialMoney: 1000,
    name: "Rules Smoke Game",
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[1] },
  });

  await initializePlayerForGame({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    startLocationId: startLocation.id,
    initialMoney: 1000,
  });
  await initializePlayerForGame({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: hostPlayer.id,
    startLocationId: startLocation.id,
    initialMoney: 1000,
  });

  await initializeGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    mapId: mapData.id,
  });

  const shopRecord = await dataAccessLayer.findOneRecord({
    collectionName: CollectionName.SHOPS,
    filterOptions: { gameId: gameData.id, shopType: "general" },
  });
  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.SHOPS,
    recordId: shopRecord.id,
    data: {
      lastRefreshAt: "2026-07-10T10:00:00+08:00",
      lastRefreshType: "manual",
      priorityBuyerPlayerId: memberPlayer.id,
      priorityStartedAt: "2026-07-10T10:00:00+08:00",
      priorityEndsAt: "2026-07-10T10:05:00+08:00",
      prioritySource: "paid_refresh",
    },
  });

  const timeCheck = await validateJourneyTime({
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:30:00+08:00",
    currentTime: "2026-07-10T09:59:59+08:00",
  });
  const invalidTimeCheck = await validateJourneyTime({
    departureTime: "2026-07-10T10:30:00+08:00",
    arrivalTime: "2026-07-10T10:00:00+08:00",
    currentTime: "2026-07-10T09:59:59+08:00",
  });
  assert.equal(timeCheck.isValid, true);
  assert.equal(invalidTimeCheck.isValid, false);

  const walkingCheck = await validateWalkingJourney({
    transportType: "walking",
    ticketIdList: [],
    departureTime: "2026-07-10T10:00:00+08:00",
    arrivalTime: "2026-07-10T10:30:00+08:00",
  });
  assert.equal(walkingCheck.isValid, true);

  const taxiCheck = await validateTaxiJourney({
    transportType: "taxi",
    toLocationId: goalLocation.id,
    ticketIdList: ["taxi-ticket"],
  });
  assert.equal(taxiCheck.isValid, true);

  const currentJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T10:00:00+08:00",
      arrivalTime: "2026-07-10T10:30:00+08:00",
      status: "started",
      transportType: "taxi",
      ticketIdList: [],
    },
  });
  const reservedJourneyData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      departureTime: "2026-07-10T11:00:00+08:00",
      arrivalTime: "2026-07-10T11:30:00+08:00",
      status: "reserved",
      transportType: "walking",
      ticketIdList: [],
    },
  });

  const currentJourneyResult = await getPlayerCurrentJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  const reservedJourneyResult = await getPlayerReservedJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });
  assert.equal(currentJourneyResult.currentJourney?.id, currentJourneyData.id);
  assert.equal(reservedJourneyResult.reservedJourney?.id, reservedJourneyData.id);

  const shopCooldownCheck = await canRefreshGeneralShop({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    currentTime: "2026-07-10T10:05:00+08:00",
    refreshType: "manual",
    playerCount: 1,
  });
  assert.equal(shopCooldownCheck.canRefresh, false);

  const priorityShopTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 25,
      basePrice: 80,
      usableMinutes: 25,
      price: 80,
      ratingScore: 1,
      ratingGrade: "C",
      ratingType: "normal_shop",
      status: "listed",
      ticketSource: "shop_refresh",
      metadata: {},
    },
  });

  const priorityShopItem = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.SHOP_ITEMS,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      shopType: "general",
      ticketId: priorityShopTicket.id,
      price: 80,
      status: "listed",
      listedAt: "2026-07-10T10:00:00+08:00",
    },
  });

  let priorityPurchaseBlocked = false;
  try {
    await purchaseGeneralShopTicket({
      dataAccessLayer,
      gameId: gameData.id,
      playerId: hostPlayer.id,
      shopItemId: priorityShopItem.id,
      currentTime: "2026-07-10T10:02:00+08:00",
      canAfford,
      deductPlayerMoney,
      addTicketToPlayer,
    });
  } catch (error) {
    priorityPurchaseBlocked = error?.message === "Shop item is currently reserved for the refresh owner";
  }
  assert.equal(priorityPurchaseBlocked, true);

  const exactLocationSelf = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const exactLocationOther = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(exactLocationSelf.canView, true);
  assert.equal(exactLocationOther.canView, false);

  const recordData = await createRecord({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    recordType: "journey",
    action: "create",
    payload: {
      currentLocationId: "secret-location",
      fullRoute: ["A", "B"],
      privateState: { hidden: true },
      visibleNote: "ok",
    },
  });

  const filteredRecord = await filterRecordDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: hostPlayer.id,
    recordData,
    visibilityMode: "during_game",
  });

  assert.equal(filteredRecord.payload?.visibleNote, "ok");
  assert.equal(filteredRecord.payload?.currentLocationId, undefined);
  assert.equal(filteredRecord.payload?.fullRoute, undefined);
  assert.equal(filteredRecord.payload?.privateState, undefined);

  const ownedTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 30,
      basePrice: 100,
      usableMinutes: 30,
      price: 100,
      ratingScore: 1,
      ratingGrade: "C",
      ratingType: "normal_shop",
      status: "owned",
      ticketSource: "shop_purchase",
      metadata: {},
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: ownedTicket.id,
      source: "shop_purchase",
      createdAt: "2026-07-10T10:00:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: ownedTicket.id,
      source: "shop_purchase",
      createdAt: "2026-07-09T10:00:00+08:00",
    },
  });

  const playerTickets = await getPlayerTickets({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      source: "shop_purchase",
      ticketId: ownedTicket.id,
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(playerTickets.ticketList.length, 1);

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      stateType: "free_shop_refresh_count",
      stateData: { count: 1 },
      sourceBlindBoxId: null,
      isConsumed: false,
      createdAt: "2026-07-10T10:10:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_SPECIAL_STATES,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      stateType: "free_shop_refresh_count",
      stateData: { count: 2 },
      sourceBlindBoxId: null,
      isConsumed: false,
      createdAt: "2026-07-09T10:10:00+08:00",
    },
  });

  const specialStates = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(specialStates.specialStateList.length, 1);

  const freeRefreshEffectResult = await executeFreeShopRefreshEffect({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    freeRefreshCount: 1,
    blindBoxId: null,
  });
  const specialStateToConsume = freeRefreshEffectResult.specialStateData;
  const consumedSpecialState = await consumePlayerBlindBoxSpecialState({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    stateId: specialStateToConsume.id,
    reason: "service_rules_smoke",
  });
  const consumedSpecialStates = await getPlayerBlindBoxSpecialStates({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    filterOptions: {
      stateType: "free_shop_refresh_count",
      createdAtAfter: "2026-07-10T00:00:00+08:00",
    },
  });
  assert.equal(Boolean(freeRefreshEffectResult.specialStateData.id), true);
  assert.equal(consumedSpecialState.isConsumed, true);
  assert.equal(consumedSpecialStates.specialStateList.length, 1);
  assert.equal(consumedSpecialStates.specialStateList[0]?.isConsumed, true);

  const auctionTicket = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 90,
      basePrice: 300,
      usableMinutes: 180,
      price: 300,
      ratingScore: 4,
      ratingGrade: "A",
      ratingType: "auction",
      status: "listed",
      ticketSource: "auction_generated",
      metadata: {},
    },
  });

  const auctionRecord = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTIONS,
    data: {
      gameId: gameData.id,
      mapId: mapData.id,
      shopType: "auction",
      ticketId: auctionTicket.id,
      ticketRatingScore: 4,
      ticketRatingGrade: "A",
      ticketRatingType: "auction",
      startTime: "2026-07-10T12:00:00+08:00",
      endTime: "2026-07-10T12:30:00+08:00",
      status: "active",
      bidCount: 0,
      totalBidAmount: 0,
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTION_BIDS,
    data: {
      gameId: gameData.id,
      auctionId: auctionRecord.id,
      playerId: memberPlayer.id,
      bidAmount: 200,
      createdAt: "2026-07-10T12:10:00+08:00",
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.AUCTION_BIDS,
    data: {
      gameId: gameData.id,
      auctionId: auctionRecord.id,
      playerId: hostPlayer.id,
      bidAmount: 200,
      createdAt: "2026-07-10T12:11:00+08:00",
    },
  });

  const tieResolvedAuction = await resolveAuction({
    dataAccessLayer,
    gameId: gameData.id,
    auctionId: auctionRecord.id,
    currentTime: "2026-07-10T12:30:00+08:00",
    addTicketToPlayer,
    addPlayerMoney,
    consumePlayerBlindBoxSpecialState,
  });
  const destroyedAuctionTicket = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.TICKETS,
    recordId: auctionTicket.id,
  });
  const auctionBidList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.AUCTION_BIDS,
    filterOptions: { auctionId: auctionRecord.id },
  });
  assert.equal(tieResolvedAuction.winnerPlayerId, null);
  assert.equal(tieResolvedAuction.wasDestroyed, true);
  assert.equal(destroyedAuctionTicket.status, "destroyed");
  assert.equal(auctionBidList.length, 2);

  const journeyTicketData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.TICKETS,
    data: {
      transportType: "local_train",
      baseDuration: 45,
      basePrice: 120,
      usableMinutes: 120,
      price: 120,
      ratingScore: 2,
      ratingGrade: "B",
      ratingType: "normal_shop",
      status: "owned",
      ticketSource: "smoke_test",
      metadata: {},
    },
  });

  await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.PLAYER_TICKETS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      gamePlayerId: memberPlayer.id,
      ticketId: journeyTicketData.id,
      source: "smoke_test",
      createdAt: "2026-07-10T11:00:00+08:00",
    },
  });

  const createJourneyCheck = await validateCreateJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: "local_train",
    ticketIdList: [journeyTicketData.id],
    departureTime: "2026-07-10T11:30:00+08:00",
    arrivalTime: "2026-07-10T12:00:00+08:00",
    currentTime: "2026-07-10T11:00:00+08:00",
  });
  assert.equal(createJourneyCheck.isValid, true);

  const createdJourney = await createJourney({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
    fromLocationId: startLocation.id,
    toLocationId: goalLocation.id,
    transportType: "local_train",
    ticketIdList: [journeyTicketData.id],
    departureTime: "2026-07-10T11:30:00+08:00",
    arrivalTime: "2026-07-10T12:00:00+08:00",
    currentTime: "2026-07-10T11:00:00+08:00",
    metadata: { source: "service_rules_smoke" },
  });
  assert.equal(Boolean(createdJourney.id), true);

  const fetchedJourney = await getJourney({
    dataAccessLayer,
    journeyId: createdJourney.id,
  });
  assert.equal(fetchedJourney.id, createdJourney.id);

  console.log("journeyTimeCheck", timeCheck.isValid);
  console.log("invalidJourneyTimeCheck", invalidTimeCheck.isValid);
  console.log("walkingJourneyCheck", walkingCheck.isValid);
  console.log("taxiJourneyCheck", taxiCheck.isValid);
  console.log("shopCooldownCheck", shopCooldownCheck.canRefresh);
  console.log("priorityPurchaseBlocked", priorityPurchaseBlocked);
  console.log("exactLocationSelf", exactLocationSelf.canView);
  console.log("exactLocationOther", exactLocationOther.canView);
  console.log("recordVisibilityFiltered", filteredRecord.payload?.visibleNote === "ok");
  console.log("playerTicketsFiltered", playerTickets.ticketList.length === 1);
  console.log("specialStatesFiltered", specialStates.specialStateList.length === 1);
  console.log("freeRefreshEffectResult", Boolean(freeRefreshEffectResult.specialStateData.id));
  console.log("consumedSpecialState", consumedSpecialState.isConsumed);
  console.log("createJourneyCheck", createJourneyCheck.isValid);
  console.log("createdJourney", Boolean(createdJourney.id));
  console.log("fetchedJourney", fetchedJourney.id === createdJourney.id);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
