import {
  assertSelfAccess,
  createPlayer,
  getPlayer,
  updatePlayerProfile,
} from "../../index.js";

// Authorization uses `authContext`; `operatorPlayerId` is compatibility input.
export function createPlayerRoutes({ dataAccessLayer }) {
  return [
    {
      method: "POST",
      template: "/players",
      handler: async ({ body }) => ({
        statusCode: 201,
        payload: {
          success: true,
          data: await createPlayer({ dataAccessLayer, ...body }),
        },
      }),
    },
    {
      method: "GET",
      template: "/players/:playerId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getPlayer({ dataAccessLayer, playerId: params.playerId }),
        },
      }),
    },
    {
      method: "PATCH",
      template: "/players/:playerId",
      handler: async ({ params, body, authContext }) => {
        await assertSelfAccess({
          authContext,
          operatorPlayerId: body.operatorPlayerId,
          targetPlayerId: params.playerId,
          detail: { playerId: params.playerId },
        });

        return {
          statusCode: 200,
          payload: {
            success: true,
            data: await updatePlayerProfile({
              dataAccessLayer,
              playerId: params.playerId,
              displayName: body.displayName,
              avatar: body.avatar,
              metadata: body.metadata,
            }),
          },
        };
      },
    },
  ];
}
