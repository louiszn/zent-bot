import type { Message } from "discord.js";
import { Collection, EmbedBuilder } from "discord.js";

import { and, eq, type InferInsertModel } from "drizzle-orm";
import { characterMessagesTable, charactersTable } from "../database/schema/character.js";
import db from "../database/index.js";
import snowflake from "./snowflake.js";

export type Character = InferInsertModel<typeof charactersTable>;

// Because of limit of characters a webhook can send, we will use 100 characters for the replied message preview
export const MAX_MESSAGE_CONTENT_LENGTH = 1_800 as const;

type CharacterCollection = Collection<string, Character>;

const userCharactersCache: Collection<string, CharacterCollection> = new Collection();

export async function getUserCharacters(
	userId: string,
	force = false,
): Promise<CharacterCollection> {
	let characters: CharacterCollection | undefined;

	if (!force) {
		characters = userCharactersCache.get(userId);
	}

	if (!characters) {
		const dbCharacters = await db.query.charactersTable.findMany({
			where: eq(charactersTable.userId, userId),
		});

		characters = new Collection();

		for (const character of dbCharacters) {
			characters.set(character.id, character);
		}

		// Cache even empty result to avoid re-querying
		userCharactersCache.set(userId, characters);
	}

	return characters;
}

export async function getUserCharacterById(
	userId: string,
	characterId: string,
	force = false,
): Promise<Character | null> {
	const characters = await getUserCharacters(userId, force);
	return characters.get(characterId) ?? null;
}

export async function getUserCharacterByTag(
	userId: string,
	characterTag: string,
	force = false,
): Promise<Character | null> {
	const characters = await getUserCharacters(userId, force);
	return characters.find((char) => char.tag === characterTag) || null;
}

export async function createUserCharacter(
	userId: string,
	characterTag: string,
): Promise<Character> {
	const characters = await getUserCharacters(userId);

	const [character] = await db
		.insert(charactersTable)
		.values({
			id: snowflake.generate().toString(),
			tag: characterTag,
			userId,
		})
		.returning();

	characters.set(character.id, character);

	return character;
}

export async function updateUserCharacterById(
	userId: string,
	characterId: string,
	data: Partial<Character>,
): Promise<Character> {
	const characters = await getUserCharacters(userId);

	const [character] = await db
		.update(charactersTable)
		.set(data)
		.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
		.returning();

	characters.set(characterId, character);

	return character;
}

export function getDisplayNameWithTag(character: Character) {
	return character.name ? `${character.name} (${character.tag})` : character.tag;
}

export function getCharacterInformationEmbed(character: Character) {
	const decoded = snowflake.decode(character.id);
	const createdTimestamp = Number(decoded.timestamp);

	return new EmbedBuilder()
		.setTitle(character.name || character.tag)
		.setColor("Yellow")
		.setThumbnail(character.avatarURL || null)
		.setDescription(
			`> **Tag:** \`${character.tag}\`
> **Prefix:** \`${character.prefix}\`
> **Owner:** <@${character.userId}>
> **Created at:** <t:${Math.floor(createdTimestamp / 1000)}:R>`,
		)
		.setTimestamp();
}

export async function getReplyPreview(message: Message) {
	let author: string = message.author.toString();
	let content = message.content;

	if (message.webhookId) {
		author = message.author.displayName;

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, message.id),
			with: {
				character: true,
			},
		});

		if (characterMessage) {
			content = characterMessage.content;

			if (characterMessage.character) {
				author = characterMessage.character.name || characterMessage.character.tag;
			}
		}
	}

	return `-# ╭ **${author}** - [${content.slice(0, 50)}](${message.url})`;
}
