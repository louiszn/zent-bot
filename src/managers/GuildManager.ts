import { Collection } from "discord.js";
import { eq, type InferSelectModel } from "drizzle-orm";
import { guildsTable } from "../database/schema/guild.js";
import db from "../database/index.js";

export type GuildData = InferSelectModel<typeof guildsTable>;
export type GuildCollection = Collection<string, GuildData>;

export default class GuildManager {
	private static cache: GuildCollection = new Collection();

	private static initialized = false;

	public static async getAll(force = false): Promise<GuildCollection> {
		if (!this.initialized || force) {
			const guilds = await db.query.guildsTable.findMany();

			const newCache: GuildCollection = new Collection();

			for (const guild of guilds) {
				newCache.set(guild.id, guild);
			}

			this.initialized = true;

			this.cache = newCache;
		}

		return this.cache;
	}

	public static async get(id: string, force = false): Promise<GuildData | null> {
		const guilds = await this.getAll(force);
		return guilds.get(id) || null;
	}

	public static async create(
		id: string,
		data: Omit<Partial<GuildData>, "id"> = {},
	): Promise<GuildData> {
		const [guild] = await db
			.insert(guildsTable)
			.values({ ...data, id })
			.onConflictDoNothing()
			.returning();

		this.cache.set(id, guild);

		return guild;
	}

	public static async update(
		id: string,
		data: Omit<Partial<GuildData>, "id">,
	): Promise<GuildData | null> {
		if (!this.cache.has(id)) {
			return null;
		}

		const [guild] = await db
			.update(guildsTable)
			.set(data)
			.where(eq(guildsTable.id, id))
			.returning();

		if (!guild) {
			return null;
		}

		this.cache.set(id, guild);

		return guild;
	}

	public static async delete(id: string): Promise<GuildData | null> {
		if (!this.cache.has(id)) {
			return null;
		}

		const [guild] = await db.delete(guildsTable).where(eq(guildsTable.id, id)).returning();

		if (!guild) {
			return null;
		}

		this.cache.delete(id);

		return guild;
	}
}
