import type { BaseCommand } from "../Command.js";
import type { Argument } from "./ArgumentBuilder.js";
import ArgumentBuilder from "./ArgumentBuilder.js";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const argumentStore = new WeakMap<Function, (Argument | null)[]>();

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getArguments(method: Function): (Argument | null)[] | undefined {
	return argumentStore.get(method);
}

export function useArguments(
	...args: (
		| ArgumentBuilder<Argument>
		| ((arg: ArgumentBuilder<Argument>) => ArgumentBuilder<Argument>)
		| null
	)[]
) {
	return function <T extends BaseCommand, M extends T["execute"]>(
		target: T,
		key: string,
		descriptor: TypedPropertyDescriptor<M>,
	) {
		const builtArgs = args.map((arg) => {
			if (arg === null) {
				return null;
			}

			if (typeof arg === "function") {
				return arg(new ArgumentBuilder<Argument>());
			}

			return arg;
		});

		if (descriptor.value) {
			argumentStore.set(
				descriptor.value,
				builtArgs.map((builder) => {
					if (builder === null) {
						return null;
					}

					return builder.toJSON();
				}),
			);
		}
	};
}
