import { ErrorCode } from "../../constants/errorCodes.js";
import { AppError, assert } from "../../lib/appError.js";
import { CollectionName } from "../../constants/collectionNames.js";
import { getGame } from "../games/gameService.js";

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

function resolveEffectiveOperatorPlayerId({ authContext, operatorPlayerId }) {
  if (authContext?.playerId) {
    return authContext.playerId;
  }

  if (!isOperatorFallbackEnabled()) {
    return null;
  }

  return operatorPlayerId ?? null;
}

export async function getGameAccessProfile({
  dataAccessLayer,
  gameId,
  authContext,
  operatorPlayerId = null,
  targetPlayerId = null,
}) {
  const effectiveOperatorPlayerId = resolveEffectiveOperatorPlayerId({
    authContext,
    operatorPlayerId,
  });

  const gameData = await getGame({ dataAccessLayer, gameId });
  const gamePlayerRecord = effectiveOperatorPlayerId
    ? await dataAccessLayer.findOneRecord({
        collectionName: CollectionName.GAME_PLAYERS,
        filterOptions: {
          gameId,
          playerId: effectiveOperatorPlayerId,
        },
      })
    : null;

  const isAuthenticated = Boolean(effectiveOperatorPlayerId);
  const isHost = isAuthenticated && gameData.hostPlayerId === effectiveOperatorPlayerId;
  const isJoinedGame = Boolean(gamePlayerRecord);
  const isTargetPlayer = Boolean(targetPlayerId) && effectiveOperatorPlayerId === targetPlayerId;

  return {
    gameId,
    playerId: effectiveOperatorPlayerId,
    targetPlayerId,
    isAuthenticated,
    isHost,
    isJoinedGame,
    isTargetPlayer,
    canViewHostDashboard: isHost,
    canManageGame: isHost,
    canAccessTargetPlayerSelfData: isTargetPlayer,
    authSource: authContext?.source ?? "anonymous",
    roleSet: authContext?.roleSet ?? [],
    usedOperatorFallback: authContext?.usedOperatorFallback ?? false,
    gamePlayerRecord,
  };
}

export async function assertGameHostAccess({
  dataAccessLayer,
  gameId,
  authContext,
  operatorPlayerId,
}) {
  const effectiveOperatorPlayerId = resolveEffectiveOperatorPlayerId({
    authContext,
    operatorPlayerId,
  });

  assert(effectiveOperatorPlayerId, () => new AppError({
    code: ErrorCode.FORBIDDEN,
    message: "Authenticated player context is required for host-only operation",
    detail: {
      gameId,
      authSource: authContext?.source ?? "anonymous",
    },
  }));

  const gameData = await getGame({ dataAccessLayer, gameId });
  assert(gameData.hostPlayerId === effectiveOperatorPlayerId, () => new AppError({
    code: ErrorCode.FORBIDDEN,
    message: "Only host player can perform this operation",
    detail: {
      gameId,
      operatorPlayerId: effectiveOperatorPlayerId,
      hostPlayerId: gameData.hostPlayerId,
      authSource: authContext?.source ?? "anonymous",
    },
  }));

  return {
    allowed: true,
    gameData,
    operatorPlayerId: effectiveOperatorPlayerId,
  };
}

export async function assertSelfAccess({
  authContext,
  operatorPlayerId,
  targetPlayerId,
  detail = {},
}) {
  const effectiveOperatorPlayerId = resolveEffectiveOperatorPlayerId({
    authContext,
    operatorPlayerId,
  });

  assert(effectiveOperatorPlayerId, () => new AppError({
    code: ErrorCode.FORBIDDEN,
    message: "Authenticated player context is required for player operation",
    detail: {
      ...detail,
      authSource: authContext?.source ?? "anonymous",
    },
  }));

  assert(effectiveOperatorPlayerId === targetPlayerId, () => new AppError({
    code: ErrorCode.FORBIDDEN,
    message: "Player can only access their own data",
    detail: {
      ...detail,
      operatorPlayerId: effectiveOperatorPlayerId,
      targetPlayerId,
      authSource: authContext?.source ?? "anonymous",
    },
  }));

  return {
    allowed: true,
    operatorPlayerId: effectiveOperatorPlayerId,
  };
}
