import { createAppServer } from "./createAppServer.js";
import { createServiceContext } from "./createServiceContext.js";

export async function startServer({
  port = Number(process.env.PORT ?? 8787),
  host = process.env.HOST ?? "127.0.0.1",
  mode = process.env.API_MODE ?? "pocketbase",
} = {}) {
  const { dataAccessLayer } = createServiceContext({ mode });
  const server = createAppServer({ dataAccessLayer });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  return {
    server,
    address: `http://${host}:${port}`,
  };
}
