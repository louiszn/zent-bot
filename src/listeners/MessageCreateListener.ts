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
import GuildManager from "../managers/GuildManager.js";
import ArgumentResolver from "../base/command/argument/ArgumentResolver.js";

const PREFIX = "_";

@useListener(Events.MessageCreate)
export default class MessageCreateListener extends Listener<Events.MessageCreate> {
	public async execute(message: Message) {
		const { client } = this;
		const { managers } = client;

		if (!message.inGuild() || message.author.bot) {
			return;
		}

		const guildData = await GuildManager.get(message.guild.id);

		const lowerContent = message.content.toLowerCase();

		const prefixes = [client.user.toString(), guildData?.prefix || PREFIX];

		const usedPrefix = prefixes.find((prefix) => lowerContent.startsWith(prefix.toLowerCase()));

		if (!usedPrefix) {
			return;
		}

		const args = ArgumentResolver.create(message, usedPrefix);

		const command = managers.commands.prefixes.get(args.trigger);

		if (!command) {
			return;
		}

		try {
			if (command instanceof HybridCommand) {
				const context = new PrefixHybridContext(message);

				// eslint-disable-next-line @typescript-eslint/unbound-method
				await command.execute(context, await args.resolveMethod(command.execute));

				await (command.constructor as HybridCommandConstructor).subcommands.handle(
					command,
					context,
					args,
				);
			} else {
				// eslint-disable-next-line @typescript-eslint/unbound-method
				await command.execute(message, await args.resolveMethod(command.execute));

				await (command.constructor as PrefixCommandConstructor).subcommands.handle(
					command,
					message,
					args,
				);
			}
		} catch (error) {
			logger.error(`An error occurred while executing command '${args.trigger}':`, error);
		}
	}
}
