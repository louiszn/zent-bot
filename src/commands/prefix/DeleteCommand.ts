import type { Message } from "discord.js";
import { PrefixCommand, usePrefixCommand } from "../../base/command/Command.js";

import { extractId } from "../../utils/string.js";
import db from "../../database/index.js";
import { eq } from "drizzle-orm";
import { characterMessagesTable } from "../../database/schema/character.js";

@usePrefixCommand({
	triggers: ["delete", "del"],
})
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

		const characterMessage = await db.query.characterMessagesTable.findFirst({
			where: eq(characterMessagesTable.id, BigInt(targetMessage.id)),
			with: {
				character: true,
			},
		});

		if (!characterMessage || characterMessage.character?.userId !== BigInt(message.author.id)) {
			await message.channel.send("You can't delete this message.");
			return;
		}

		await message.delete();

		await targetMessage.delete();

		await db
			.delete(characterMessagesTable)
			.where(eq(characterMessagesTable.id, characterMessage.id));
	}
}
