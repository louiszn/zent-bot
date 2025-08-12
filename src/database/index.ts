import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index.js";

import config from "../config.js";

const pool = new Pool({
	connectionString: config.databaseURL,
	max: 10,
	min: 2,
});

const db = drizzle(pool, { schema });

export default db;
