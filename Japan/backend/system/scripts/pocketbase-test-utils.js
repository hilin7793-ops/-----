export function getPocketBaseTestConfig({
  requireAdmin = true,
} = {}) {
  const {
    POCKETBASE_URL,
    POCKETBASE_ADMIN_EMAIL,
    POCKETBASE_ADMIN_PASSWORD,
    POCKETBASE_AUTH_TOKEN,
  } = process.env;

  const baseUrl = POCKETBASE_URL ?? "http://127.0.0.1:8090";
  const hasAuthToken = Boolean(POCKETBASE_AUTH_TOKEN);
  const hasAdminCredentials = Boolean(POCKETBASE_ADMIN_EMAIL && POCKETBASE_ADMIN_PASSWORD);

  if (requireAdmin && !hasAuthToken && !hasAdminCredentials) {
    throw new Error(
      "PocketBase test requires POCKETBASE_AUTH_TOKEN or POCKETBASE_ADMIN_EMAIL/POCKETBASE_ADMIN_PASSWORD.",
    );
  }

  return {
    baseUrl,
    adminEmail: POCKETBASE_ADMIN_EMAIL,
    adminPassword: POCKETBASE_ADMIN_PASSWORD,
    authToken: POCKETBASE_AUTH_TOKEN ?? null,
    hasAuthToken,
    hasAdminCredentials,
  };
}
