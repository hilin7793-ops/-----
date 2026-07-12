import {
  assertGameHostAccess,
  assertSelfAccess,
  approveTrafficIncidentRequest,
  getTrafficIncidentRequest,
  getTrafficIncidentReviewSummary,
  listTrafficIncidentRequests,
  rejectTrafficIncidentRequest,
  reviewTrafficIncidentRequestsBatch,
  submitTrafficIncidentRequest,
} from "../../index.js";
import { buildQueryOptions } from "../queryOptions.js";

// Auth uses `authContext`; legacy compatibility inputs are kept only as handler fallbacks.
export function createTrafficIncidentRoutes({ dataAccessLayer }) {
  return [
    {
      method: "GET",
      template: "/games/:gameId/traffic-incidents",
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
            ...(await listTrafficIncidentRequests({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: query.playerId ?? null,
              journeyId: query.journeyId ?? null,
              status: query.status ?? null,
              filterOptions: {
                ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
                ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
              },
              queryOptions: buildQueryOptions(query),
            })),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/traffic-incidents/review-summary",
      handler: async ({ params, authContext, query }) => {
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
            data: await getTrafficIncidentReviewSummary({
              dataAccessLayer,
              gameId: params.gameId,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/traffic-incidents",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId, journeyId: body.journeyId },
        });

        return {
          statusCode: 201,
          payload: {
            success: true,
            data: await submitTrafficIncidentRequest({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: body.playerId,
              journeyId: body.journeyId,
              evidenceList: body.evidenceList ?? [],
              actualEndLocationId: body.actualEndLocationId,
              actualEndedAt: body.actualEndedAt,
              description: body.description ?? "",
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/traffic-incidents/review-batch",
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
            data: await reviewTrafficIncidentRequestsBatch({
              dataAccessLayer,
              gameId: params.gameId,
              requestIdList: body.requestIdList ?? [],
              decision: body.decision,
              reviewerId: body.reviewerId,
              reviewNote: body.reviewNote ?? "",
              rejectReason: body.rejectReason ?? "",
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/traffic-incidents/:requestId",
      handler: async ({ params, query, authContext }) => {
        const requestData = await getTrafficIncidentRequest({
          dataAccessLayer,
          requestId: params.requestId,
        });
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: requestData.gameId,
          authContext,
          operatorPlayerId: query.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: requestData,
          },
        };
      },
    },
    {
      method: "POST",
      template: "/traffic-incidents/:requestId/approve",
      handler: async ({ params, body, authContext }) => {
        const requestData = await getTrafficIncidentRequest({
          dataAccessLayer,
          requestId: params.requestId,
        });
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: requestData.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await approveTrafficIncidentRequest({
              dataAccessLayer,
              requestId: params.requestId,
              reviewerId: body.reviewerId,
              reviewNote: body.reviewNote ?? "",
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/traffic-incidents/:requestId/reject",
      handler: async ({ params, body, authContext }) => {
        const requestData = await getTrafficIncidentRequest({
          dataAccessLayer,
          requestId: params.requestId,
        });
        await assertGameHostAccess({
          dataAccessLayer,
          gameId: requestData.gameId,
          authContext,
          operatorPlayerId: body.operatorPlayerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await rejectTrafficIncidentRequest({
              dataAccessLayer,
              requestId: params.requestId,
              reviewerId: body.reviewerId,
              rejectReason: body.rejectReason ?? "",
            }),
          },
        };
      },
    },
  ];
}
