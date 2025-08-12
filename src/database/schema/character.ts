import { relations } from "drizzle-orm";
import { bigint, pgTable, varchar } from "drizzle-orm/pg-core";
import { MAX_MESSAGE_CONTENT_LENGTH } from "../../libs/character.js";

export const charactersTable = pgTable("characters", {
	id: bigint("id", { mode: "bigint" }).notNull().primaryKey(),

	name: varchar("name", { length: 500 }),

	tag: varchar("tag", { length: 500 }).notNull(),

	prefix: varchar("prefix", { length: 50 }),

	userId: bigint("user_id", { mode: "bigint" }).notNull(),

	avatarURL: varchar("avatarURL", { length: 2048 }),
});

export const characterMessagesTable = pgTable("character_messages", {
	id: bigint("id", { mode: "bigint" }).notNull().primaryKey(),

	content: varchar("content", { length: MAX_MESSAGE_CONTENT_LENGTH }).notNull(),

	repliedMessageId: bigint("replied_message_id", { mode: "bigint" }),

	characterId: bigint("character_id", { mode: "bigint" }).references(() => charactersTable.id),
});

export const characterMessagesRelations = relations(characterMessagesTable, ({ one }) => ({
	character: one(charactersTable, {
		references: [charactersTable.id],
		fields: [characterMessagesTable.characterId],
	}),
}));
