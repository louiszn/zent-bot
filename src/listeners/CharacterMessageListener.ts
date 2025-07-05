import type { Message, Webhook } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";

import prisma from "../libs/prisma.js";

import {
	getReplyPreview,
	getUserCharacters,
	MAX_MESSAGE_CONTENT_LENGTH,
} from "../libs/character.js";
import { getWebhook } from "../libs/webhook.js";

@useListener("messageCreate")
export default class CharacterMessageListener extends Listener<"messageCreate"> {
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

		const characters = await getUserCharacters(message.author.id);

		if (!characters.size) {
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

		let replyPreview: string | null = null;

		if (message.reference?.messageId) {
			try {
				const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
				replyPreview = await getReplyPreview(repliedMessage);
			} catch (error) {
				console.error("Failed to fetch replied message:", error);
			}
		}

		let webhook: Webhook | null = null;

		try {
			webhook = await getWebhook(message.channel);
		} catch (error) {
			console.error("Failed to fetch or create a new webhook:", error);
		}

		if (!webhook) {
			return;
		}

		try {
			await message.delete();

			const characterMessage = await webhook.send({
				username: character.name || character.tag,
				avatarURL: character.avatarURL || undefined,
				content: replyPreview ? `${replyPreview}\n${contentToSend}` : contentToSend,
				threadId: message.channel.isThread() ? message.channelId : undefined,
				files: message.attachments.map((attachment) => ({
					name: attachment.name,
					attachment: attachment.proxyURL,
				})),
			});

			await prisma.message.create({
				data: {
					id: characterMessage.id,
					content: contentToSend,
					characterId: character.id,
					repliedMessageId: message.reference?.messageId,
					replyPreview,
				},
			});
		} catch (error) {
			console.error("Failed to send webhook message:", error);
		}
	}
}
