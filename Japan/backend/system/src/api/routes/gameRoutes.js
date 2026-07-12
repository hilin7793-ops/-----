import {
  addPlayerMoney,
  addTicketToPlayer,
  assertGameHostAccess,
  assertSelfAccess,
  canAfford,
  cancelJourneyBatch,
  consumePlayerBlindBoxSpecialState,
  createAuctionRound,
  createGame,
  deductPlayerMoney,
  endGame,
  getGameAccessProfile,
  getAuctionBids,
  getCurrentAuction,
  getGameChecklist,
  getGame,
  getGameRecords,
  getGameManagementSnapshot,
  getGameOverview,
  getGeneralShopItems,
  getGameJourneyActionQueue,
  getGameJourneyDashboard,
  getGameJourneyExceptionList,
  getAggregatedGameReviewData,
  getGameJourneySummary,
  listGameJourneys,
  lockJourneyBatch,
  unlockJourneyBatch,
  getPlayerLocation,
  getPlayerBlindBoxSpecialStates,
  getPlayerMoney,
  getPlayerRecords,
  getPlayerTickets,
  getPublicJourneyInfo,
  getPublicRecordsDuringGame,
  getRanking,
  initializeAuctionShop,
  initializeGeneralShop,
  joinGame,
  leaveGame,
  placeBid,
  processAllScheduledEvents,
  processGameChecklistActions,
  purchaseGeneralShopTicket,
  refreshGeneralShop,
  resolveAuction,
  startGame,
  updateGameSettings,
  canViewPlayerExactLocation,
} from "../../index.js";
import { buildQueryOptions } from "../queryOptions.js";

// Authorization uses `authContext`; legacy compatibility inputs remain supported.
export function createGameRoutes({ dataAccessLayer }) {
  return [
    {
      method: "POST",
      template: "/games",
      handler: async ({ body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.hostPlayerId,
        });

        return {
          statusCode: 201,
          payload: {
            success: true,
            data: await createGame({ dataAccessLayer, ...body }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getGame({ dataAccessLayer, gameId: params.gameId }),
        },
      }),
    },
    {
      method: "POST",
      template: "/games/:gameId/join",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await joinGame({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: body.playerId,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/leave",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await leaveGame({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: body.playerId,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/access",
      handler: async ({ params, query, authContext }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getGameAccessProfile({
            dataAccessLayer,
            gameId: params.gameId,
            authContext,
            operatorPlayerId: query.operatorPlayerId ?? null,
            targetPlayerId: query.targetPlayerId ?? null,
          }),
        },
      }),
    },
    {
      method: "PATCH",
      template: "/games/:gameId/settings",
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
            data: await updateGameSettings({
              dataAccessLayer,
              gameId: params.gameId,
              settings: body.settings ?? {},
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/start",
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
            data: await startGame({
              dataAccessLayer,
              gameId: params.gameId,
              startTime: body.startTime,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/end",
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
            data: await endGame({
              dataAccessLayer,
              gameId: params.gameId,
              endedAt: body.endedAt,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/scheduled-events/process",
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
            data: await processAllScheduledEvents({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: body.currentTime,
              addTicketToPlayer: async (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
              addPlayerMoney: async (input) => addPlayerMoney({ dataAccessLayer, ...input }),
              consumePlayerBlindBoxSpecialState: async (input) =>
                consumePlayerBlindBoxSpecialState({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys/dashboard",
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
            data: await getGameJourneyDashboard({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys/action-queue",
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
            data: await getGameJourneyActionQueue({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
              queryOptions: buildQueryOptions(query),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys/exceptions",
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
            data: await getGameJourneyExceptionList({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
              queryOptions: buildQueryOptions(query),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys/summary",
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
            data: await getGameJourneySummary({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/journeys/cancel-batch",
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
            data: await cancelJourneyBatch({
              dataAccessLayer,
              gameId: params.gameId,
              journeyIdList: body.journeyIdList ?? [],
              reason: body.reason ?? "",
              cancelledBy: body.cancelledBy ?? body.operatorPlayerId ?? authContext?.playerId ?? null,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/journeys",
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
            ...(await listGameJourneys({
              dataAccessLayer,
              gameId: params.gameId,
              filterOptions: {
                ...(query.playerId ? { playerId: query.playerId } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.transportType ? { transportType: query.transportType } : {}),
                ...(query.incidentRequestId ? { incidentRequestId: query.incidentRequestId } : {}),
                ...(query.isLocked !== undefined
                  ? { isLocked: query.isLocked === "true" }
                  : {}),
                ...(query.departureAfter ? { departureAfter: query.departureAfter } : {}),
                ...(query.departureBefore ? { departureBefore: query.departureBefore } : {}),
                ...(query.arrivalAfter ? { arrivalAfter: query.arrivalAfter } : {}),
                ...(query.arrivalBefore ? { arrivalBefore: query.arrivalBefore } : {}),
              },
              queryOptions: buildQueryOptions(query),
            })),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/journeys/lock-batch",
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
            data: await lockJourneyBatch({
              dataAccessLayer,
              gameId: params.gameId,
              journeyIdList: body.journeyIdList ?? [],
              reason: body.reason ?? "",
              lockedBy: body.lockedBy ?? body.operatorPlayerId ?? authContext?.playerId ?? null,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/journeys/unlock-batch",
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
            data: await unlockJourneyBatch({
              dataAccessLayer,
              gameId: params.gameId,
              journeyIdList: body.journeyIdList ?? [],
              reason: body.reason ?? "",
              unlockedBy: body.unlockedBy ?? body.operatorPlayerId ?? authContext?.playerId ?? null,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/checklist/process",
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
            data: await processGameChecklistActions({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: body.currentTime,
              addTicketToPlayer: async (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
              addPlayerMoney: async (input) => addPlayerMoney({ dataAccessLayer, ...input }),
              consumePlayerBlindBoxSpecialState: async (input) =>
                consumePlayerBlindBoxSpecialState({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/checklist",
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
            data: await getGameChecklist({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/overview",
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
            data: await getGameOverview({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/management-snapshot",
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
            data: await getGameManagementSnapshot({
              dataAccessLayer,
              gameId: params.gameId,
              currentTime: query.currentTime ?? new Date().toISOString(),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/ranking",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getRanking({
            dataAccessLayer,
            gameId: params.gameId,
          }),
        },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/records",
      handler: async ({ params, query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getGameRecords({
            dataAccessLayer,
            gameId: params.gameId,
            visibilityMode: query.visibilityMode ?? "post_game_review",
            filterOptions: {
              ...(query.playerId ? { playerId: query.playerId } : {}),
              ...(query.recordType ? { recordType: query.recordType } : {}),
              ...(query.action ? { action: query.action } : {}),
              ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
              ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
            },
            queryOptions: buildQueryOptions(query),
          }),
        },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/records/public",
      handler: async ({ params, query, authContext }) => ({
        statusCode: 200,
        payload: {
          success: true,
            data: await getPublicRecordsDuringGame({
              dataAccessLayer,
              gameId: params.gameId,
              requestingPlayerId: authContext?.playerId ?? query.requestingPlayerId ?? null,
              filterOptions: {
                ...(query.playerId ? { playerId: query.playerId } : {}),
                ...(query.recordType ? { recordType: query.recordType } : {}),
                ...(query.action ? { action: query.action } : {}),
                ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
                ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
              },
              queryOptions: buildQueryOptions(query),
            }),
          },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/review",
      handler: async ({ params, query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getAggregatedGameReviewData({
            dataAccessLayer,
            gameId: params.gameId,
            recordFilterOptions: {
              ...(query.playerId ? { playerId: query.playerId } : {}),
              ...(query.recordType ? { recordType: query.recordType } : {}),
              ...(query.action ? { action: query.action } : {}),
              ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
              ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
            },
            recordQueryOptions: buildQueryOptions(query),
            blindBoxFilterOptions: {
              ...(query.openedStatus ? { openedStatus: query.openedStatus === "true" } : {}),
              ...(query.locationId ? { locationId: query.locationId } : {}),
            },
            blindBoxEffectLogFilterOptions: {
              ...(query.blindBoxId ? { blindBoxId: query.blindBoxId } : {}),
              ...(query.playerId ? { playerId: query.playerId } : {}),
              ...(query.actionType ? { actionType: query.actionType } : {}),
            },
            blindBoxQueryOptions: {
              blindBoxList: buildQueryOptions({
                sortBy: query.blindBoxSortBy,
                sortDirection: query.blindBoxSortDirection,
                limit: query.blindBoxLimit,
                offset: query.blindBoxOffset,
              }),
              blindBoxEffectLogList: buildQueryOptions({
                sortBy: query.effectLogSortBy,
                sortDirection: query.effectLogSortDirection,
                limit: query.effectLogLimit,
                offset: query.effectLogOffset,
              }),
              recordList: buildQueryOptions({
                sortBy: query.reviewRecordSortBy,
                sortDirection: query.reviewRecordSortDirection,
                limit: query.recordLimit,
                offset: query.recordOffset,
              }),
            },
          }),
        },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/money",
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
            data: await getPlayerMoney({
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
      template: "/games/:gameId/players/:playerId/records",
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
            data: await getPlayerRecords({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
              visibilityMode: query.visibilityMode ?? "during_game",
              filterOptions: {
                ...(query.recordType ? { recordType: query.recordType } : {}),
                ...(query.action ? { action: query.action } : {}),
                ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
                ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
              },
              queryOptions: buildQueryOptions(query),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/location",
      handler: async ({ params, query, authContext }) => {
        const requestingPlayerId = authContext?.playerId ?? query.requestingPlayerId ?? null;
        const visibility = await canViewPlayerExactLocation({
          dataAccessLayer,
          gameId: params.gameId,
          requestingPlayerId,
          targetPlayerId: params.playerId,
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: {
              locationId: visibility.canView
                ? await getPlayerLocation({
                    dataAccessLayer,
                    gameId: params.gameId,
                    playerId: params.playerId,
                  })
                : null,
            },
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/public-journey",
      handler: async ({ params, query, authContext }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getPublicJourneyInfo({
            dataAccessLayer,
            gameId: params.gameId,
            requestingPlayerId: authContext?.playerId ?? query.requestingPlayerId ?? null,
            targetPlayerId: params.playerId,
          }),
        },
      }),
    },
    {
      method: "GET",
      template: "/games/:gameId/players/:playerId/tickets",
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
            ...(await getPlayerTickets({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
              filterOptions: {
                ...(query.source ? { source: query.source } : {}),
                ...(query.ticketId ? { ticketId: query.ticketId } : {}),
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
      template: "/games/:gameId/players/:playerId/special-states",
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
            ...(await getPlayerBlindBoxSpecialStates({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: params.playerId,
              filterOptions: {
                ...(query.stateType ? { stateType: query.stateType } : {}),
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
      method: "POST",
      template: "/games/:gameId/general-shop/initialize",
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
            data: await initializeGeneralShop({
              dataAccessLayer,
              gameId: params.gameId,
              mapId: body.mapId,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/general-shop/items",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getGeneralShopItems({
            dataAccessLayer,
            gameId: params.gameId,
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/games/:gameId/general-shop/refresh",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await refreshGeneralShop({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: body.playerId ?? null,
              refreshType: body.refreshType,
              currentTime: body.currentTime,
              playerCount: body.playerCount,
              availableTransportTypes: body.availableTransportTypes,
              mapId: body.mapId,
              getPlayerBlindBoxSpecialStates: async (input) =>
                getPlayerBlindBoxSpecialStates({ dataAccessLayer, ...input }),
              consumePlayerBlindBoxSpecialState: async (input) =>
                consumePlayerBlindBoxSpecialState({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/general-shop/purchase",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await purchaseGeneralShopTicket({
              dataAccessLayer,
              gameId: params.gameId,
              playerId: body.playerId,
              shopItemId: body.shopItemId,
              currentTime: body.currentTime,
              canAfford: async (input) => canAfford({ dataAccessLayer, ...input }),
              deductPlayerMoney: async (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
              addTicketToPlayer: async (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/auction-shop/initialize",
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
            data: await initializeAuctionShop({
              dataAccessLayer,
              gameId: params.gameId,
              mapId: body.mapId,
            }),
          },
        };
      },
    },
    {
      method: "POST",
      template: "/games/:gameId/auction-shop/rounds",
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
            data: await createAuctionRound({
              dataAccessLayer,
              gameId: params.gameId,
              mapId: body.mapId,
              startTime: body.startTime,
              endTime: body.endTime,
              availableTransportTypes: body.availableTransportTypes,
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/auction-shop/current",
      handler: async ({ params, query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getCurrentAuction({
            dataAccessLayer,
            gameId: params.gameId,
            currentTime: query.currentTime,
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/games/:gameId/auction-shop/:auctionId/bids",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: body.playerId,
          detail: { gameId: params.gameId, auctionId: params.auctionId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await placeBid({
              dataAccessLayer,
              gameId: params.gameId,
              auctionId: params.auctionId,
              playerId: body.playerId,
              bidAmount: body.bidAmount,
              currentTime: body.currentTime,
              canAfford: async (input) => canAfford({ dataAccessLayer, ...input }),
              deductPlayerMoney: async (input) => deductPlayerMoney({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
    {
      method: "GET",
      template: "/games/:gameId/auction-shop/:auctionId/bids",
      handler: async ({ params, query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getAuctionBids({
            dataAccessLayer,
            auctionId: params.auctionId,
            filterOptions: {
              ...(query.createdAtAfter ? { createdAtAfter: query.createdAtAfter } : {}),
              ...(query.createdAtBefore ? { createdAtBefore: query.createdAtBefore } : {}),
            },
            queryOptions: buildQueryOptions(query),
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/games/:gameId/auction-shop/:auctionId/resolve",
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
            data: await resolveAuction({
              dataAccessLayer,
              gameId: params.gameId,
              auctionId: params.auctionId,
              currentTime: body.currentTime,
              addTicketToPlayer: async (input) => addTicketToPlayer({ dataAccessLayer, ...input }),
            }),
          },
        };
      },
    },
  ];
}
