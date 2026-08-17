import { createRouter, publicQuery } from "./middleware";
import { marketRouter } from "./market-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  market: marketRouter,
});

export type AppRouter = typeof appRouter;
