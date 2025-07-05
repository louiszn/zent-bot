import type { Message } from "discord.js";
import { PrefixCommand, usePrefixCommand } from "../../base/command/Command.js";

import { extractId } from "../../utils/string.js";
import prisma from "../../libs/prisma.js";
import { getWebhook } from "../../libs/webhook.js";

@usePrefixCommand(["edit"])
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

		const characterMessage = await prisma.message.findFirst({
			where: { id: targetMessage.id },
			include: { character: true },
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

		const replyPreview = characterMessage.replyPreview;

		await webhook.editMessage(targetMessage, {
			content: replyPreview ? `${replyPreview}\n${newContent}` : newContent,
		});

		await prisma.message.update({
			where: { id: characterMessage.id },
			data: { content: newContent },
		});
	}
}
