import type { Message } from "discord.js";
import { PrefixCommand, usePrefixCommand } from "../../base/Command.js";

import { extractId } from "../../utils/string.js";
import prisma from "../../libs/prisma.js";

@usePrefixCommand(["delete", "del"])
export default class DeleteCommand extends PrefixCommand {
	public async execute(message: Message<true>, args: string[]): Promise<void> {
		let targetMessage: Message<true> | undefined;

		if (args[1]) {
			const messageId = extractId(args[1]);

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
				await message.channel.send("You must specific your character's message to delete.");
				return;
			}
		}

		const characterMessage = await prisma.message.findFirst({
			where: { id: targetMessage.id },
			include: { character: true },
		});

		if (!characterMessage || characterMessage.character?.userId !== message.author.id) {
			await message.channel.send("You can't delete this message.");
			return;
		}

		await message.delete();

		await targetMessage.delete();

		await prisma.message.delete({
			where: { id: characterMessage.id },
		});
	}
}
