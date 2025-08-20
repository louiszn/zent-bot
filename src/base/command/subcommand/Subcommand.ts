import type { BaseCommandWithSubcommands } from "../Command.js";

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

const SUBCOMMANDS_METADATA_KEY = Symbol();

export function getSubcommandsMetadata<
	Constructor extends typeof BaseCommandWithSubcommands,
	Instance extends InstanceType<Constructor>,
>(constructor: Constructor) {
	return (
		(Reflect.getMetadata(SUBCOMMANDS_METADATA_KEY, constructor) as Subcommand<Instance>[]) || []
	);
}

export function setSubcommandMetadata<
	Constructor extends typeof BaseCommandWithSubcommands,
	Instance extends InstanceType<Constructor>,
>(constructor: Constructor, subcommands: Subcommand<Instance>[]) {
	return Reflect.defineMetadata(SUBCOMMANDS_METADATA_KEY, subcommands, constructor);
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

		const constructor = target.constructor as typeof BaseCommandWithSubcommands;

		const subcommand = new Subcommand<T>(identifier, executeFn);

		const subcommands = getSubcommandsMetadata(constructor);

		subcommands.push(subcommand);

		setSubcommandMetadata(constructor, subcommands);
	};
}
