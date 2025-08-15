import type { ClientEvents } from "discord.js";
import type ZentBot from "../ZentBot.js";
import type { Listener, ListenerConstructor } from "./Listener.js";

import ListenerRegistry from "./ListenerRegistry.js";
import logger from "../../libs/logger.js";

export default class ListenerManager<Ready extends boolean = boolean> {
	public constructor(public client: ZentBot<Ready>) {}

	public async load() {
		await ListenerRegistry.load();

		const listenersRegistry = ListenerRegistry.getListeners();

		let count = 0;

		for (const constructor of listenersRegistry) {
			if (this.registerListener(constructor)) {
				count++;
			}
		}

		logger.success(`Registered total ${count}/${listenersRegistry.length} listeners`);
	}

	public registerListener<E extends keyof ClientEvents>(
		constructor: ListenerConstructor<E>,
	): boolean {
		try {
			const instance = new constructor(this.client as ZentBot<true>);

			this.addClientListener(constructor, instance);

			return true;
		} catch (error) {
			logger.error(`An error occurred while registering listener '${constructor.name}':`, error);

			return false;
		}
	}

	public addClientListener<E extends keyof ClientEvents>(
		constructor: ListenerConstructor<E>,
		instance: Listener<E>,
	) {
		this.client[constructor.once ? "once" : "on"](constructor.eventName, (...args) => {
			instance.execute(...args);
		});
	}
}
