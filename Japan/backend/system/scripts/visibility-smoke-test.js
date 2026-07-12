import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import {
  CollectionName,
  GameStatus,
  createGame,
  createPlayer,
  createRecord,
} from "../src/index.js";
import { canViewPlayerExactLocation, canViewPlayerFullRoute, filterRecordDataByVisibility, getPublicJourneyInfo } from "../src/services/visibility/visibilityService.js";
import { getPublicRecordsDuringGame } from "../src/services/records/recordService.js";
import { filterBlindBoxDataByVisibility } from "../src/services/blindBoxes/blindBoxService.js";

async function main() {
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });

  const hostPlayer = await createPlayer({
    dataAccessLayer,
    userId: "visibility-host",
    authUserId: "auth-visibility-host",
    displayName: "Host",
  });

  const memberPlayer = await createPlayer({
    dataAccessLayer,
    userId: "visibility-member",
    authUserId: "auth-visibility-member",
    displayName: "Member",
  });

  const outsiderPlayer = await createPlayer({
    dataAccessLayer,
    userId: "visibility-outsider",
    authUserId: "auth-visibility-outsider",
    displayName: "Outsider",
  });

  const mapData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.MAPS,
    data: {
      name: "Visibility Smoke Map",
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
    name: "Visibility Smoke Game",
  });

  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[1] },
  });

  const publicJourney = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.JOURNEYS,
    data: {
      gameId: gameData.id,
      playerId: memberPlayer.id,
      fromLocationId: startLocation.id,
      toLocationId: goalLocation.id,
      transportType: "local_train",
      ticketIdList: [],
      departureTime: "2026-07-10T10:00:00+08:00",
      arrivalTime: "2026-07-10T10:30:00+08:00",
      status: "reserved",
      isLocked: false,
      createdAt: new Date().toISOString(),
    },
  });

  const exactLocationSelf = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const exactLocationOther = await canViewPlayerExactLocation({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    targetPlayerId: memberPlayer.id,
  });

  const publicJourneySelf = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const publicJourneyOther = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    targetPlayerId: memberPlayer.id,
  });

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
    requestingPlayerId: outsiderPlayer.id,
    recordData,
    visibilityMode: "during_game",
  });

  const publicRecords = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    filterOptions: { playerId: memberPlayer.id },
  });
  const publicRecordsPaged = await getPublicRecordsDuringGame({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    filterOptions: { playerId: memberPlayer.id },
    queryOptions: { sortBy: "createdAt", sortDirection: "desc", limit: 1, offset: 0 },
  });

  const blindBox = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.BLIND_BOXES,
    data: {
      gameId: gameData.id,
      locationId: startLocation.id,
      effectData: { effectType: "money", operator: "+=", value: 100 },
      status: "hidden_effect",
      openedStatus: false,
      openedBy: null,
      openedAt: null,
      createdBy: hostPlayer.id,
      createdAt: new Date().toISOString(),
    },
  });

  const filteredBlindBox = await filterBlindBoxDataByVisibility({
    dataAccessLayer,
    gameId: gameData.id,
    requesterId: outsiderPlayer.id,
    blindBoxData: blindBox,
    visibilityMode: "during_game",
  });

  assert.equal(exactLocationSelf.canView, true);
  assert.equal(exactLocationOther.canView, false);
  assert.equal(publicJourneySelf.publicJourneyInfo?.journeyId, publicJourney.id);
  assert.equal(publicJourneyOther.publicJourneyInfo?.journeyId, publicJourney.id);
  const fullRouteSelf = await canViewPlayerFullRoute({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: memberPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const fullRouteOtherBeforeReview = await canViewPlayerFullRoute({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  await dataAccessLayer.updateRecordById({
    collectionName: CollectionName.GAMES,
    recordId: gameData.id,
    data: { status: GameStatus[2] },
  });
  const fullRouteOtherAfterReview = await canViewPlayerFullRoute({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  const publicJourneyOtherAfterReview = await getPublicJourneyInfo({
    dataAccessLayer,
    gameId: gameData.id,
    requestingPlayerId: outsiderPlayer.id,
    targetPlayerId: memberPlayer.id,
  });
  assert.equal(filteredRecord.payload?.visibleNote, "ok");
  assert.equal(filteredRecord.payload?.currentLocationId, undefined);
  assert.equal(filteredRecord.payload?.fullRoute, undefined);
  assert.equal(filteredRecord.payload?.privateState, undefined);
  assert.equal(fullRouteSelf.canView, true);
  assert.equal(fullRouteOtherBeforeReview.canView, false);
  assert.equal(fullRouteOtherAfterReview.canView, true);
  assert.equal(publicJourneyOtherAfterReview.publicJourneyInfo?.journeyId, publicJourney.id);
  assert.equal(Array.isArray(publicRecords.publicRecordList), true);
  assert.equal(publicRecords.publicRecordList.length, 1);
  assert.equal(Array.isArray(publicRecordsPaged.publicRecordList), true);
  assert.equal(publicRecordsPaged.publicRecordList.length <= 1, true);
  assert.equal(filteredBlindBox.effectData, undefined);

  console.log("visibility-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
