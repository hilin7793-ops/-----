export function createHealthRoutes() {
  return [
    {
      method: "GET",
      template: "/health",
      handler: async () => ({
        statusCode: 200,
        payload: {
          success: true,
          data: { status: "ok" },
        },
      }),
    },
  ];
}
