import { Snowflake } from "@sapphire/snowflake";

const epoch = new Date("2009-06-10T00:00:00.000Z");

const snowflake = new Snowflake(epoch);

export default snowflake;
