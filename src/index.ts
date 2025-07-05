import ZentBot from "./base/ZentBot.js";
import logger from "./libs/logger.js";

import prisma from "./libs/prisma.js";

await prisma.$connect();
logger.success("Successfully connected to database");

const bot = new ZentBot();
await bot.initialize();
