import dotenv from "dotenv";
dotenv.config({ quiet: true });

const config = {
	botToken: process.env.BOT_TOKEN!,
	clientId: process.env.CLIENT_ID!,
	databaseURL: process.env.DATABASE_URL!,
	rbd: {
		guildId: process.env.RBD_GUILD_ID!,
		channelId: process.env.RBD_CHANNEL_ID!,
	},
};

export default config;
