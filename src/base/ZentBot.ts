import type { Snowflake, Webhook } from "discord.js";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "../config.js";

import CommandManager from "./command/CommandManager.js";

import ListenerRegistry from "./listener/ListenerRegistry.js";
import logger from "../libs/logger.js";

export default class ZentBot<Ready extends boolean = boolean> extends Client<Ready> {
	public commandManager: CommandManager<Ready>;

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

		this.commandManager = new CommandManager(this);
	}

	public async initialize() {
		this.rest.setToken(config.botToken);

		await Promise.all([this.commandManager.loadCommands(), this.loadListeners()]);

		this.once("ready", this.onReady);

		await this.login(config.botToken);
	}

	private async loadListeners() {
		let count = 0;

		await ListenerRegistry.loadModules();

		const constructors = ListenerRegistry.getListeners();

		for (const constructor of constructors) {
			try {
				const instance = new constructor(this as ZentBot<true>);

				this[constructor.once ? "once" : "on"](constructor.eventName, (...args) =>
					instance.execute(...args),
				);

				count++;
			} catch (error) {
				logger.error(`An error occurred while registering listener '${constructor.name}':`, error);
			}
		}

		logger.success(`Registered total ${count}/${constructors.length} listeners`);
	}

	private async onReady(this: ZentBot<true>) {
		logger.success(`Successfully logged in as ${this.user!.tag}`);
	}
}
