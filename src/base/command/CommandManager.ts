import { Collection } from "discord.js";
import type {
	SlashCommand,
	HybridCommand,
	PrefixCommand,
	ContextMenuCommand,
	SlashCommandConstructor,
	PrefixCommandConstructor,
	ContextMenuCommandConstructor,
	HybridCommandConstructor,
	CommandConstructor,
	Command,
} from "./Command.js";

import type ZentBot from "../ZentBot.js";
import CommandRegistry from "./CommandRegistry.js";

export default class CommandManager<Ready extends boolean = boolean> {
	public slashCommands: Collection<string, SlashCommand | HybridCommand> = new Collection();
	public prefixCommands: Collection<string, PrefixCommand | HybridCommand> = new Collection();
	public contextMenuCommands: Collection<string, ContextMenuCommand> = new Collection();

	public constructor(public client: ZentBot<Ready>) {}

	public async loadCommands(): Promise<void> {
		await CommandRegistry.loadModules();

		const slashCommandsRegistry = CommandRegistry.getSlashCommands();
		const prefixCommandsRegistry = CommandRegistry.getPrefixCommands();
		const contextMenuCommandsRegistry = CommandRegistry.getContextMenuCommands();
		const hybridCommandsRegistry = CommandRegistry.getHybridCommands();

		const slashCommandCount = this.registerCommandType<SlashCommand, SlashCommandConstructor>(
			slashCommandsRegistry,
			"slash",
			(instance, { data: { name } }) => this.registerSlashCommand(name, instance),
		);

		const prefixCommandCount = this.registerCommandType<PrefixCommand, PrefixCommandConstructor>(
			prefixCommandsRegistry,
			"prefix",
			(instance, { triggers }) => this.registerPrefixCommand(triggers, instance),
		);

		const contextMenuCommandCount = this.registerCommandType<
			ContextMenuCommand,
			ContextMenuCommandConstructor
		>(contextMenuCommandsRegistry, "context menu", (instance, { data: { name } }) =>
			this.registerContextMenuCommand(name, instance),
		);

		const hybridCommandCount = this.registerCommandType<HybridCommand, HybridCommandConstructor>(
			hybridCommandsRegistry,
			"hybrid",
			(instance, { applicationCommandData: { name }, prefixTriggers }) =>
				this.registerHybridCommand(name, prefixTriggers, instance),
		);

		const registryCount = [
			slashCommandsRegistry,
			prefixCommandsRegistry,
			contextMenuCommandsRegistry,
			hybridCommandsRegistry
		].reduce((total, registry) => total + registry.length, 0);

		const commandCount = [
			slashCommandCount,
			prefixCommandCount,
			contextMenuCommandCount,
			hybridCommandCount
		].reduce((total, count) => total + count, 0);

		console.log(
			[
				`✅ Registered total ${commandCount}/${registryCount} commands:`,
				`+ 📤 Slash:        ${slashCommandCount}/${slashCommandsRegistry.length}`,
				`+ 📝 Prefix:       ${prefixCommandCount}/${prefixCommandsRegistry.length}`,
				`+ 📋 Context Menu: ${contextMenuCommandCount}/${contextMenuCommandsRegistry.length}`,
				`+ ⚡ Hybrid:       ${hybridCommandCount}/${hybridCommandsRegistry.length}`,
			].join("\n"),
		);
	}

	private registerCommandType<T extends Command, C extends CommandConstructor>(
		registry: readonly C[],
		type: string,
		registerFn: (instance: T, constructor: C) => boolean,
	) {
		let count = 0;

		for (const constructor of registry) {
			try {
				const instance = new constructor(this.client as ZentBot<true>) as T & C;

				if (registerFn(instance, constructor)) {
					count++;
				}
			} catch (error) {
				this.logCommandRegisterError(error, constructor.name, type);
			}
		}

		return count;
	}

	private logCommandRegisterError(error: unknown, name: string, type: string) {
		console.error(`An error occurred while registering ${type} command '${name}':`, error);
	}

	private registerSlashCommand(name: string, instance: SlashCommand | HybridCommand): boolean {
		return this.registerInCollection(this.slashCommands, name, instance, "slash command");
	}

	private registerPrefixTrigger(trigger: string, instance: PrefixCommand | HybridCommand): boolean {
		return this.registerInCollection(this.prefixCommands, trigger, instance, "prefix trigger");
	}

	private registerContextMenuCommand(name: string, instance: ContextMenuCommand): boolean {
		return this.registerInCollection(
			this.contextMenuCommands,
			name,
			instance,
			"context menu command",
		);
	}

	private registerPrefixCommand(
		triggers: string[],
		instance: PrefixCommand | HybridCommand,
	): boolean {
		let count = 0;

		for (const trigger of triggers) {
			if (this.registerPrefixTrigger(trigger, instance)) {
				count++;
			}
		}

		if (count === 0) {
			return false;
		}

		if (count != triggers.length) {
			console.warn(
				`Registered ${count}/${triggers.length} triggers for ${instance.constructor.name}`,
			);
		}

		return true;
	}

	private registerInCollection<T extends Command>(
		collection: Collection<string, T>,
		key: string,
		instance: T,
		type: string,
	): boolean {
		if (collection.has(key)) {
			console.warn(`Duplicate ${type} detected from ${instance.constructor.name}: ${key}`);
			return false;
		}

		collection.set(key, instance);

		return true;
	}

	private registerHybridCommand(
		name: string,
		triggers: string[],
		instance: HybridCommand,
	): boolean {
		const isSlashAdded = this.registerSlashCommand(name, instance);
		const isPrefixAdded = this.registerPrefixCommand(triggers, instance);

		const isAdded = isSlashAdded || isPrefixAdded;

		if (isAdded && (!isSlashAdded || !isPrefixAdded)) {
			console.warn(
				`Partial registration for hybrid command ${instance.constructor.name}: slash=${isSlashAdded}, prefix=${isPrefixAdded}`,
			);
		}

		return isAdded;
	}
}
