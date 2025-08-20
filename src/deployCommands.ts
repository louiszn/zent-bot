import type { RESTPostAPIApplicationCommandsJSONBody } from "discord.js";
import { Collection, REST, Routes } from "discord.js";

import "reflect-metadata";

import config from "./config.js";

import CommandRegistry from "./base/command/CommandRegistry.js";
import logger from "./libs/logger.js";

await CommandRegistry.load();

const rest = new REST().setToken(config.botToken);

const allCommands: {
	data: RESTPostAPIApplicationCommandsJSONBody;
	guildIds?: string[];
}[] = [
	...CommandRegistry.getSlashCommands().map((cmd) => ({
		data: cmd.data,
		guildIds: cmd.guildIds,
	})),
	...CommandRegistry.getContextMenuCommands().map((cmd) => ({
		data: cmd.data,
		guildIds: cmd.guildIds,
	})),
	...CommandRegistry.getHybridCommands().map((cmd) => ({
		data: cmd.applicationCommandData,
		guildIds: cmd.guildIds,
	})),
];

const globalCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];

const guildCommandsMap = new Collection<string, RESTPostAPIApplicationCommandsJSONBody[]>();

for (const command of allCommands) {
	const guildIds = command.guildIds?.filter(Boolean) || [];

	if (!guildIds.length) {
		globalCommands.push(command.data);
		continue;
	}

	for (const guildId of guildIds) {
		let guildCommands = guildCommandsMap.get(guildId);

		if (!guildCommands) {
			guildCommands = [];
			guildCommandsMap.set(guildId, guildCommands);
		}

		guildCommands.push(command.data);
	}
}

async function registerCommands(
	commands: RESTPostAPIApplicationCommandsJSONBody[],
	guildId?: string,
) {
	const route = guildId
		? Routes.applicationGuildCommands(config.clientId, guildId)
		: Routes.applicationCommands(config.clientId);

	try {
		await rest.put(route, {
			body: commands,
		});

		logger.info(
			`Registered ${commands.length} ${guildId ? `commands for ${guildId}` : "global commands"}`,
		);
	} catch (error) {
		logger.error(
			`An error occurred while registering ${guildId ? `commands for ${guildId}` : "global commands"}:`,
			error,
		);
	}
}

await Promise.all([
	registerCommands(globalCommands),
	...guildCommandsMap.map((commands, guildId) => registerCommands(commands, guildId)),
]);
