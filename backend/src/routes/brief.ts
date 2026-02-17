import type { FastifyInstance } from "fastify";
import { analyzeBrief, BriefBodySchema } from "../services/briefService.js";

export async function registerBriefRoutes(app: FastifyInstance) {
  app.post("/api/brief", async (req, reply) => {
    try {
      const body = BriefBodySchema.parse((req as any).body ?? {});
      const result = await analyzeBrief({ query: body.query, lang: body.lang });
      return reply.status(200).send(result);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : typeof e === "string" ? e : "unknown_error";
      return reply.status(400).send({ error: msg });
    }
  });
}

