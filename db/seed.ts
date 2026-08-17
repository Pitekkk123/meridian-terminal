// Seed the default watchlist (idempotent).
import { getDb } from "../api/queries/connection";
import { watchlistItems } from "./schema";

const DEFAULTS = ["aapl", "NVDA", "xau", "btc", "spx", "eurusd"];

async function main() {
  const db = getDb();
  for (const key of DEFAULTS) {
    await db
      .insert(watchlistItems)
      .values({ symbolKey: key })
      .onDuplicateKeyUpdate({ set: { symbolKey: key } });
  }
  console.log("watchlist seeded:", DEFAULTS.join(", "));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
