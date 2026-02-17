import path from "node:path";
import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { readEnv } from "./env.js";
import { registerBriefRoutes } from "./routes/brief.js";
import { registerAgentRoutes } from "./routes/agents.js";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

const env = readEnv();
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
app.get("/healthz", async () => ({ ok: true }));
await registerBriefRoutes(app);
await registerAgentRoutes(app);

await app.listen({ host: "0.0.0.0", port: env.PORT || 8787 });
