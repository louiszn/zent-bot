import { ClientEvents } from "discord.js";

import fg from "fast-glob";
import { pathToFileURL } from "node:url";

import ZentBot from "./ZentBot.js";

const listenersRegistry: ListenerConstructor<any>[] = [];

export abstract class Listener<E extends keyof ClientEvents> {
	protected client!: ZentBot<true>;
	public abstract execute(...args: ClientEvents[E]): Promise<void>;
}

export interface ListenerConstructor<E extends keyof ClientEvents> {
	new(): Listener<E>;
	eventName: E;
	once: boolean;
}

export function useListener<E extends keyof ClientEvents>(
	event: E,
	once = false
) {
	return function <T extends typeof Listener<E>>(constructor: T) {
		const correctConstructor = constructor as T & ListenerConstructor<E>;

		correctConstructor.eventName = event;
		correctConstructor.once = once;

		listenersRegistry.push(correctConstructor);
	};
}

export async function loadListenerRegistry() {
	const files = await fg.glob("dist/listeners/**/*.js");

	for (const file of files) {
		try {
			await import(pathToFileURL(file).toString());
		} catch (error) {
			console.error(`Failed to load file: ${file}`, error);
		}
	}

	return listenersRegistry;
}
