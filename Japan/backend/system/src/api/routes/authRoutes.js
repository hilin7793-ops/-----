export function createAuthRoutes() {
  return [
    {
      method: "POST",
      template: "/auth/login",
      handler: async ({ body }) => {
        const baseUrl = String(process.env.POCKETBASE_URL ?? "http://127.0.0.1:8090").replace(/\/+$/, "");
        const authCollection = process.env.POCKETBASE_AUTH_COLLECTION ?? "users";
        const identity = body.identity ?? body.email ?? "";
        const password = body.password ?? "";

        const response = await fetch(
          `${baseUrl}/api/collections/${authCollection}/auth-with-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              identity,
              password,
            }),
          },
        );

        const payload = await response.json();
        return {
          statusCode: response.ok ? 200 : response.status,
          payload: response.ok
            ? {
                success: true,
                data: {
                  token: payload?.token ?? null,
                  record: payload?.record ?? null,
                  authCollection,
                },
              }
            : {
                success: false,
                errorCode: "AUTH_LOGIN_FAILED",
                message: payload?.message ?? "PocketBase login failed",
                detail: {
                  authCollection,
                },
              },
        };
      },
    },
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
