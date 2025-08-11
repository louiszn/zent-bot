import type {
	AnySelectMenuInteraction,
	ButtonInteraction,
	ModalSubmitInteraction,
} from "discord.js";
import type ZentBot from "../ZentBot.js";
import ComponentRegistry from "./ComponentRegistry.js";

export abstract class Component {
	public constructor(protected client: ZentBot<true>) {}

	public executeButton?(interaction: ButtonInteraction<"cached">, args: string[]): Promise<void>;
	public executeSelectMenu?(
		interaction: AnySelectMenuInteraction<"cached">,
		args: string[],
	): Promise<void>;
	public executeModalSubmit?(
		interaction: ModalSubmitInteraction<"cached">,
		args: string[],
	): Promise<void>;
}

export interface ComponentConstructor {
	new (): Component;
	prefix: string;
}

export function useComponent(prefix: string) {
	return function <T extends typeof Component>(constructor: T) {
		const correctConstructor = constructor as T & ComponentConstructor;

		correctConstructor.prefix = prefix;

		ComponentRegistry.addComponent(correctConstructor);
	};
}
