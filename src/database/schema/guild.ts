import { pgTable, varchar } from "drizzle-orm/pg-core";

export const guildsTable = pgTable("guilds", {
	id: varchar("id", { length: 20 }).notNull().primaryKey(),
	prefix: varchar("prefix", { length: 10 }),
});
