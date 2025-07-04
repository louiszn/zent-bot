import { GuildTextBasedChannel, Message, PermissionFlagsBits, SendableChannels, Webhook } from "discord.js";
import { Listener, useListener } from "../base/Listener.js";

import prisma from "../libs/prisma.js";
import ZentBot from "../base/ZentBot.js";

import { getUserCharacters } from "../libs/character.js";

@useListener("messageCreate")
export default class CharacterMessageListener extends Listener<"messageCreate"> {
	public async execute(client: ZentBot<true>, message: Message) {
		if (message.author.bot || !message.inGuild()) {
			return;
		}

		// These permissions are required for deleting messages and creating webhooks.
		if (!message.guild.members.me?.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageWebhooks])) {
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
			(char) => char.prefix && lowercaseContent.startsWith(char.prefix.toLowerCase())
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

		// Because of limit of characters a webhook can send, we will use 100 characters for the replied message preview.
		if (contentToSend.length > 1_900) {
			return;
		}

		let repliedMessagePreview: string | null = null;

		if (message.reference?.messageId) {
			try {
				const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
				repliedMessagePreview = await this.getPreviewMessage(repliedMessage);
			} catch (error) {
				console.error("Failed to fetch replied message:", error);
			}
		}

		let webhook: Webhook | null = null;

		try {
			webhook = await this.getWebhook(client, message.channel);
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
				content: repliedMessagePreview
					? `${repliedMessagePreview}\n${contentToSend}`
					: contentToSend,
				threadId: message.channel.isThread() ? message.channelId : undefined,
				files: message.attachments.map((attachment) => ({
					name: attachment.name,
					attachment: attachment.proxyURL,
				}))
			});

			await prisma.message.create({
				data: {
					id: characterMessage.id,
					content: contentToSend,
					characterId: character.id,
				}
			});
		} catch (error) {
			console.error("Failed to send webhook message:", error);
		}
	}

	private async getWebhook(client: ZentBot<true>, channel: GuildTextBasedChannel) {
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

		let webhook: Webhook | undefined = client.botWebhooks.get(baseChannel.id);

		if (!webhook) {
			const webhooks = await baseChannel.fetchWebhooks();
			webhook = webhooks.find((w) => w.owner?.id === client.user.id);

			if (!webhook) {
				webhook = await baseChannel.createWebhook({
					name: client.user.displayName,
				});
			}

			client.botWebhooks.set(baseChannel.id, webhook); // Cache the webhook so we don't have to re-fetch it
		}

		return webhook;
	}

	private async getPreviewMessage(message: Message) {
		let author: string = message.author.toString()
		let content = message.content;

		if (message.webhookId) {
			author = message.author.displayName;

			const characterMessage = await prisma.message.findFirst({
				where: { id: message.id },
				include: {
					character: true,
				}
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
}
