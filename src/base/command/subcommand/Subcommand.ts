import type { BaseCommandWithSubcommands, CommandWithSubcommandsConstructor } from "../Command.js";

export interface ManualSubcommandIdentifier {
	chatInput?: string;
	prefixTriggers?: string[];
}

export type SubcommandIdentifier = ManualSubcommandIdentifier | string;

export default class Subcommand<T extends BaseCommandWithSubcommands> {
	public constructor(
		public identifier: ManualSubcommandIdentifier,
		public method: T["execute"],
	) {}
}

export function useSubcommand(identifier: SubcommandIdentifier) {
	return function <T extends BaseCommandWithSubcommands, M extends T["execute"]>(
		target: T,
		key: string,
		descriptor: TypedPropertyDescriptor<M>,
	) {
		const { value: executeFn } = descriptor;

		if (!executeFn) {
			return;
		}

		if (typeof identifier === "string") {
			identifier = {
				chatInput: identifier,
				prefixTriggers: [identifier],
			};
		}

		const subcommand = new Subcommand<T>(identifier, executeFn);

		(target.constructor as CommandWithSubcommandsConstructor).subcommands.add(subcommand);
	};
}
