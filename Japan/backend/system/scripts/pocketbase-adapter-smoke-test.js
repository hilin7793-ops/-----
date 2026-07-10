import {
  CollectionName,
  createDataAccessLayer,
  createPocketBaseRestAdapter,
} from "../src/index.js";

async function main() {
  const {
    POCKETBASE_URL,
    POCKETBASE_ADMIN_EMAIL,
    POCKETBASE_ADMIN_PASSWORD,
    POCKETBASE_AUTH_TOKEN,
  } = process.env;

  if (!POCKETBASE_AUTH_TOKEN && (!POCKETBASE_ADMIN_EMAIL || !POCKETBASE_ADMIN_PASSWORD)) {
    throw new Error(
      "Set POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD, or POCKETBASE_AUTH_TOKEN, before running pocketbase adapter smoke test.",
    );
  }

  const adapter = createPocketBaseRestAdapter({
    baseUrl: POCKETBASE_URL ?? "http://127.0.0.1:8090",
    adminEmail: POCKETBASE_ADMIN_EMAIL,
    adminPassword: POCKETBASE_ADMIN_PASSWORD,
    authToken: POCKETBASE_AUTH_TOKEN ?? null,
  });

  const dal = createDataAccessLayer(adapter);

  const games = await dal.listRecords({
    collectionName: CollectionName.GAMES,
    filterOptions: {},
  });

  const firstGameOnly = await dal.listRecords({
    collectionName: CollectionName.GAMES,
    filterOptions: {},
    queryOptions: { limit: 1, offset: 0 },
  });

  const secondGameOnly = await dal.listRecords({
    collectionName: CollectionName.GAMES,
    filterOptions: {},
    queryOptions: { limit: 1, offset: 1 },
  });

  console.log("gamesCount", games.length);
  console.log("sampleGame", games[0] ?? null);
  console.log("limitApplied", firstGameOnly.length <= 1);
  console.log("offsetApplied", games.length < 2 || firstGameOnly[0]?.id !== secondGameOnly[0]?.id);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
