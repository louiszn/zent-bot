import type {
	PrefixCommandConstructor,
	SlashCommandConstructor,
	ContextMenuCommandConstructor,
	HybridCommandConstructor,
	CommandConstructor,
} from "./Command.js";

import glob from "fast-glob";
import { pathToFileURL } from "node:url";

export default class CommandRegistry {
	private static readonly prefixCommands: PrefixCommandConstructor[] = [];
	private static readonly slashCommands: SlashCommandConstructor[] = [];
	private static readonly contextMenuCommands: ContextMenuCommandConstructor[] = [];
	private static readonly hybridCommands: HybridCommandConstructor[] = [];

	private static isFrozen = false;

	public static addSlashCommand(constructor: SlashCommandConstructor) {
		this.addConstructorToArray(constructor, this.slashCommands);
	}

	public static addPrefixCommand(constructor: PrefixCommandConstructor) {
		this.addConstructorToArray(constructor, this.prefixCommands);
	}

	public static addContextMenuCommand(constructor: ContextMenuCommandConstructor) {
		this.addConstructorToArray(constructor, this.contextMenuCommands);
	}

	public static addHybridCommand(constructor: HybridCommandConstructor) {
		this.addConstructorToArray(constructor, this.hybridCommands);
	}

	private static addConstructorToArray<C extends CommandConstructor>(constructor: C, array: C[]) {
		this.throwOnFrozen("Tried to add more entry while the command registry is frozen");
		array.push(constructor);
	}

	public static getSlashCommands(): readonly SlashCommandConstructor[] {
		return this.slashCommands;
	}

	public static getPrefixCommands(): readonly PrefixCommandConstructor[] {
		return this.prefixCommands;
	}

	public static getContextMenuCommands(): readonly ContextMenuCommandConstructor[] {
		return this.contextMenuCommands;
	}

	public static getHybridCommands(): readonly HybridCommandConstructor[] {
		return this.hybridCommands;
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

		Object.freeze(this.slashCommands);
		Object.freeze(this.prefixCommands);
		Object.freeze(this.contextMenuCommands);
		Object.freeze(this.hybridCommands);

		this.isFrozen = true;
	}

	public static async loadModules() {
		this.throwOnFrozen("loadModules() was called while the command registry is frozen");

		const files = await glob("dist/commands/**/*.js");

		let count = 0;

		await Promise.all(
			files.map(async (file) => {
				try {
					await import(pathToFileURL(file).toString());
					count++;
				} catch (error) {
					console.error(`An error occurred while loading command file '${file}':`, error);
				}
			}),
		);

		console.log(`✅ Loaded ${count} command files`);

		this.freezeRegistry();
	}
}
