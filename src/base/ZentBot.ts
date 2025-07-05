import type { Snowflake, Webhook } from "discord.js";
import { Client, Collection, GatewayIntentBits } from "discord.js";

import config from "../config.js";

import CommandManager from "./command/CommandManager.js";

import type { Component } from "./Component.js";
import ListenerRegistry from "./listener/ListenerRegistry.js";

export default class ZentBot<Ready extends boolean = boolean> extends Client<Ready> {
	public commandManager: CommandManager<Ready>;

	public components: Collection<string, Component>;

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
		this.components = new Collection();
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
				console.error(`An error occurred while registering listener '${constructor.name}':`, error);
			}
		}

		console.log(`✅ Registered total ${count}/${constructors.length} listeners`);
	}

	private async onReady(this: ZentBot<true>) {
		console.log(`Successfully logged in as ${this.user!.tag}`);
	}
}
