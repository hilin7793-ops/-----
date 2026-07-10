export function createAuthRoutes() {
  return [
    {
      method: "GET",
      template: "/auth/session",
      handler: async ({ authContext }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: {
            playerId: authContext?.playerId ?? null,
            authUserId: authContext?.authUserId ?? null,
            authCollection: authContext?.authCollection ?? null,
            authVerified: authContext?.authVerified ?? false,
            authError: authContext?.authError ?? null,
            roleSet: authContext?.roleSet ?? [],
            source: authContext?.source ?? "anonymous",
            usedOperatorFallback: authContext?.usedOperatorFallback ?? false,
            fallbackOperatorPlayerId: authContext?.fallbackOperatorPlayerId ?? null,
          },
        },
      }),
    },
  ];
}
