import type { ComponentConstructor } from "./Component.js";
import fg from "fast-glob";
import { pathToFileURL } from "node:url";
import logger from "../../libs/logger.js";

export default class ComponentRegistry {
	private static components: ComponentConstructor[] = [];
	private static isFrozen = false;

	public static addComponent(constructor: ComponentConstructor) {
		this.throwOnFrozen("Tried to add more entry while the command registry is frozen");
		this.components.push(constructor);
	}

	public static getComponents(): readonly ComponentConstructor[] {
		return this.components;
	}

	private static throwOnFrozen(message: string) {
		if (this.isFrozen) {
			throw new Error(message);
		}
	}

	private static freezeRegistry() {
		if (this.isFrozen) {
			return;
		}

		Object.freeze(this.components);

		this.isFrozen = true;
	}

	public static async loadModules() {
		this.throwOnFrozen("loadModules() was called while the component registry is frozen");

		const files = await fg.glob("dist/components/**/*.js");

		for (const file of files) {
			try {
				await import(pathToFileURL(file).toString());
			} catch (error) {
				logger.error(`Failed to load component file: ${file}`, error);
			}
		}

		this.freezeRegistry();
	}
}
