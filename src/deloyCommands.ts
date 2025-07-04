import { REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js";

import config from "./config.js";

import { loadCommandRegistry } from "./base/Command.js";

const { slashCommandsRegistry, contextMenuCommandsRegistry, hybridCommandsRegistry } = await loadCommandRegistry();

const rest = new REST({ version: "10" }).setToken(config.botToken);

const commandDatas: RESTPostAPIApplicationCommandsJSONBody[] = [
	...slashCommandsRegistry.map((cmd) => cmd.data),
	...contextMenuCommandsRegistry.map((cmd) => cmd.data),
	...hybridCommandsRegistry.map((cmd) => cmd.applicationCommandData)
];

try {
    console.log(`Registering ${commandDatas.length} application commands...`);
    
    await rest.put(Routes.applicationCommands(config.clientId), {
        body: commandDatas,
    });
    
    console.log(`Successfully registered ${commandDatas.length} global commands.`);
} catch (err) {
    console.error("Failed to register commands:", err);
}
