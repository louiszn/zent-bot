# Zent Bot

Zent Bot is an utility bot, originally made with love for our friends' server, especially for role playing.

## Installation

### Requirements

- [Node.js](https://nodejs.org/) version >= 20
- [PNPM](https://pnpm.io) package manager
- [PostgreSQL](https://www.postgresql.org/) database

### How to install

#### 1. Clone the project

```
git clone https://github.com/louiszn/zent-bot.git
cd zent-bot
```

#### 2. Install all dependencies

```sh
pnpm install
```

#### 3. Setup environment variables

`.env` file contains sensitive information, also known as "secrets", such as your bot token, etc. First, let's create a `.env` file from example one:

```sh
cp .env.example .env
```

Next, fill your `.env` file with your secrets by the following the comments in the file.

> [!TIP]  
> You may want to specify `NODE_ENV` variable as `production`. Otherwise, it will use `development` by default.

#### 4. Make changes for your database

After [setting up the `.env` file](#3-setup-environment-variables), especially `DATABASE_URL` variable, You need to setup the tables for your database by using the following command:

```sh
pnpm exec drizzle-kit push
```

If your database have any existing tables, you may need to pull and migrate your database, see [Drizzle Migrations](https://orm.drizzle.team/docs/migrations).

#### 5. Build the project

This project is built completely with TypeScript. Unlike runtimes like [Bun](https://bun.sh/), [Deno](https://deno.com/), etc. which support TypeScript natively, Node.js, the runtime this project is currently using, TypeScript native support is still an experimental feature. You need to compile it into a JavaScript version by using this command:

```sh
pnpm build
```

After building, `dist` directory will be created, containing JavaScript version of the source code.

#### 6. Deploy all application commands

You have to deploy commands for your bot manually.

```sh
pnpm deploy
```

You may need to reload your Discord client to see the changes

#### 7. Start the bot!

```sh
pnpm start
```

Wait for everything to be loaded... and you are done!

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. You can also ask questions about the bot and the project in our Discord server ❤️
