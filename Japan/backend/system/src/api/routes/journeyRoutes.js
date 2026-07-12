import {
  assertSelfAccess,
  cancelJourney,
  completeJourney,
  createJourney,
  getJourney,
  getGameJourneyActionQueueSummary,
  getPlayerCurrentJourney,
  getPlayerReservedJourney,
  listPlayerJourneys,
  startJourney,
  updateJourney,
} from "../../index.js";
import { buildQueryOptions } from "../queryOptions.js";

// Authorization uses `authContext`; `operatorPlayerId` is compatibility input.
export function createJourneyRoutes({ dataAccessLayer }) {
  return [
    {
      method: "POST",
      template: "/journeys",
      handler: async ({ body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: body.gameId },
        });

        return {
          statusCode: 201,
          payload: {
            success: true,
            data: await createJourney({ dataAccessLayer, ...body }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/journeys/:journeyId/start",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: body.gameId, journeyId: params.journeyId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await startJourney({
              dataAccessLayer,
              gameId: body.gameId,
              playerId: body.playerId,
              journeyId: params.journeyId,
              startedAt: body.startedAt,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/journeys/:journeyId/complete",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: body.gameId, journeyId: params.journeyId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await completeJourney({
              dataAccessLayer,
              gameId: body.gameId,
              playerId: body.playerId,
              journeyId: params.journeyId,
              completedAt: body.completedAt,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/journeys/:journeyId/cancel",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: body.gameId, journeyId: params.journeyId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await cancelJourney({
              dataAccessLayer,
              gameId: body.gameId,
              playerId: body.playerId,
              journeyId: params.journeyId,
              reason: body.reason ?? "",
            }),
          },
        };
      },
    },
    {
      method: "PATCH",
      template: "/journeys/:journeyId",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: body.gameId, journeyId: params.journeyId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await updateJourney({
              dataAccessLayer,
              journeyId: params.journeyId,
              ...body,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/journeys/:journeyId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getJourney({ dataAccessLayer, journeyId: params.journeyId }),
        },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/journeys",
      handler: async ({ params, query, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: query.operatorPlayerId,
          targetPlayerId: params.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            ...(await listPlayerJourneys({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
              queryOptions: buildQueryOptions(query),
            })),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/journeys/current",
      handler: async ({ params, query, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: query.operatorPlayerId,
          targetPlayerId: params.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await getPlayerCurrentJourney({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/journeys/reserved",
      handler: async ({ params, query, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: query.operatorPlayerId,
          targetPlayerId: params.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await getPlayerReservedJourney({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys/action-queue/summary",
      handler: async ({ params, query, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: query.operatorPlayerId,
          targetPlayerId: query.operatorPlayerId ?? authContext?.playerId ?? null,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await getGameJourneyActionQueueSummary({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
  ];
}
