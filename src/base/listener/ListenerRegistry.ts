import type { ClientEvents } from "discord.js";
import type { ListenerConstructor } from "./Listener.js";

import glob from "fast-glob";
import { pathToFileURL } from "node:url";
import logger from "../../libs/logger.js";

export default class ListenerRegistry {
	private static readonly listeners: ListenerConstructor<keyof ClientEvents>[] = [];

	public static isFrozen = false;

	public static addListener(constructor: ListenerConstructor<keyof ClientEvents>) {
		this.throwOnFrozen("Tried to add more entry while the listener registry is frozen");
		this.listeners.push(constructor);
	}

	public static getListeners(): readonly ListenerConstructor<keyof ClientEvents>[] {
		return this.listeners;
	}

	private static throwOnFrozen(message: string) {
		if (this.isFrozen) {
			throw new Error(message);
		}
	}
	
	private static freezeRegistry() {
		Object.freeze(this.listeners);
		this.isFrozen = true;
	}

	public static async loadModules(): Promise<void> {
		this.throwOnFrozen("loadModules() was called while the listener registry is frozen");

		const files = await glob("dist/listeners/**/*.js");

		let count = 0;

		await Promise.all(
			files.map(async (file) => {
				await import(pathToFileURL(file).toString());
				count++;
			}),
		);
	
		logger.success(`Loaded ${count} listener files`);

		this.freezeRegistry();
	}
}
