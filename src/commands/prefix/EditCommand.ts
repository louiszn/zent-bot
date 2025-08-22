import type { Message } from "discord.js";
import { PrefixCommand, usePrefixCommand } from "../../base/command/Command.js";

import { extractId } from "../../utils/string.js";
import db from "../../database/index.js";
import { eq } from "drizzle-orm";

import { characterMessagesTable } from "../../database/schema/character.js";
import CharacterManager from "../../managers/CharacterManager.js";
import { useArguments } from "../../base/command/argument/ArgumentManager.js";
import type ArgumentResolver from "../../base/command/argument/ArgumentResolver.js";
import { ArgumentType } from "../../base/command/argument/enums.js";

@usePrefixCommand({
	triggers: ["edit"],
})
export default class DeleteCommand extends PrefixCommand {
	@useArguments(
		(arg) =>
			arg
				.setName("message")
				.setDescription("Message link or ID to delete")
				.setType(ArgumentType.String),
		(arg) =>
			arg
				.setName("content")
				.setDescription("Content to edit")
				.setType(ArgumentType.String)
				.setRequired(true)
				.setTuple(true),
	)
	public async execute(message: Message<true>, args: ArgumentResolver): Promise<void> {
		let targetMessage: Message<true> | undefined;

		const rawMessageId = args.getString("message");
		const content = args.getStrings("content").join(" ");

		// edit [message ID] [...message content]
		if (rawMessageId) {
			const messageId = extractId(rawMessageId);

			if (messageId) {
				try {
					targetMessage = await message.channel.messages.fetch(messageId);
				} catch {
					await message.channel.send("Couldn't find that message in this channel.");
					return;
				}
			}
		}

		if (!targetMessage) {
			// Fallback to use reference (replied message)
			if (message.reference?.messageId) {
				try {
					targetMessage = await message.channel.messages.fetch(message.reference.messageId);
				} catch {
					await message.channel.send("Couldn't find replied message in this channel.");
					return;
				}
			} else {
				await message.channel.send("You must specific your character's message to edit.");
				return;
			}
		}

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, targetMessage.id),
			with: { character: true },
		});

		if (!characterMessage || characterMessage.character?.userId !== message.author.id) {
			await message.channel.send("You can't edit this message.");
			return;
		}

		const webhook = await CharacterManager.createWebhook(message.channel);

		if (!webhook || targetMessage.webhookId !== webhook.id) {
			await message.channel.send(
				"Couldn't edit this message since the original webhook is deleted.",
			);
			return;
		}

		await message.delete();

		const repliedMessageReview = await (async () => {
			if (!characterMessage.repliedMessageId) {
				return null;
			}

			const repliedMessage = await message.channel.messages
				.fetch(characterMessage.repliedMessageId.toString())
				.catch(() => null);

			if (!repliedMessage) {
				return null;
			}

			return CharacterManager.getRepliedMessageReview(repliedMessage);
		})();

		await webhook.editMessage(targetMessage, {
			content: repliedMessageReview ? `${repliedMessageReview}\n${content}` : content,
		});

		await db
			.update(characterMessagesTable)
			.set({
				content: content,
			})
			.where(eq(characterMessagesTable.id, characterMessage.id));
	}
}
