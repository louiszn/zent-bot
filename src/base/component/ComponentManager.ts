import { Collection } from "discord.js";
import type ZentBot from "../ZentBot.js";

import type { Component } from "./Component.js";
import ComponentRegistry from "./ComponentRegistry.js";
import logger from "../../libs/logger.js";

export default class ComponentManager<Ready extends boolean = boolean> extends Collection<
	string,
	Component
> {
	public components: Collection<string, Component> = new Collection();

	public constructor(public client: ZentBot<Ready>) {
		super();
	}

	public async load() {
		await ComponentRegistry.load();

		const componentsRegistry = ComponentRegistry.getComponents();

		let count = 0;

		for (const constructor of componentsRegistry) {
			try {
				const instance = new constructor();

				this.components.set(constructor.prefix, instance);

				count++;
			} catch (error) {
				logger.error(`An error occurred while loading component ${constructor.name}:`, error);
			}
		}

		logger.success(`Successfully loaded ${count}/${componentsRegistry.length} components.`);
	}
}
