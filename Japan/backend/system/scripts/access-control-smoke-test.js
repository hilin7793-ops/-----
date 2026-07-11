import assert from "node:assert/strict";
import { createServiceContext } from "../src/api/createServiceContext.js";
import {
  CollectionName,
  createGame,
  createPlayer,
  getGameAccessProfile,
  joinGame,
  assertGameHostAccess,
  assertSelfAccess,
} from "../src/index.js";
import { listBlindBoxes } from "../src/services/blindBoxes/blindBoxService.js";

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
  const anonymousAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { source: "anonymous" },
    targetPlayerId: hostPlayer.id,
  });
  const originalDisableOperatorFallback = process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  const originalAuthStrict = process.env.JAPAN_AUTH_STRICT;
  const originalOperatorFallback = process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  process.env.JAPAN_DISABLE_OPERATOR_FALLBACK = "0";
  process.env.JAPAN_AUTH_STRICT = "0";
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = "1";
  const operatorFallbackAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { source: "test" },
    operatorPlayerId: hostPlayer.id,
    targetPlayerId: hostPlayer.id,
  });
  process.env.JAPAN_DISABLE_OPERATOR_FALLBACK = "1";
  process.env.JAPAN_AUTH_STRICT = "0";
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = "1";
  const disabledOperatorFallbackAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { source: "test" },
    operatorPlayerId: hostPlayer.id,
    targetPlayerId: hostPlayer.id,
  });
  process.env.JAPAN_AUTH_STRICT = "1";
  process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = "1";
  const strictFallbackAccess = await getGameAccessProfile({
    dataAccessLayer,
    gameId: gameData.id,
    authContext: { source: "test" },
    operatorPlayerId: hostPlayer.id,
    targetPlayerId: hostPlayer.id,
  });
  if (originalAuthStrict === undefined) {
    delete process.env.JAPAN_AUTH_STRICT;
  } else {
    process.env.JAPAN_AUTH_STRICT = originalAuthStrict;
  }
  if (originalOperatorFallback === undefined) {
    delete process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  } else {
    process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = originalOperatorFallback;
  }
  if (originalDisableOperatorFallback === undefined) {
    delete process.env.JAPAN_DISABLE_OPERATOR_FALLBACK;
  } else {
    process.env.JAPAN_DISABLE_OPERATOR_FALLBACK = originalDisableOperatorFallback;
  }
  if (originalAuthStrict === undefined) {
    delete process.env.JAPAN_AUTH_STRICT;
  } else {
    process.env.JAPAN_AUTH_STRICT = originalAuthStrict;
  }
  if (originalOperatorFallback === undefined) {
    delete process.env.JAPAN_ENABLE_OPERATOR_FALLBACK;
  } else {
    process.env.JAPAN_ENABLE_OPERATOR_FALLBACK = originalOperatorFallback;
  }

  assert.equal(hostAccess.canObserveGame, true);
  assert.equal(hostAccess.canReviewGame, true);
  assert.equal(hostAccess.canManageGame, true);
  assert.equal(hostAccess.canAccessTargetPlayerSelfData, true);
  assert.equal(hostAccess.isTargetPlayer, true);

  assert.equal(memberAccess.canObserveGame, true);
  assert.equal(memberAccess.canReviewGame, true);
  assert.equal(memberAccess.canManageGame, false);
  assert.equal(memberAccess.canAccessTargetPlayerSelfData, true);
  assert.equal(memberAccess.isTargetPlayer, true);

  assert.equal(outsiderAccess.canObserveGame, false);
  assert.equal(outsiderAccess.canReviewGame, false);
  assert.equal(outsiderAccess.isJoinedGame, false);
  assert.equal(outsiderAccess.canAccessTargetPlayerSelfData, false);
  assert.equal(outsiderAccess.isTargetPlayer, false);

  assert.equal(anonymousAccess.isAuthenticated, false);
  assert.equal(anonymousAccess.canObserveGame, false);
  assert.equal(anonymousAccess.canReviewGame, false);
  assert.equal(anonymousAccess.canManageGame, false);
  assert.equal(anonymousAccess.canAccessTargetPlayerSelfData, false);
  assert.equal(anonymousAccess.isTargetPlayer, false);
  assert.equal(operatorFallbackAccess.isAuthenticated, true);
  assert.equal(operatorFallbackAccess.usedOperatorFallback, false);
  assert.equal(operatorFallbackAccess.isHost, true);
  assert.equal(operatorFallbackAccess.canAccessTargetPlayerSelfData, true);
  assert.equal(operatorFallbackAccess.isTargetPlayer, true);
  assert.equal(disabledOperatorFallbackAccess.isAuthenticated, false);
  assert.equal(disabledOperatorFallbackAccess.usedOperatorFallback, false);
  assert.equal(disabledOperatorFallbackAccess.authMode, "anonymous");
  assert.equal(disabledOperatorFallbackAccess.isJoinedGame, false);
  assert.equal(strictFallbackAccess.isAuthenticated, false);
  assert.equal(strictFallbackAccess.usedOperatorFallback, false);
  assert.equal(strictFallbackAccess.isJoinedGame, false);

  await assert.rejects(
    () => assertGameHostAccess({
      dataAccessLayer,
      gameId: gameData.id,
      authContext: { playerId: memberPlayer.id, source: "test" },
    }),
    (error) => error?.code === "FORBIDDEN",
  );

  await assert.rejects(
    () => assertSelfAccess({
      authContext: { playerId: memberPlayer.id, source: "test" },
      targetPlayerId: hostPlayer.id,
      detail: { scope: "player journey" },
    }),
    (error) => error?.code === "FORBIDDEN",
  );

  await assert.rejects(
    () => listBlindBoxes({
      dataAccessLayer,
      gameId: gameData.id,
      requesterId: outsiderPlayer.id,
      visibilityMode: "admin",
    }),
    (error) => error?.code === "FORBIDDEN",
  );

  console.log("access-control-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
