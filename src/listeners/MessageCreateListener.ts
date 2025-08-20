import type { Message } from "discord.js";
import { Events } from "discord.js";
import { Listener, useListener } from "../base/listener/Listener.js";

import type {
	HybridCommandConstructor,
	PrefixCommandConstructor,
} from "../base/command/Command.js";
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

		try {
			if (command instanceof HybridCommand) {
				const context = new PrefixHybridContext(message);

				await command.execute(context, args);

				await (command.constructor as HybridCommandConstructor).subcommands.handle(
					command,
					context,
					args,
				);
			} else {
				await command.execute(message, args);

				await (command.constructor as PrefixCommandConstructor).subcommands.handle(
					command,
					message,
					args,
				);
			}
		} catch (error) {
			logger.error(`An error occurred while executing command '${commandName}':`, error);
		}
	}
}
