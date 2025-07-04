import ZentBot from "./base/ZentBot.js";
import prisma from "./libs/prisma.js";
await prisma.$connect();
console.log("Successfully connected to database.");
const bot = new ZentBot();
await bot.initialize();
