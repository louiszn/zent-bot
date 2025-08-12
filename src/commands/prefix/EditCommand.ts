import type { Message } from "discord.js";
import { PrefixCommand, usePrefixCommand } from "../../base/command/Command.js";

import { extractId } from "../../utils/string.js";
import { getWebhook } from "../../libs/webhook.js";
import db from "../../database/index.js";
import { eq } from "drizzle-orm";
import { characterMessagesTable } from "../../database/schema/character.js";
import { getReplyPreview } from "../../libs/character.js";

@usePrefixCommand({
	triggers: ["edit"],
})
export default class DeleteCommand extends PrefixCommand {
	public async execute(message: Message<true>, args: string[]): Promise<void> {
		let targetMessage: Message<true> | undefined;

		let newContent: string | undefined;

		// edit [message ID] [...message content]
		if (args[1] && args[2]) {
			const messageId = extractId(args[1]);

			if (messageId) {
				try {
					targetMessage = await message.channel.messages.fetch(messageId);
					newContent = args.slice(2).join(" ").trim();
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
					newContent = args.slice(1).join(" ").trim();
				} catch {
					await message.channel.send("Couldn't find replied message in this channel.");
					return;
				}
			} else {
				await message.channel.send("You must specific your character's message to edit.");
				return;
			}
		}

		if (!newContent) {
			await message.channel.send("You must specific new content to edit.");
			return;
		}

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, targetMessage.id),
			with: { character: true },
		});

		if (!characterMessage || characterMessage.character?.userId !== message.author.id) {
			await message.channel.send("You can't edit this message.");
			return;
		}

		const webhook = await getWebhook(message.channel);

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

			return getReplyPreview(repliedMessage);
		})();

		await webhook.editMessage(targetMessage, {
			content: repliedMessageReview ? `${repliedMessageReview}\n${newContent}` : newContent,
		});

		await db
			.update(characterMessagesTable)
			.set({
				content: newContent,
			})
			.where(eq(characterMessagesTable.id, characterMessage.id));
	}
}
