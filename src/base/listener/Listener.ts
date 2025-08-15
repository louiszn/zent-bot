import type { Awaitable, ClientEvents } from "discord.js";

import type ZentBot from "../ZentBot.js";
import ListenerRegistry from "./ListenerRegistry.js";

export abstract class Listener<E extends keyof ClientEvents> {
	public constructor(protected client: ZentBot<true>) {}

	public abstract execute(...args: ClientEvents[E]): Awaitable<void>;
}

export interface ListenerConstructor<E extends keyof ClientEvents> {
	new (client: ZentBot<true>): Listener<E>;
	eventName: E;
	once: boolean;
}

export function useListener<E extends keyof ClientEvents>(event: E, once = false) {
	return function <T extends typeof Listener<E>>(constructor: T) {
		const correctConstructor = constructor as T & ListenerConstructor<E>;

		correctConstructor.eventName = event;
		correctConstructor.once = once;

		ListenerRegistry.addListener(correctConstructor);
	};
}
