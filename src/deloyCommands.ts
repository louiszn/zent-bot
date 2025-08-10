import type { RESTPostAPIApplicationCommandsJSONBody } from "discord.js";
import { REST, Routes } from "discord.js";

import config from "./config.js";

import CommandRegistry from "./base/command/CommandRegistry.js";
import logger from "./libs/logger.js";

await CommandRegistry.load();

const rest = new REST({ version: "10" }).setToken(config.botToken);

const commandDatas: RESTPostAPIApplicationCommandsJSONBody[] = [
	...CommandRegistry.getSlashCommands().map(({ data }) => data),
	...CommandRegistry.getContextMenuCommands().map(({ data }) => data),
	...CommandRegistry.getHybridCommands().map(({ applicationCommandData }) => applicationCommandData),
];

try {
	logger.info(`Registering ${commandDatas.length} application commands...`);

	await rest.put(Routes.applicationCommands(config.clientId), {
		body: commandDatas,
	});

	logger.success(`Successfully registered ${commandDatas.length} global commands.`);
} catch (err) {
	logger.error("Failed to register commands:", err);
}
