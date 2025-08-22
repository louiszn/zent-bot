import { ArgumentType, UserArgumentAcceptanceType } from "./enums.js";

import { z } from "zod";

export interface BaseArgument {
	name: string;
	description?: string;
	type: ArgumentType;
	required: boolean;
	tuple: boolean;
}

export interface StringArgument extends BaseArgument {
	type: ArgumentType.String;
	maxLength?: number;
	minLength?: number;
}

export interface IntegerArgument extends BaseArgument {
	type: ArgumentType.Integer;
	maxValue?: number;
	minValue?: number;
}

export interface NumberArgument extends BaseArgument {
	type: ArgumentType.Number;
	maxValue?: number;
	minValue?: number;
}

export interface UserArgument extends BaseArgument {
	type: ArgumentType.User;
	acceptance?: UserArgumentAcceptanceType;
}

export type Argument = StringArgument | IntegerArgument | NumberArgument | UserArgument;

export interface ArgumentBuilderMatcher {
	[ArgumentType.String]: StringArgumentBuilder;
	[ArgumentType.Integer]: IntegerArgumentBuilder;
	[ArgumentType.Number]: NumberArgumentBuilder;
	[ArgumentType.User]: UserArgumentBuilder;
}

const argumentSchema = z.object({
	type: z.enum(ArgumentType),
	name: z.string(),
	description: z.string().optional(),
	required: z.boolean().optional().default(false),
	tuple: z.boolean().optional().default(false),
}) satisfies z.ZodType<BaseArgument>;

const stringArgumentSchema = argumentSchema.extend({
	type: z.literal(ArgumentType.String),
	maxLength: z.int().optional(),
	minLength: z.int().optional(),
}) satisfies z.ZodType<StringArgument>;

const integerArgumentSchema = argumentSchema.extend({
	type: z.literal(ArgumentType.Integer),
	maxValue: z.int().optional(),
	minValue: z.int().optional(),
}) satisfies z.ZodType<IntegerArgument>;

const numberArgumentSchema = argumentSchema.extend({
	type: z.literal(ArgumentType.Number),
	maxValue: z.number().optional(),
	minValue: z.number().optional(),
}) satisfies z.ZodType<NumberArgument>;

const userArgumentSchema = argumentSchema.extend({
	type: z.literal(ArgumentType.User),
	acceptance: z.enum(UserArgumentAcceptanceType).optional(),
}) satisfies z.ZodType<UserArgument>;

const schemas = {
	[ArgumentType.String]: stringArgumentSchema,
	[ArgumentType.Integer]: integerArgumentSchema,
	[ArgumentType.Number]: numberArgumentSchema,
	[ArgumentType.User]: userArgumentSchema,
} satisfies Record<ArgumentType, z.ZodObject>;

export default class ArgumentBuilder<Data extends Argument> {
	public constructor(protected data: Partial<Data> = {}) {}

	public setName(name: string): this {
		this.data.name = name;
		return this;
	}

	public setDescription(description: string): this {
		this.data.description = description;
		return this;
	}

	public setType<T extends keyof ArgumentBuilderMatcher>(type: T): ArgumentBuilderMatcher[T];
	public setType(type: unknown): unknown {
		switch (type) {
			case ArgumentType.String:
				return new StringArgumentBuilder({ ...this.data, type });
			case ArgumentType.Integer:
				return new IntegerArgumentBuilder({ ...this.data, type });
			case ArgumentType.Number:
				return new NumberArgumentBuilder({ ...this.data, type });
			case ArgumentType.User:
				return new UserArgumentBuilder({ ...this.data, type });
		}
	}

	public setRequired(required: boolean): this {
		this.data.required = required;
		return this;
	}

	public setTuple(tuple: boolean): this {
		this.data.tuple = tuple;
		return this;
	}

	public toJSON(): Data {
		if (!this.data.type) {
			throw new Error("Argument must have a type");
		}

		const schema = schemas[this.data.type];

		if (!schema) {
			throw new Error(`Unsupported argument type: ${this.data.type}`);
		}

		return schema.parse(this.data) as unknown as Data;
	}
}

export class StringArgumentBuilder extends ArgumentBuilder<StringArgument> {
	public setMaxLength(value: number): this {
		this.data.maxLength = value;
		return this;
	}

	public setMinLength(value: number): this {
		this.data.minLength = value;
		return this;
	}
}

export class IntegerArgumentBuilder extends ArgumentBuilder<IntegerArgument> {
	public setMaxValue(value: number) {
		this.data.maxValue = value;
		return this;
	}

	public setMinValue(value: number) {
		this.data.minValue = value;
		return this;
	}
}

export class NumberArgumentBuilder extends ArgumentBuilder<NumberArgument> {
	public setMaxValue(value: number) {
		this.data.maxValue = value;
		return this;
	}

	public setMinValue(value: number) {
		this.data.minValue = value;
		return this;
	}
}

export class UserArgumentBuilder extends ArgumentBuilder<UserArgument> {
	public setAcceptance(value: UserArgumentAcceptanceType) {
		this.data.acceptance = value;
		return this;
	}
}
