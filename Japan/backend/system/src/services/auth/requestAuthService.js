import { CollectionName } from "../../constants/collectionNames.js";

function getBearerToken(request) {
  const authorization = request.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function getDevAuthUserId(request) {
  return request.headers["x-auth-user-id"]?.trim?.() || null;
}

function getFallbackOperatorPlayerId({ body = {}, query = {} }) {
  return body.operatorPlayerId ?? query.operatorPlayerId ?? null;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? "").replace(/\/+$/, "");
}

function isOperatorFallbackEnabled() {
  if (process.env.JAPAN_DISABLE_OPERATOR_FALLBACK === "1") {
    return false;
  }

  if (process.env.JAPAN_AUTH_STRICT === "1") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.JAPAN_ENABLE_OPERATOR_FALLBACK === "1";
}

function isDevAuthUserFallbackEnabled() {
  if (process.env.JAPAN_DISABLE_DEV_AUTH_USER_FALLBACK === "1") {
    return false;
  }

  if (process.env.JAPAN_AUTH_STRICT === "1") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.JAPAN_ENABLE_DEV_AUTH_USER_FALLBACK === "1";
}

function isAuthStrictEnabled() {
  return process.env.JAPAN_AUTH_STRICT === "1";
}

async function tryResolvePocketBaseAuthUser({
  request,
  fetchImpl = globalThis.fetch,
}) {
  const authToken = getBearerToken(request);
  const baseUrl = normalizeBaseUrl(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090");
  const authCollection = process.env.POCKETBASE_AUTH_COLLECTION ?? "";

  if (!authToken || !authCollection || typeof fetchImpl !== "function") {
    return {
      authToken,
      authTokenPresent: Boolean(authToken),
      authCollection,
      authUserId: null,
      authRecord: null,
      authVerified: false,
      authError: null,
    };
  }

  try {
    const response = await fetchImpl(
      `${baseUrl}/api/collections/${authCollection}/auth-refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        authToken,
        authTokenPresent: true,
        authCollection,
        authUserId: null,
        authRecord: null,
        authVerified: false,
        authError: `auth_refresh_failed_${response.status}`,
      };
    }

    const payload = await response.json();
    return {
      authToken,
      authTokenPresent: true,
      authCollection,
      authUserId: payload?.record?.id ?? null,
      authRecord: payload?.record ?? null,
      authVerified: Boolean(payload?.record?.id),
      authError: null,
    };
  } catch (error) {
    return {
      authToken,
      authTokenPresent: true,
      authCollection,
      authUserId: null,
      authRecord: null,
      authVerified: false,
      authError: error?.message ?? "auth_refresh_failed",
    };
  }
}

export async function resolveRequestAuthContext({
  request,
  dataAccessLayer,
  body = {},
  query = {},
}) {
  const pocketBaseAuth = await tryResolvePocketBaseAuthUser({ request });
  const authToken = pocketBaseAuth.authToken;
  const authTokenPresent = pocketBaseAuth.authTokenPresent ?? Boolean(authToken);
  const devAuthUserFallbackEnabled = isDevAuthUserFallbackEnabled();
  const devAuthUserId = devAuthUserFallbackEnabled ? getDevAuthUserId(request) : null;
  const authUserId = pocketBaseAuth.authVerified
    ? pocketBaseAuth.authUserId
    : authTokenPresent
      ? null
      : devAuthUserId;
  const operatorFallbackEnabled = isOperatorFallbackEnabled();
  const authStrictEnabled = isAuthStrictEnabled();
  const fallbackOperatorPlayerId = operatorFallbackEnabled ? getFallbackOperatorPlayerId({ body, query }) : null;

  let playerRecord = null;
  if (authUserId) {
    playerRecord = await dataAccessLayer.findOneRecord({
      collectionName: CollectionName.PLAYERS,
      filterOptions: { authUserId },
    });
  }

  const playerId = playerRecord?.id ?? fallbackOperatorPlayerId ?? null;
  const roleSet = playerId ? ["player"] : [];
  const authMode = pocketBaseAuth.authVerified
    ? "pocketbase_token"
    : authTokenPresent
      ? "pocketbase_token_failed"
      : playerRecord
        ? "dev_auth_user"
        : fallbackOperatorPlayerId
          ? "operator_fallback"
          : "anonymous";
  const authPolicy = {
    strict: authStrictEnabled,
    operatorFallbackEnabled,
    devAuthUserFallbackEnabled,
    productionSafe: authStrictEnabled || process.env.NODE_ENV === "production",
  };

  return {
    authToken,
    authTokenPresent,
    authUserId,
    authCollection: pocketBaseAuth.authCollection || null,
    authVerified: pocketBaseAuth.authVerified,
    authError: pocketBaseAuth.authError,
    authRecord: pocketBaseAuth.authRecord,
    playerId,
    playerRecord,
    roleSet,
    source: playerRecord
      ? pocketBaseAuth.authVerified
        ? "pocketbase_auth_mapping"
        : "dev_auth_user_mapping"
      : fallbackOperatorPlayerId
        ? "operator_player_fallback"
        : "anonymous",
    authMode,
    authPolicy,
    usedOperatorFallback: !playerRecord && Boolean(fallbackOperatorPlayerId),
    operatorFallbackEnabled,
    devAuthUserFallbackEnabled,
    authStrictEnabled,
    fallbackOperatorPlayerId,
  };
}
