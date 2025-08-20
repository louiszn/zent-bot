import type { Guild, GuildTextBasedChannel, Message, MessageResolvable, Webhook } from "discord.js";
import { Collection, EmbedBuilder, userMention } from "discord.js";

import { and, eq, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

import db from "../database/index.js";
import { characterMessagesTable, charactersTable } from "../database/schema/character.js";
import snowflake from "../libs/snowflake.js";

export const MAX_MESSAGE_CONTENT_LENGTH = 1_700 as const;
export const MAX_REVIEW_MESSAGE_CONTENT_LENGTH = 50 as const;

export type Character = InferSelectModel<typeof charactersTable>;
export type CharacterCollection = Collection<string, Character>;

export default class CharacterManager {
	private static managers = new Collection<string, CharacterManager>();
	public static webhooks = new Collection<string, Webhook>();

	private cache: CharacterCollection = new Collection();

	private initialized = false;

	public constructor(public userId: string) {}

	public static create(userId: string): CharacterManager {
		let manager = this.managers.get(userId);

		if (manager) {
			return manager;
		}

		manager = new CharacterManager(userId);
		this.managers.set(userId, manager);

		return manager;
	}

	public static getDisplayName(character: Character): string {
		return character.name || character.tag;
	}

	public static async getRepliedMessageReview(message: Message): Promise<string> {
		let author: string = message.author.toString();
		let content = message.content;

		if (message.webhookId) {
			const characterMessage = await this.getMessage(message);

			if (characterMessage) {
				content = characterMessage.content;

				const { character } = characterMessage;

				if (character) {
					author = this.getDisplayName(character);
				}
			}
		}

		return `-# ╭ **${author}** - ${this.stripContent(content)} [Jump To Message](${message.url})`;
	}

	public static async getMessage(resolvable: MessageResolvable) {
		const messageId = typeof resolvable === "string" ? resolvable : resolvable.id;

		const message = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, messageId),
			with: { character: true },
		});

		return message || null;
	}

	private static stripContent(content: string) {
		return content.length > MAX_REVIEW_MESSAGE_CONTENT_LENGTH
			? content.slice(0, MAX_REVIEW_MESSAGE_CONTENT_LENGTH + 3) + "..."
			: content;
	}

	public static getInformationEmbed(character: Character): EmbedBuilder {
		const { timestamp } = snowflake.deconstruct(character.id);
		const createdTimestamp = Number(timestamp);

		const description = [
			`> **Tag:** \`${character.tag}\``,
			`> **Prefix:** \`${character.prefix || "none"}\``,
			`> **Owner:** ${userMention(character.userId)}`,
			`> **Created at:** <t:${Math.floor(createdTimestamp / 1000)}:R>`,
		].join("\n");

		return new EmbedBuilder()
			.setTitle(character.name || character.tag)
			.setColor("Yellow")
			.setThumbnail(character.avatarURL || null)
			.setDescription(description)
			.setTimestamp();
	}

	public static async createWebhook(channel: GuildTextBasedChannel) {
		const { user: clientUser } = channel.client;

		let baseChannel;

		// Threads can send wehook messages using its parent channel and threadId option.
		if (channel.isThread()) {
			if (!channel.parent?.isTextBased()) {
				return null;
			}

			baseChannel = channel.parent;
		} else {
			baseChannel = channel;
		}

		let webhook: Webhook | undefined = this.webhooks.get(baseChannel.id);

		if (!webhook) {
			const webhooks = await baseChannel.fetchWebhooks();
			webhook = webhooks.find((w) => w.owner?.id === clientUser.id);

			if (!webhook) {
				webhook = await baseChannel.createWebhook({
					name: clientUser.displayName,
				});
			}

			this.webhooks.set(baseChannel.id, webhook); // Cache the webhook so we don't have to re-fetch it
		}

		return webhook;
	}

	public static async initializeGuild(guild: Guild) {
		await Promise.all([this.initializeGuildWebhooks(guild), this.initializeGuildManagers(guild)]);
	}

	public static async initializeGuildWebhooks(guild: Guild) {
		const channels = guild.channels.cache.filter((channel) => channel.isTextBased());
		await Promise.all(channels.map((channel) => CharacterManager.createWebhook(channel)));
	}

	public static async initializeGuildManagers(guild: Guild) {
		await Promise.all(
			guild.members.cache
				.toJSON()
				.filter((m) => !m.user.bot)
				.map((member) => {
					const manager = CharacterManager.create(member.id);
					return manager.getAll();
				}),
		);
	}

	public async getAll(force = false): Promise<CharacterCollection> {
		if (!this.initialized || force) {
			this.initialized = true;

			const characters = await db.query.charactersTable.findMany({
				where: eq(charactersTable.userId, this.userId),
			});

			this.cache.clear();

			for (const character of characters) {
				this.cache.set(character.id, character);
			}
		}

		return this.cache;
	}

	public async getById(id: string, force = false): Promise<Character | null> {
		const characters = await this.getAll(force);
		return characters.get(id) || null;
	}

	public async getByTag(tag: string, force = false): Promise<Character | null> {
		const characters = await this.getAll(force);
		return characters.find((c) => c.tag === tag) || null;
	}

	public async create(
		data: Omit<InferInsertModel<typeof charactersTable>, "userId" | "id">,
	): Promise<Character> {
		const [character] = await db
			.insert(charactersTable)
			.values({ ...data, userId: this.userId, id: snowflake.generate().toString() })
			.returning();

		this.cache.set(character.id, character);

		return character;
	}

	public async update(id: string, data: Partial<Character>) {
		const [character] = await db
			.update(charactersTable)
			.set(data)
			.where(and(eq(charactersTable.userId, this.userId), eq(charactersTable.id, id)))
			.returning();

		this.cache.set(character.id, character);

		return character;
	}

	public async delete(id: string) {
		const [character] = await db
			.delete(charactersTable)
			.where(eq(charactersTable.id, id))
			.returning();

		this.cache.delete(character.id);

		return character;
	}
}
