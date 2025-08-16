import { Collection } from "discord.js";

import picomatch from "picomatch";

import { HybridCommand, type BaseCommandWithSubcommands } from "../Command.js";

import { PrefixHybridContext, SlashHybridContext } from "../HybridContext.js";

import type { Awaitable, ChatInputCommandInteraction, Message } from "discord.js";
import type { PrefixCommand, SlashCommand } from "../Command.js";
import type Subcommand from "./Subcommand.js";

export default class SubcommandManager<C extends typeof BaseCommandWithSubcommands> {
	private chatInputs = new Collection<string, Subcommand<InstanceType<C>>>();
	private prefixes = new Collection<string, Subcommand<InstanceType<C>>>();

	public constructor(public commandClass: C) {}

	public add(subcommand: Subcommand<InstanceType<C>>) {
		const { chatInput, prefixTriggers } = subcommand.identifier;

		if (chatInput) {
			this.chatInputs.set(chatInput, subcommand);
		}

		for (const trigger of prefixTriggers || []) {
			this.prefixes.set(trigger, subcommand);
		}
	}

	public getByArgs(args: string[]) {
		return this.prefixes.find((_, trigger) => {
			const depth = trigger.split(".").length + 1;
			const pattern = args.slice(1, depth).join(".");

			return picomatch.isMatch(pattern, trigger);
		});
	}

	public execute(
		subcommand: Subcommand<InstanceType<C>>,
		instance: InstanceType<C>,
		...args: Parameters<InstanceType<C>["execute"]>
	): Awaitable<void> | undefined {
		return subcommand.method.call(instance, ...args);
	}

	public async handleChatInput(
		instance: InstanceType<C>,
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!this.chatInputs.size) {
			return;
		}

		const name = interaction.options.getSubcommand(false);
		const groupName = interaction.options.getSubcommandGroup(false);

		if (!name) {
			return;
		}

		const subcommandName = groupName ? `${groupName}.${name}` : name;
		const subcommand = this.chatInputs.get(subcommandName);

		if (!subcommand) {
			return;
		}

		if (instance instanceof HybridCommand) {
			await (this as unknown as SubcommandManager<typeof HybridCommand>).execute(
				subcommand,
				instance,
				new SlashHybridContext(interaction),
				[],
			);
		} else {
			await (this as unknown as SubcommandManager<typeof SlashCommand>).execute(
				subcommand,
				instance,
				interaction,
			);
		}
	}

	public async handlePrefix(instance: InstanceType<C>, message: Message<true>, args: string[]) {
		if (!this.prefixes.size) {
			return;
		}

		const subcommand = this.getByArgs(args);

		if (!subcommand) {
			return;
		}

		if (instance instanceof HybridCommand) {
			await (this as unknown as SubcommandManager<typeof HybridCommand>).execute(
				subcommand,
				instance,
				new PrefixHybridContext(message),
				args,
			);
		} else {
			await (this as unknown as SubcommandManager<typeof PrefixCommand>).execute(
				subcommand,
				instance,
				message,
				args,
			);
		}
	}
}
