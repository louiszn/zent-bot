import { sql } from "drizzle-orm";
import { pgTable, integer, bigint, timestamp } from "drizzle-orm/pg-core";

export const rbdUserCounts = pgTable("rbd_user_counts", {
	userId: bigint("userId", { mode: "bigint" }).primaryKey(),
	count: integer().notNull(),
	lastUpdated: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => sql`NOW()`),
});
