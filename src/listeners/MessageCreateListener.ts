import type { Message } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";

import type { CommandWithSubcommandsConstructor } from "../base/command/Command.js";
import { HybridCommand } from "../base/command/Command.js";
import logger from "../libs/logger.js";
import { PrefixHybridContext } from "../base/command/HybridContext.js";

const PREFIX = "_";

@useListener(Events.MessageCreate)
export default class MessageCreateListener extends Listener<Events.MessageCreate> {
	public async execute(message: Message) {
		const { client } = this;
		const { managers } = client;

		if (!message.inGuild() || message.author.bot) {
			return;
		}

		if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) {
			return;
		}

		const args = message.content.slice(PREFIX.length).trim().split(/\s+/g);

		const commandName = args[0].toLowerCase();

		const command = managers.commands.prefixes.get(commandName);

		if (!command) {
			return;
		}

		const { subcommands } = command.constructor as CommandWithSubcommandsConstructor;

		try {
			if (command instanceof HybridCommand) {
				await command.execute(new PrefixHybridContext(message), args);
			} else {
				await command.execute(message, args);
			}

			await subcommands.handlePrefix(command, message, args);
		} catch (error) {
			logger.error(`An error occurred while executing command '${commandName}':`, error);
		}
	}
}
