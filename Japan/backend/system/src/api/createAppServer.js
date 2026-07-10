import http from "node:http";
import { URL } from "node:url";
import { AppError } from "../lib/appError.js";
import { json, matchPath, notFound, readJsonBody } from "./httpUtils.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createBlindBoxRoutes } from "./routes/blindBoxRoutes.js";
import { createGameRoutes } from "./routes/gameRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { createJourneyRoutes } from "./routes/journeyRoutes.js";
import { createMapRoutes } from "./routes/mapRoutes.js";
import { createPlayerRoutes } from "./routes/playerRoutes.js";
import { createTrafficIncidentRoutes } from "./routes/trafficIncidentRoutes.js";
import { resolveRequestAuthContext } from "../index.js";

export function createAppServer({ dataAccessLayer }) {
  const routes = [
    ...createHealthRoutes(),
    ...createAuthRoutes(),
    ...createMapRoutes({ dataAccessLayer }),
    ...createPlayerRoutes({ dataAccessLayer }),
    ...createGameRoutes({ dataAccessLayer }),
    ...createJourneyRoutes({ dataAccessLayer }),
    ...createTrafficIncidentRoutes({ dataAccessLayer }),
    ...createBlindBoxRoutes({ dataAccessLayer }),
  ];

  const server = http.createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = url.pathname;

      for (const route of routes) {
        if (route.method !== method) {
          continue;
        }

        const params = matchPath(pathname, route.template);
        if (!params) {
          continue;
        }

        const body = ["POST", "PATCH", "PUT", "DELETE"].includes(method)
          ? await readJsonBody(request)
          : {};
        const query = Object.fromEntries(url.searchParams.entries());
        const authContext = await resolveRequestAuthContext({
          request,
          dataAccessLayer,
          body,
          query,
        });
        const result = await route.handler({ params, query, body, authContext });
        json(response, result.statusCode ?? 200, result.payload);
        return;
      }

      notFound(response, method, pathname);
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        code: "INTERNAL_ERROR",
        message: error?.message ?? "Unexpected error",
        detail: error?.detail ?? {},
        cause: error,
      });

      json(response, appError.code === "NOT_FOUND" ? 404 : 400, {
        success: false,
        errorCode: appError.code,
        message: appError.message,
        detail: appError.detail,
      });
    }
  });

  return server;
}
