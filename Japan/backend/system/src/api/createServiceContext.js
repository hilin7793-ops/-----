import { createDataAccessLayer } from "../services/data/createDataAccessLayer.js";
import { createInMemoryDataAccessAdapter } from "../services/data/inMemoryDataAccessAdapter.js";
import { createPocketBaseRestAdapter } from "../services/data/pocketBaseRestAdapter.js";

export function createServiceContext({
  dataAccessLayer,
  adapter,
  mode = "pocketbase",
  pocketbase = {},
  seed = {},
} = {}) {
  if (dataAccessLayer) {
    return { dataAccessLayer };
  }

  if (adapter) {
    return {
      dataAccessLayer: createDataAccessLayer(adapter),
    };
  }

  if (mode === "memory") {
    return {
      dataAccessLayer: createDataAccessLayer(createInMemoryDataAccessAdapter(seed)),
    };
  }

  return {
    dataAccessLayer: createDataAccessLayer(createPocketBaseRestAdapter({
      baseUrl: pocketbase.baseUrl ?? process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090",
      adminEmail: pocketbase.adminEmail ?? process.env.POCKETBASE_ADMIN_EMAIL,
      adminPassword: pocketbase.adminPassword ?? process.env.POCKETBASE_ADMIN_PASSWORD,
      authToken: pocketbase.authToken ?? process.env.POCKETBASE_AUTH_TOKEN ?? null,
      requireAuth: false,
    })),
  };
}
