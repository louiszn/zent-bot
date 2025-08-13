import { Client, GatewayIntentBits, Partials } from "discord.js";

import config from "../config.js";

import ZentManagerRegistry from "./ZentManagerRegistry.js";

export default class ZentBot<Ready extends boolean = boolean> extends Client<Ready> {
	public managers: ZentManagerRegistry<Ready>;

	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildModeration,
				GatewayIntentBits.GuildWebhooks,
			],
			partials: [Partials.GuildMember, Partials.User],
		});

		this.managers = new ZentManagerRegistry(this);
	}

	public async initialize() {
		this.rest.setToken(config.botToken);

		await this.managers.load();

		await this.login(config.botToken);
	}
}
