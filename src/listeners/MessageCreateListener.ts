import type { Message } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";

import { HybridCommand, PrefixHybridContext } from "../base/command/Command.js";
import logger from "../libs/logger.js";

const PREFIX = "_";

@useListener("messageCreate")
export default class MessageCreateListener extends Listener<"messageCreate"> {
	public async execute(message: Message) {
		const { client } = this;

		if (!message.inGuild() || message.author.bot) {
			return;
		}

		if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) {
			return;
		}

		const args = message.content.slice(PREFIX.length).trim().split(/\s+/g);

		const commandName = args[0].toLowerCase();

		const command = client.commandManager.prefixCommands.get(commandName);

		if (!command) {
			return;
		}

		try {
			if (command instanceof HybridCommand) {
				await command.execute(new PrefixHybridContext(message), args);
			} else {
				await command.execute(message, args);
			}
		} catch (error) {
			logger.error(`An error occurred while executing command '${commandName}':`, error);
		}
	}
}
