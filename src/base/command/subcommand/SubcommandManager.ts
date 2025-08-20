import type { Awaitable, ChatInputCommandInteraction, Message } from "discord.js";
import { Collection } from "discord.js";
import type {
	BaseCommandWithSubcommands,
	HybridCommand,
	PrefixCommand,
	SlashCommand,
} from "../Command.js";

import type Subcommand from "./Subcommand.js";
import picomatch from "picomatch";
import type { HybridContext } from "../HybridContext.js";

export abstract class BaseSubcommandManager<Instance extends BaseCommandWithSubcommands> {
	protected chatInputs = new Collection<string, Subcommand<Instance>>();
	protected prefixes = new Collection<string, Subcommand<Instance>>();

	public add(subcommand: Subcommand<Instance>) {
		const { chatInput, prefixTriggers } = subcommand.identifier;

		if (chatInput) {
			this.chatInputs.set(chatInput, subcommand);
		}

		for (const trigger of prefixTriggers || []) {
			this.prefixes.set(trigger, subcommand);
		}
	}

	protected execute(
		subcommand: Subcommand<Instance>,
		instance: Instance,
		...args: Parameters<Instance["execute"]>
	): Awaitable<void> {
		return subcommand.method.call(instance, ...args);
	}

	public getFromInteraction(
		interaction: ChatInputCommandInteraction<"cached">,
	): Subcommand<Instance> | null {
		const name = interaction.options.getSubcommand(false);
		const groupName = interaction.options.getSubcommandGroup(false);

		if (!name) {
			return null;
		}

		const subcommandName = groupName ? `${groupName}.${name}` : name;
		return this.chatInputs.get(subcommandName) || null;
	}

	public getFromArgs(args: string[]): Subcommand<Instance> | null {
		return (
			this.prefixes.find((_, trigger) => {
				const depth = trigger.split(".").length + 1;
				const pattern = args.slice(1, depth).join(".");

				return picomatch.isMatch(pattern, trigger);
			}) || null
		);
	}

	public abstract handle(
		instance: Instance,
		...args: Parameters<Instance["execute"]>
	): Promise<void>;
}

export class HybridSubcommandManager extends BaseSubcommandManager<HybridCommand> {
	public override async handle(
		instance: HybridCommand,
		context: HybridContext,
		args: string[],
	): Promise<void> {
		const subcommand = context.isInteraction()
			? this.getFromInteraction(context.source)
			: this.getFromArgs(args);

		if (!subcommand) {
			return;
		}

		await this.execute(subcommand, instance, context, args);
	}
}

export class SlashSubcommandManager extends BaseSubcommandManager<SlashCommand> {
	public override async handle(
		instance: SlashCommand,
		interaction: ChatInputCommandInteraction<"cached">,
	): Promise<void> {
		const subcommand = this.getFromInteraction(interaction);

		if (!subcommand) {
			return;
		}

		await this.execute(subcommand, instance, interaction);
	}
}

export class PrefixSubcommandManager extends BaseSubcommandManager<PrefixCommand> {
	public override async handle(
		instance: PrefixCommand,
		message: Message<true>,
		args: string[],
	): Promise<void> {
		const subcommand = this.getFromArgs(args);

		if (!subcommand) {
			return;
		}

		await this.execute(subcommand, instance, message, args);
	}
}
