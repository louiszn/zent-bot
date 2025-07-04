import { Collection } from "discord.js";
import { SlashCommand, HybridCommand, PrefixCommand, ContextMenuCommand, loadCommandRegistry, BaseCommand } from "../base/Command.js";

export default class CommandManager {
	public slashCommands: Collection<string, SlashCommand | HybridCommand> = new Collection();
	public prefixCommands: Collection<string, PrefixCommand | HybridCommand> = new Collection();
	public contextMenuCommands: Collection<string, ContextMenuCommand> = new Collection();

	public async loadCommands(): Promise<void> {
		const {
			slashCommandsRegistry,
			prefixCommandsRegistry,
			contextMenuCommandsRegistry,
			hybridCommandsRegistry
		} = await loadCommandRegistry();

		let commandCount = 0;

		for (const constructor of slashCommandsRegistry) {
			try {
				const instance = new constructor();

				if (this.registerSlashCommand(constructor.data.name, instance)) {
					commandCount++;
				}
			} catch (error) {
				this.logCommandRegisterError(error, constructor.name, "slash");
			}
		}

		for (const constructor of prefixCommandsRegistry) {
			try {
				const instance = new constructor();

				if (this.registerPrefixCommand(constructor.triggers, instance)) {
					commandCount++;
				}
			} catch (error) {
				this.logCommandRegisterError(error, constructor.name, "prefix");
			}
		}

		for (const constructor of contextMenuCommandsRegistry) {
			try {
				const instance = new constructor();

				if (this.registerContextMenuCommand(constructor.data.name, instance)) {
					commandCount++;
				}
			} catch (error) {
				this.logCommandRegisterError(error, constructor.name, "context menu");
			}
		}

		for (const constructor of hybridCommandsRegistry) {
			try {
				const instance = new constructor();

				const {
					applicationCommandData: { name },
					prefixTriggers
				} = constructor;

				if (this.registerHybridCommand(name, prefixTriggers, instance)) {
					commandCount++;
				}
			} catch (error) {
				this.logCommandRegisterError(error, constructor.name, "hybrid");
			}
		}

		console.log(`Loaded ${commandCount} commands`);
	}

	private logCommandRegisterError(error: unknown, name: string, type: string) {
		console.error(`An error occurred while registering ${type} command '${name}':`, error)
	}

	private registerSlashCommand(name: string, instance: SlashCommand | HybridCommand): boolean {
		return this.registerInCollection(this.slashCommands, name, instance, "slash command");
	}

	private registerPrefixTrigger(trigger: string, instance: PrefixCommand | HybridCommand): boolean {
		return this.registerInCollection(this.prefixCommands, trigger, instance, "prefix trigger");
	}

	private registerContextMenuCommand(name: string, instance: ContextMenuCommand): boolean {
		return this.registerInCollection(this.contextMenuCommands, name, instance, "context menu command");
	}

	private registerPrefixCommand(triggers: string[], instance: PrefixCommand | HybridCommand): boolean {
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
			console.warn(`Registered ${count}/${triggers.length} triggers for ${instance.constructor.name}`);
		}

		return true;
	}

	private registerInCollection<T extends BaseCommand>(
		collection: Collection<string, T>,
		key: string,
		instance: T,
		type: string
	): boolean {
		if (collection.has(key)) {
			console.warn(`Duplicate ${type} detected from ${instance.constructor.name}: ${key}`);
			return false;
		}

		collection.set(key, instance);

		return true;
	}

	private registerHybridCommand(name: string, triggers: string[], instance: HybridCommand): boolean {
		const isSlashAdded = this.registerSlashCommand(name, instance);
		const isPrefixAdded = this.registerPrefixCommand(triggers, instance);

		const isAdded = isSlashAdded || isPrefixAdded;

		if (isAdded && (!isSlashAdded || !isPrefixAdded)) {
			console.warn(`Partial registration for hybrid command ${instance.constructor.name}: slash=${isSlashAdded}, prefix=${isPrefixAdded}`);
		}

		return isAdded;
	}
}
