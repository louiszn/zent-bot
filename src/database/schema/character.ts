import { relations } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import { MAX_MESSAGE_CONTENT_LENGTH } from "../../libs/CharacterManager.js";

export const charactersTable = pgTable("characters", {
	id: varchar("id", { length: 20 }).notNull().primaryKey(),

	name: varchar("name", { length: 50 }),

	tag: varchar("tag", { length: 50 }).notNull(),

	prefix: varchar("prefix", { length: 15 }),

	userId: varchar("user_id", { length: 20 }).notNull(),

	avatarURL: varchar("avatarURL", { length: 2048 }),
});

export const characterMessagesTable = pgTable("character_messages", {
	id: varchar("id", { length: 20 }).notNull().primaryKey(),

	content: varchar("content", { length: MAX_MESSAGE_CONTENT_LENGTH }).notNull(),

	repliedMessageId: varchar("replied_message_id", { length: 20 }),

	characterId: varchar("character_id", { length: 20 }).references(() => charactersTable.id, {
		onDelete: "set null",
	}),
});

export const characterMessagesRelations = relations(characterMessagesTable, ({ one }) => ({
	character: one(charactersTable, {
		references: [charactersTable.id],
		fields: [characterMessagesTable.characterId],
	}),
}));
