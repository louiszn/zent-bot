import dotenv from "dotenv";
dotenv.config();

const config = {
	botToken: process.env.BOT_TOKEN!,
	clientId: process.env.CLIENT_ID!,
};

export default config;
