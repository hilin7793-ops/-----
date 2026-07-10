import { startServer } from "../src/api/startServer.js";

const { address } = await startServer({});
console.log(`API server listening on ${address}`);
