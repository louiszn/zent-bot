import type { Message } from "discord.js";
import { Events, PermissionFlagsBits } from "discord.js";
import { Listener, useListener } from "../../base/listener/Listener.js";

import db from "../../database/index.js";

import logger from "../../libs/logger.js";
import CharacterManager, { MAX_MESSAGE_CONTENT_LENGTH } from "../../libs/CharacterManager.js";
import { characterMessagesTable } from "../../database/schema/character.js";

@useListener(Events.MessageCreate)
export default class CharacterMessageListener extends Listener<Events.MessageCreate> {
	public async execute(message: Message) {
		if (message.author.bot || !message.inGuild()) {
			return;
		}

		// These permissions are required for deleting messages and creating webhooks.
		if (
			!message.guild.members.me?.permissions.has([
				PermissionFlagsBits.ManageMessages,
				PermissionFlagsBits.ManageWebhooks,
			])
		) {
			return;
		}

		// Having MANAGE_MESSAGES is not enough, the message may be undeletable.
		if (!message.deletable) {
			return;
		}

		const characterManager = CharacterManager.create(message.author.id);

		const [characters, webhook, repliedMessagePreview] = await Promise.all([
			characterManager.getAll(),
			CharacterManager.createWebhook(message.channel),
			this.getRepliedMessagePreview(message),
		]);

		if (!characters.size || !webhook) {
			return;
		}

		const lowercaseContent = message.content.toLowerCase();

		const character = characters.find(
			(char) => char.prefix && lowercaseContent.startsWith(char.prefix.toLowerCase()),
		);

		if (!character) {
			return;
		}

		const contentToSend = message.content
			.slice(character.prefix?.length)
			.trim()
			.replace(/@everyone|@here/g, "@\u200b$&"); // Prevent mention abuse

		// Users can just send a message contains only characters' prefix, which can lead to an empty content.
		if (!contentToSend && !message.attachments.size) {
			return;
		}

		if (contentToSend.length > MAX_MESSAGE_CONTENT_LENGTH) {
			return;
		}

		try {
			const [characterMessage] = await Promise.all([
				webhook.send({
					username: character.name || character.tag,
					avatarURL: character.avatarURL || undefined,
					content: repliedMessagePreview
						? `${repliedMessagePreview}\n${contentToSend}`
						: contentToSend,
					threadId: message.channel.isThread() ? message.channelId : undefined,
					files: message.attachments.map((attachment) => ({
						name: attachment.name,
						attachment: attachment.proxyURL,
					})),
				}),
				message.delete(),
			]);

			await db.insert(characterMessagesTable).values({
				id: characterMessage.id,
				content: contentToSend,
				characterId: character.id,
				repliedMessageId: message.reference?.messageId,
			});
		} catch (error) {
			logger.error("Failed to send webhook message:", error);
		}
	}

	private async getRepliedMessagePreview(message: Message) {
		if (!message.reference?.messageId) {
			return null;
		}

		return await message.channel.messages
			.fetch(message.reference.messageId)
			.then((msg) => CharacterManager.getRepliedMessageReview(msg))
			.catch(() => null);
	}
}
