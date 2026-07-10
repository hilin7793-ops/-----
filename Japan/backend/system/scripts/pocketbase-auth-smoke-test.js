import { createPlayer, createGame, createMap, addLocation, setStartLocation, setGoalLocation, initializePlayerForGame, createDataAccessLayer, createPocketBaseRestAdapter, TransportType } from "../src/index.js";
import { createAppServer } from "../src/api/createAppServer.js";
import { getPocketBaseTestConfig } from "./pocketbase-test-utils.js";

function testStamp() {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `auth-smoke-${iso}`;
}

async function createAuthUser({ baseUrl, email, password, name }) {
  const createResponse = await fetch(`${baseUrl}/api/collections/users/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      passwordConfirm: password,
      name,
    }),
  });

  const createPayload = await createResponse.json();
  if (!createResponse.ok) {
    throw new Error(`Failed to create auth user: ${JSON.stringify(createPayload)}`);
  }

  const authResponse = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identity: email,
      password,
    }),
  });
  const authPayload = await authResponse.json();
  if (!authResponse.ok) {
    throw new Error(`Failed to auth user: ${JSON.stringify(authPayload)}`);
  }

  return {
    user: createPayload,
    token: authPayload.token,
  };
}

async function main() {
  const pocketBaseConfig = getPocketBaseTestConfig();
  process.env.POCKETBASE_AUTH_COLLECTION = process.env.POCKETBASE_AUTH_COLLECTION ?? "users";
  process.env.POCKETBASE_URL = pocketBaseConfig.baseUrl;

  const adapter = createPocketBaseRestAdapter({
    ...pocketBaseConfig,
    requireAuth: false,
  });
  const dataAccessLayer = createDataAccessLayer(adapter);

  const stamp = testStamp();
  const email = `${stamp}@example.com`;
  const password = "AuthSmoke123";
  const authUser = await createAuthUser({
    baseUrl: pocketBaseConfig.baseUrl,
    email,
    password,
    name: `Auth Smoke ${stamp}`,
  });

  const player = await createPlayer({
    dataAccessLayer,
    userId: `player-${stamp}`,
    authUserId: authUser.user.id,
    displayName: `Player ${stamp}`,
    metadata: {},
  });

  const map = await createMap({
    dataAccessLayer,
    mapName: `Auth Map ${stamp}`,
    description: "PocketBase auth smoke map",
    countryOrRegion: "Japan",
    availableTransportTypes: [TransportType.LOCAL_TRAIN],
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

  await setStartLocation({ dataAccessLayer, mapId: map.id, locationId: startLocation.id });
  await setGoalLocation({ dataAccessLayer, mapId: map.id, locationId: goalLocation.id });

  const game = await createGame({
    dataAccessLayer,
    name: `Auth Game ${stamp}`,
    hostPlayerId: player.id,
    mapId: map.id,
    startLocationId: startLocation.id,
    goalLocationId: goalLocation.id,
    initialMoney: 5000,
    gameSettings: {},
  });

  await initializePlayerForGame({
    dataAccessLayer,
    gameId: game.id,
    playerId: player.id,
    startLocationId: startLocation.id,
    initialMoney: 5000,
  });

  const server = createAppServer({ dataAccessLayer });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(8790, "127.0.0.1", resolve);
  });

  try {
    const moneyResponse = await fetch(`http://127.0.0.1:8790/games/${game.id}/players/${player.id}/money`, {
      headers: {
        Authorization: `Bearer ${authUser.token}`,
      },
    });
    const moneyPayload = await moneyResponse.json();
    console.log("pocketbaseAuthSelfAccess", moneyPayload.success === true && moneyPayload.data?.money === 5000);

    const checklistResponse = await fetch(`http://127.0.0.1:8790/games/${game.id}/checklist?currentTime=2026-07-09T06:35:00%2B08:00`, {
      headers: {
        Authorization: `Bearer ${authUser.token}`,
      },
    });
    const checklistPayload = await checklistResponse.json();
    console.log("pocketbaseAuthHostAccess", checklistPayload.success === true && Boolean(checklistPayload.data?.checklist?.summary));

    const sessionResponse = await fetch("http://127.0.0.1:8790/auth/session", {
      headers: {
        Authorization: `Bearer ${authUser.token}`,
      },
    });
    const sessionPayload = await sessionResponse.json();
    console.log(
      "pocketbaseAuthTokenVerified",
      sessionPayload.success === true &&
        sessionPayload.data?.authMode === "pocketbase_token" &&
        sessionPayload.data?.authVerified === true &&
        sessionPayload.data?.authTokenPresent === true &&
        sessionPayload.data?.authUserId === authUser.user.id,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
