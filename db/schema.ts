import {
  mysqlTable,
  serial,
  varchar,
  timestamp,
} from "drizzle-orm/mysql-core";

export const watchlistItems = mysqlTable("watchlist_items", {
  id: serial("id").primaryKey(),
  symbolKey: varchar("symbol_key", { length: 32 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
