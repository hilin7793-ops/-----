import {
  assertGameHostAccess,
  assertSelfAccess,
  createBlindBox,
  createBlindBoxBatch,
  deleteBlindBox,
  deleteBlindBoxBatch,
  getBlindBox,
  getBlindBoxReviewData,
  getGame,
  getPlayerLocation,
  getPublicBlindBoxInfo,
  listBlindBoxes,
  openBlindBox,
  updateBlindBox,
  updateBlindBoxBatch,
  validateBlindBoxSetup,
} from "../../index.js";
import { buildBlindBoxReviewQueryOptions, buildQueryOptions } from "../queryOptions.js";

function parseBooleanQueryValue(value) {
  if (value === true || value === false) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

// Authorization in this module is centered on `authContext`.
// Legacy compatibility inputs are still accepted where needed by handlers.
export function createBlindBoxRoutes({ dataAccessLayer }) {
  return [
    {
      method: "POST",
      template: "/blind-boxes",
      handler: async ({ body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: body.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 201,
          payload: {
            success: true,
            data: await createBlindBox({ dataAccessLayer, ...body }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/blind-boxes/batch",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: params.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 201,
          payload: {
            success: true,
            data: await createBlindBoxBatch({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxConfigList: body.blindBoxConfigList,
              createdBy: body.createdBy,
            }),
          },
        };
      },
    },
    {
      method: "DELETE",
      template: "/games/:gameId/blind-boxes/batch",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: params.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await deleteBlindBoxBatch({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxIdList: body.blindBoxIdList ?? [],
              deletedBy: body.deletedBy,
            }),
          },
        };
      },
    },
    {
      method: "PATCH",
      template: "/games/:gameId/blind-boxes/batch",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: params.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await updateBlindBoxBatch({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxUpdateList: body.blindBoxUpdateList ?? [],
              updatedBy: body.updatedBy,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/blind-boxes/validate",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: params.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await validateBlindBoxSetup({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxConfigList: body.blindBoxConfigList ?? [],
            }),
          },
        };
      },
    },
    {
      method: "PATCH",
      template: "/blind-boxes/:blindBoxId",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: body.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await updateBlindBox({
              dataAccessLayer,
              blindBoxId: params.blindBoxId,
              ...body,
            }),
          },
        };
      },
    },
    {
      method: "DELETE",
      template: "/blind-boxes/:blindBoxId",
      handler: async ({ params, body, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: body.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await deleteBlindBox({
              dataAccessLayer,
              blindBoxId: params.blindBoxId,
              gameId: body.gameId,
              deletedBy: body.deletedBy,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/blind-boxes",
      handler: async ({ params, query, authContext }) => {
        const visibilityMode = query.visibilityMode ?? "player";
        if (visibilityMode === "admin") {
          await assertGameHostAccess({
            dataAccessLayer,
            gameId: params.gameId,
            authContext,
            operatorPlayerId: query.operatorPlayerId,
          });
        }

        return {
          statusCode: 200,
          payload: {
            success: true,
            ...(await listBlindBoxes({
              dataAccessLayer,
              gameId: params.gameId,
              requesterId: authContext?.playerId ?? query.requesterId ?? null,
              visibilityMode,
              filterOptions: {
                ...(query.locationId ? { locationId: query.locationId } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(parseBooleanQueryValue(query.openedStatus) !== null
                  ? { openedStatus: parseBooleanQueryValue(query.openedStatus) }
                  : {}),
              },
              queryOptions: buildQueryOptions(query),
            })),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/blind-boxes/public",
      handler: async ({ params, query }) => ({
        statusCode: 200,
          payload: {
            success: true,
            data: await getPublicBlindBoxInfo({
              dataAccessLayer,
              gameId: params.gameId,
              queryOptions: buildQueryOptions(query),
            }),
          },
        }),
    },
    {
      method: "GET",
      template: "/games/:gameId/blind-boxes/review",
      handler: async ({ params, query, authContext }) => {
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: params.gameId,
          authContext,
          operatorPlayerId: query.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await getBlindBoxReviewData({
              dataAccessLayer,
              gameId: params.gameId,
              queryOptions: buildBlindBoxReviewQueryOptions(query),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/blind-boxes/:blindBoxId",
      handler: async ({ params, query, authContext }) => {
        const visibilityMode = query.visibilityMode ?? "player";
        if (visibilityMode === "admin") {
          await assertGameHostAccess({
            dataAccessLayer,
            gameId: params.gameId,
            authContext,
            operatorPlayerId: query.operatorPlayerId,
          });
        }

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await getBlindBox({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxId: params.blindBoxId,
              requesterId: authContext?.playerId ?? query.requestingPlayerId ?? query.requesterId ?? null,
              visibilityMode,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/blind-boxes/:blindBoxId/open",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId, blindBoxId: params.blindBoxId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await openBlindBox({
              dataAccessLayer,
              gameId: params.gameId,
              blindBoxId: params.blindBoxId,
              playerId: body.playerId,
              currentTime: body.currentTime,
              getPlayerLocation: async ({ gameId, playerId }) =>
                getPlayerLocation({ dataAccessLayer, gameId, playerId }),
              getGame: async ({ gameId }) =>
                getGame({ dataAccessLayer, gameId }),
            }),
          },
        };
      },
    },
  ];
}
