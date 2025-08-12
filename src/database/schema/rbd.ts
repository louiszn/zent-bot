import { sql } from "drizzle-orm";
import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const rbdUserCounts = pgTable("rbd_user_counts", {
	userId: varchar("userId", { length: 20 }).primaryKey(),
	count: integer().notNull(),
	lastUpdated: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => sql`NOW()`),
});
