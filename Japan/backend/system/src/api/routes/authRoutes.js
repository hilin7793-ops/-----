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
            authTokenPresent: authContext?.authTokenPresent ?? false,
            authUserId: authContext?.authUserId ?? null,
            authCollection: authContext?.authCollection ?? null,
            authVerified: authContext?.authVerified ?? false,
            authError: authContext?.authError ?? null,
            roleSet: authContext?.roleSet ?? [],
            source: authContext?.source ?? "anonymous",
            authMode: authContext?.authMode ?? "anonymous",
            authPolicy: authContext?.authPolicy ?? {
              strict: false,
              operatorFallbackEnabled: false,
              devAuthUserFallbackEnabled: false,
              productionSafe: false,
            },
            usedOperatorFallback: authContext?.usedOperatorFallback ?? false,
            operatorFallbackEnabled: authContext?.operatorFallbackEnabled ?? false,
            devAuthUserFallbackEnabled: authContext?.devAuthUserFallbackEnabled ?? false,
            authStrictEnabled: authContext?.authStrictEnabled ?? false,
            fallbackOperatorPlayerId: authContext?.fallbackOperatorPlayerId ?? null,
          },
        },
      }),
    },
  ];
}
