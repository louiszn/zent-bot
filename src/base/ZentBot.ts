import { Client, Collection, GatewayIntentBits, Snowflake, Webhook } from "discord.js";

import config from "../config.js";

import { ContextMenuCommand, HybridCommand, loadCommandRegistry, PrefixCommand, SlashCommand } from "./Command.js";
import { loadListenerRegistry } from "./Listener.js";
import CommandManager from "../libs/CommandManager.js";

export default class ZentBot<R extends boolean = boolean> extends Client<R> {
	public commandManager: CommandManager;

	public botWebhooks: Collection<Snowflake, Webhook> = new Collection(); // key is channel ID

	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildModeration,
				GatewayIntentBits.GuildWebhooks,
			],
		});

		this.commandManager = new CommandManager();
	}

	public async initialize() {
		this.rest.setToken(config.botToken);

		await Promise.all([
			this.commandManager.loadCommands(),
			this.loadListeners(),
		]);

		this.once("ready", this.onReady);

		await this.login(config.botToken);
	}

	private async loadListeners() {
		let count = 0;

		const registry = await loadListenerRegistry();

		for (const constructor of registry) {
			const instance = new constructor();

			this[constructor.once ? "once" : "on"](
				constructor.eventName,
				(...args) => instance.execute(this as ZentBot<true>, ...args)
			);

			count++;
		}

		console.log(`Loaded ${count} listeners`);
	}

	private async onReady(this: ZentBot<true>) {
		console.log(`Successfully logged in as ${this.user!.tag}`);
	}
}
