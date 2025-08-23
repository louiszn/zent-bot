import type { Message } from "discord.js";
import type { User } from "discord.js";

import { ArgumentType, UserArgumentAcceptanceType } from "./enums.js";
import { extractId } from "../../../utils/string.js";

import type {
	Argument,
	IntegerArgument,
	NumberArgument,
	StringArgument,
	UserArgument,
} from "./ArgumentBuilder.js";
import type ZentBot from "../../ZentBot.js";
import { getArguments } from "./ArgumentManager.js";

type ArgumentValue = string | number | User;

interface ParsedResult {
	arg: Argument;
	value: ArgumentValue | ArgumentValue[];
}

interface ArgumentResolverOptions {
	/**
	 * Bot prefix, specified manually from content.
	 */
	prefix: string;
	/**
	 * Start index for arguments parser, used for locating where is the subcommand at.
	 */
	startAt: number;
	/**
	 * Raw values parsed from content.
	 */
	values: string[];
	/**
	 * Argument structures for matching values.
	 */
	args?: (Argument | null)[];
}

export default class ArgumentResolver {
	public parsed: Record<string, ParsedResult> = {};

	public constructor(
		public client: ZentBot<true>,
		public options: ArgumentResolverOptions,
	) {}

	public static create(message: Message<true>, prefix: string) {
		const values = message.content.slice(prefix.length).trim().split(/\s+/g);

		return new ArgumentResolver(message.client as ZentBot<true>, {
			prefix,
			values,
			startAt: 1, // Starts at second value because the first one is used for trigger
		});
	}

	/**
	 * Get the first value as the command trigger.
	 */
	public get trigger() {
		return this.values[0];
	}

	/**
	 * Get amount of specified argument values.
	 */
	public get specifiedAmount() {
		return this.values.length - this.options.startAt - 1;
	}

	/**
	 * Get parsed raw values from content.
	 */
	public get values(): readonly string[] {
		return [...this.options.values];
	}

	/**
	 * Get argument structures.
	 */
	public get args(): readonly (Argument | null)[] | undefined {
		return this.options.args ? [...this.options.args] : undefined;
	}

	public async resolve(args: (Argument | null)[], increaseStartPoint = false) {
		const child = new ArgumentResolver(this.client, {
			prefix: this.options.prefix,
			startAt: this.options.startAt + (increaseStartPoint ? 1 : 0),
			values: this.options.values,
			args,
		});

		if (!child.args) {
			throw new Error("Missing argument structures.");
		}

		if (this.specifiedAmount >= child.args.length) {
			await child.absoluteParse();
		} else {
			await child.dynamicParse();
		}

		return child;
	}

	public async resolveMethod(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		method: Function,
		increaseStartPoint = false,
	): Promise<ArgumentResolver> {
		const args = getArguments(method);

		if (!args) {
			return this;
		}

		return await this.resolve(args, increaseStartPoint);
	}

	public getString(name: string): string | null;
	public getString(name: string, required: true): string;
	public getString(name: string, required = false): string | null {
		const result = this.parsed[name];

		if (result === undefined) {
			if (required) {
				throw new Error(`Missing required string argument "${name}"`);
			}
			return null;
		}

		this.validateType(result, [ArgumentType.String]);
		return result.value as string;
	}

	public getNumber(name: string): number | null;
	public getNumber(name: string, required: true): number;
	public getNumber(name: string, required = false): number | null {
		const result = this.parsed[name];

		if (result === undefined) {
			if (required) {
				throw new Error(`Missing required number argument "${name}"`);
			}
			return null;
		}

		this.validateType(result, [ArgumentType.Number, ArgumentType.Integer]);
		return result.value as number;
	}

	public getInteger(name: string): number | null;
	public getInteger(name: string, required: true): number;
	public getInteger(name: string, required = false): number | null {
		const result = this.parsed[name];

		if (result === undefined) {
			if (required) {
				throw new Error(`Missing required integer argument "${name}"`);
			}
			return null;
		}

		this.validateType(result, [ArgumentType.Integer]);
		return result.value as number;
	}

	public getUser(name: string): User | null;
	public getUser(name: string, required: true): User;
	public getUser(name: string, required = false): User | null {
		const result = this.parsed[name];

		if (result === undefined) {
			if (required) {
				throw new Error(`Missing required user argument "${name}"`);
			}
			return null;
		}

		this.validateType(result, [ArgumentType.User]);
		return result.value as User;
	}

	public getStrings(name: string): string[] {
		const result = this.parsed[name];

		if (result === undefined) {
			throw new Error(`Invalid argument requested: ${name}`);
		}

		this.validateType(result, [ArgumentType.String], true);
		return result.value as string[];
	}

	public getNumbers(name: string): number[] {
		const result = this.parsed[name];

		if (result === undefined) {
			throw new Error(`Invalid argument requested: ${name}`);
		}

		this.validateType(result, [ArgumentType.Number, ArgumentType.Integer], true);
		return result.value as number[];
	}

	public getIntegers(name: string): number[] {
		const result = this.parsed[name];

		if (result === undefined) {
			throw new Error(`Invalid argument requested: ${name}`);
		}

		this.validateType(result, [ArgumentType.Integer], true);
		return result.value as number[];
	}

	public getUsers(name: string): User[] {
		const result = this.parsed[name];

		if (result === undefined) {
			throw new Error(`Invalid argument requested: ${name}`);
		}

		this.validateType(result, [ArgumentType.User], true);
		return result.value as User[];
	}

	private validateType(parsed: ParsedResult, expectedTypes: ArgumentType[], isTuple = false) {
		const { arg, value } = parsed;

		if (!expectedTypes.includes(arg.type)) {
			throw new Error(`Expected ${expectedTypes.join(", ")} argument but found "${arg.type}"`);
		}

		const isArgumentTuple = arg.tuple && Array.isArray(value);

		if (isTuple && !isArgumentTuple) {
			throw new Error(`Argument "${arg.name}" is not a tuple`);
		} else if (!isTuple && isArgumentTuple) {
			throw new Error(`Argument "${arg.name}" is a tuple`);
		}
	}

	/**
	 * Parse values using exact position as argument structures
	 */
	public async absoluteParse() {
		if (!this.args) {
			throw new Error("Missing args");
		}

		if (this.specifiedAmount > this.args.length && !this.args.at(-1)?.tuple) {
			throw new Error(
				`Expected ${this.args.length} values, but received ${this.values.length - 1}`,
			);
		}

		let valueIndex = this.options.startAt + 1;
		let argIndex = 0;

		while (valueIndex < this.values.length && argIndex < this.args.length) {
			const value = this.values[valueIndex];
			const arg = this.args[argIndex];

			if (arg === null) {
				valueIndex++;
				argIndex++;
				continue;
			}

			if (arg.tuple) {
				this.parsed[arg.name] = await this.resolveTuple(arg, valueIndex, argIndex);
				break; // Tuple must be the last one, so it's safe to break here
			}

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue === null) {
				throw new Error(`Missing required ${arg.type} argument "${arg.name}"`);
			}

			this.parsed[arg.name] = {
				arg,
				value: matchedValue,
			};

			valueIndex++;
			argIndex++;
		}
	}

	/**
	 * Loop through the argument structures until it find the exact one for the value each time.
	 * This one is used for structures that contains optional arguments
	 */
	public async dynamicParse() {
		if (!this.args) {
			throw new Error("Missing args");
		}

		let argIndex = 0;
		let valueIndex = this.options.startAt + 1;

		while (valueIndex < this.values.length && argIndex < this.args.length) {
			const value = this.values[valueIndex];
			const arg = this.args[argIndex];

			if (arg === null) {
				valueIndex++;
				argIndex++;
				continue;
			}

			if (arg.tuple) {
				this.parsed[arg.name] = await this.resolveTuple(arg, valueIndex, argIndex);
				break; // Tuple must be the last one, so it's safe to break here
			}

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue !== null) {
				this.parsed[arg.name] = {
					arg,
					value: matchedValue,
				};
				valueIndex++;
			} else if (arg.required) {
				throw new Error(`Missing required ${arg.type} argument "${arg.name}"`);
			}

			argIndex++;
		}

		while (argIndex < this.args.length) {
			const arg = this.args[argIndex];

			if (arg === null) {
				argIndex++;
				continue;
			}

			if (arg.required) {
				throw new Error(`Missing required ${arg.type} argument "${arg.name}"`);
			}

			argIndex++;
		}
	}

	private async resolveTuple(
		arg: Argument,
		startIndex: number,
		argIndex: number,
	): Promise<ParsedResult> {
		if (!this.args) {
			throw new Error("Missing args");
		}

		if (argIndex !== this.args.length - 1) {
			throw new Error("Tuple argument must be the last argument");
		}

		const values: ArgumentValue[] = [];

		console.log(startIndex);

		for (const rest of this.values.slice(startIndex)) {
			const matchedValue = await this.matchValue(arg, rest);

			if (matchedValue === null) {
				throw new Error(`Invalid value for variadic argument "${arg.name}": ${rest}`);
			}

			values.push(matchedValue);
		}

		if (values.length === 0 && arg.required) {
			throw new Error(`Missing required tuple ${arg.type} argument "${arg.name}"`);
		}

		return {
			arg,
			value: values,
		};
	}

	private async matchValue(arg: Argument, value: string): Promise<ArgumentValue | null> {
		switch (arg.type) {
			case ArgumentType.User:
				return this.matchUserValue(arg, value);
			case ArgumentType.Integer:
				return this.matchIntegerValue(arg, value);
			case ArgumentType.Number:
				return this.matchNumberValue(arg, value);
			case ArgumentType.String:
				return this.matchStringValue(arg, value);
			default:
				return null;
		}
	}

	private async matchUserValue(arg: UserArgument, value: string) {
		const userId = extractId(value);

		if (!userId) {
			return null;
		}

		const user = await this.client.users.fetch(userId).catch(() => null);

		if (!user) {
			return null;
		}

		if (arg.acceptance === UserArgumentAcceptanceType.Bot && !user.bot) {
			return null;
		}

		if (arg.acceptance === UserArgumentAcceptanceType.User && user.bot) {
			return null;
		}

		return user;
	}

	private matchIntegerValue(arg: IntegerArgument, value: string) {
		const intVal = parseInt(value, 10);

		if (isNaN(intVal)) {
			return null;
		}

		if (arg.minValue !== undefined && intVal < arg.minValue) {
			return null;
		}

		if (arg.maxValue !== undefined && intVal > arg.maxValue) {
			return null;
		}

		return intVal;
	}

	private matchNumberValue(arg: NumberArgument, value: string) {
		const numVal = parseFloat(value);

		if (isNaN(numVal)) {
			return null;
		}

		if (arg.minValue !== undefined && numVal < arg.minValue) {
			return null;
		}

		if (arg.maxValue !== undefined && numVal > arg.maxValue) {
			return null;
		}

		return numVal;
	}

	private matchStringValue(arg: StringArgument, value: string) {
		if (arg.minLength !== undefined && value.length < arg.minLength) {
			return null;
		}

		if (arg.maxLength !== undefined && value.length > arg.maxLength) {
			return null;
		}

		return value;
	}
}

export class DummyArgumentResolver extends ArgumentResolver {
	public constructor() {
		super(undefined as never, undefined as never);
	}
}
