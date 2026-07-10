import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import { CollectionName, createGame, createPlayer, getGameAccessProfile, joinGame } from "../src/index.js";

async function main() {
  const { dataAccessLayer } = createServiceContext({ mode: "memory" });

  const hostPlayer = await createPlayer({
    dataAccessLayer,
    userId: "access-host",
    authUserId: "auth-access-host",
    displayName: "Host",
  });

  const memberPlayer = await createPlayer({
    dataAccessLayer,
    userId: "access-member",
    authUserId: "auth-access-member",
    displayName: "Member",
  });

  const outsiderPlayer = await createPlayer({
    dataAccessLayer,
    userId: "access-outsider",
    authUserId: "auth-access-outsider",
    displayName: "Outsider",
  });

  const mapData = await dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.MAPS,
    data: {
      name: "Access Smoke Map",
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
    name: "Access Smoke Game",
  });

  await joinGame({
    dataAccessLayer,
    gameId: gameData.id,
    playerId: memberPlayer.id,
  });

  const hostAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { playerId: hostPlayer.id, source: "test" },
    targetPlayerId: hostPlayer.id,
  });

  const memberAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { playerId: memberPlayer.id, source: "test" },
    targetPlayerId: memberPlayer.id,
  });

  const outsiderAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { playerId: outsiderPlayer.id, source: "test" },
    targetPlayerId: hostPlayer.id,
  });

  assert.equal(hostAccess.canObserveGame, true);
  assert.equal(hostAccess.canReviewGame, true);
  assert.equal(hostAccess.canManageGame, true);

  assert.equal(memberAccess.canObserveGame, true);
  assert.equal(memberAccess.canReviewGame, true);
  assert.equal(memberAccess.canManageGame, false);

  assert.equal(outsiderAccess.canObserveGame, false);
  assert.equal(outsiderAccess.canReviewGame, false);
  assert.equal(outsiderAccess.isJoinedGame, false);

  console.log("access-control-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
