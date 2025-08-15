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
import logger from "../../libs/logger.js";

type RegisterCommandFn<T extends Command, C extends CommandConstructor> = (
	instance: T,
	constructor: C,
) => boolean;

interface CommandRegistries {
	slash: readonly SlashCommandConstructor[];
	prefix: readonly PrefixCommandConstructor[];
	contextMenu: readonly ContextMenuCommandConstructor[];
	hybrid: readonly HybridCommandConstructor[];
}

interface CommandRegistrationCounts {
	slash: number;
	prefix: number;
	contextMenu: number;
	hybrid: number;
}

export default class CommandManager<Ready extends boolean = boolean> {
	public slashes: Collection<string, SlashCommand | HybridCommand> = new Collection();
	public prefixes: Collection<string, PrefixCommand | HybridCommand> = new Collection();
	public contextMenus: Collection<string, ContextMenuCommand> = new Collection();

	public constructor(public client: ZentBot<Ready>) {}

	public async load(): Promise<void> {
		await CommandRegistry.load();

		const registries = this.getCommandRegistries();

		const registrationCounts = this.registerAllCommandTypes(registries);

		this.logRegistrationSummary(registries, registrationCounts);
	}

	private getCommandRegistries(): CommandRegistries {
		return {
			slash: CommandRegistry.getSlashCommands(),
			prefix: CommandRegistry.getPrefixCommands(),
			contextMenu: CommandRegistry.getContextMenuCommands(),
			hybrid: CommandRegistry.getHybridCommands(),
		};
	}

	private registerAllCommandTypes(registries: CommandRegistries): CommandRegistrationCounts {
		const slashCommandCount = this.registerCommands<SlashCommand, SlashCommandConstructor>(
			registries.slash,
			"slash",
			(instance, { data: { name } }) => this.registerSlashCommand(name, instance),
		);

		const prefixCommandCount = this.registerCommands<PrefixCommand, PrefixCommandConstructor>(
			registries.prefix,
			"prefix",
			(instance, { triggers }) => this.registerPrefixCommand(triggers, instance),
		);

		const contextMenuCommandCount = this.registerCommands<
			ContextMenuCommand,
			ContextMenuCommandConstructor
		>(registries.contextMenu, "context menu", (instance, { data: { name } }) =>
			this.registerContextMenuCommand(name, instance),
		);

		const hybridCommandCount = this.registerCommands<HybridCommand, HybridCommandConstructor>(
			registries.hybrid,
			"hybrid",
			(instance, { applicationCommandData: { name }, prefixTriggers }) =>
				this.registerHybridCommand(name, prefixTriggers, instance),
		);

		return {
			slash: slashCommandCount,
			prefix: prefixCommandCount,
			contextMenu: contextMenuCommandCount,
			hybrid: hybridCommandCount,
		};
	}

	private logRegistrationSummary(registries: CommandRegistries, counts: CommandRegistrationCounts) {
		const totalRegistryCount = Object.values(
			registries as unknown as Record<string, CommandConstructor[]>,
		).reduce((total, registry) => total + registry.length, 0);

		const totalRegisteredCount = Object.values(counts as unknown as Record<string, number>).reduce(
			(total, count) => total + count,
			0,
		);

		logger.success(
			[
				`Registered total ${totalRegisteredCount}/${totalRegistryCount} commands:`,
				`    + 📤 Slash:        ${counts.slash}/${registries.slash.length}`,
				`    + 📝 Prefix:       ${counts.prefix}/${registries.prefix.length}`,
				`    + 📋 Context Menu: ${counts.contextMenu}/${registries.contextMenu.length}`,
				`    + ⚡ Hybrid:       ${counts.hybrid}/${registries.hybrid.length}`,
			].join("\n"),
		);
	}

	private registerCommands<T extends Command, C extends CommandConstructor>(
		registry: readonly C[],
		type: string,
		registerFn: RegisterCommandFn<T, C>,
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
		logger.error(`An error occurred while registering ${type} command '${name}':`, error);
	}

	private registerSlashCommand(name: string, instance: SlashCommand | HybridCommand): boolean {
		return this.registerInCollection(this.slashes, name, instance, "slash command");
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
			logger.warn(
				`Registered ${count}/${triggers.length} triggers for ${instance.constructor.name}`,
			);
		}

		return true;
	}

	private registerPrefixTrigger(trigger: string, instance: PrefixCommand | HybridCommand): boolean {
		return this.registerInCollection(this.prefixes, trigger, instance, "prefix trigger");
	}

	private registerContextMenuCommand(name: string, instance: ContextMenuCommand): boolean {
		return this.registerInCollection(this.contextMenus, name, instance, "context menu command");
	}

	private registerInCollection<T extends Command>(
		collection: Collection<string, T>,
		key: string,
		instance: T,
		type: string,
	): boolean {
		if (collection.has(key)) {
			logger.warn(`Duplicate ${type} detected from ${instance.constructor.name}: ${key}`);
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
			logger.warn(
				`Partial registration for hybrid command ${instance.constructor.name}: slash=${isSlashAdded}, prefix=${isPrefixAdded}`,
			);
		}

		return isAdded;
	}
}
