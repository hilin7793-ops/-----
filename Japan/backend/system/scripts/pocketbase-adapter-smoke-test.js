import {
  CollectionName,
  createDataAccessLayer,
  createPocketBaseRestAdapter,
} from "../src/index.js";
import { getPocketBaseTestConfig } from "./pocketbase-test-utils.js";

async function main() {
  let pocketBaseConfig;
  try {
    pocketBaseConfig = getPocketBaseTestConfig();
  } catch (error) {
    console.log("pocketbaseAdapterSmokeSkipped", error.message);
    return;
  }

  const adapter = createPocketBaseRestAdapter({
    ...pocketBaseConfig,
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
