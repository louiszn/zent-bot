# Zent Bot

Zent Bot is a utility bot, originally made with love for our friends' server, especially for role-playing.

<div align="center">
	<a href="https://discord.gg/pGnKbMfXke"><img alt="Discord" src="https://img.shields.io/discord/1353321517437681724?logo=discord&logoColor=white"></a>
	<a href="https://github.com/louiszn/zent-bot/blob/main/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/louiszn/zent-bot?logo=github&logoColor=white"></a>
	<a href="https://github.com/louiszn/zent-bot/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/louiszn/zent-bot?logo=github&logoColor=white"></a>
</div>

## Installation

### Requirements

- [Node.js](https://nodejs.org/) version >= 20
- [PNPM](https://pnpm.io) package manager
- [PostgreSQL](https://www.postgresql.org/) database

### How to install

#### 1. Clone the project

First, clone the bot repository to your local machine using [Git](https://git-scm.com/):

```
git clone https://github.com/louiszn/zent-bot.git
cd zent-bot
```

This will download all the source code in a new directory named `zent-bot`.

By default, it will use the `main` branch, which is the development branch and may receive a lot of unstable features. If you are just going to use the bot, it's recommended to switch to the `stable` branch. You can do that by using this command:

```sh
git checkout stable
```

You can also learn more about Git [here](https://github.com/git-guides).

#### 2. Install all dependencies

Dependencies are not included by default, so you will need to install them with this command:

```sh
pnpm install
```

This will read the `package.json` file and install all necessary libraries that Zent Bot needs to run.

#### 3. Set up environment variables

The `.env` file contains sensitive information, also known as "secrets", such as your bot token and database credentials. First, let's create a `.env` file from the example file:

```sh
cp .env.example .env
```

Next, fill your `.env` file by following the comments in the file.

> [!TIP]  
> You may want to specify `NODE_ENV` variable as `production`. Otherwise, it will use `development` by default.

#### 4. Build the project

This project is built completely with TypeScript. Unlike other runtimes like [Bun](https://bun.sh/) and [Deno](https://deno.com/),... which support TypeScript natively, Node.js, the runtime this project is currently using, still has native TypeScript support as an experimental feature. You need to compile it into a JavaScript version by using this command:

```sh
pnpm build
```

After building, the `dist` directory will be created, containing the JavaScript version of the source code.

#### 5. Make changes for your database

After [setting up the `.env` file](#3-set-up-environment-variables), especially the `DATABASE_URL` variable, you need to set up the tables for your database by using the following command:

```sh
pnpm exec drizzle-kit push
```

If your database has any existing tables, you may need to pull and migrate your database, see [Drizzle Migrations](https://orm.drizzle.team/docs/migrations).

#### 6. Deploy all application commands

You have to deploy application commands (slash, context menu, etc.) manually, you can do this by using this command:

```sh
pnpm deploy
```

You may need to reload your Discord client to see the changes.

> [!NOTE]  
> You only need to run this command once every time there are stable changes about commands. That's also a reason why the script is split to prevent rate limiting.

#### 7. Start the bot!

Once you have completed the setup steps above, you should be able to run the bot normally! You can do that by using this command:

```sh
pnpm start
```

Wait for everything to be loaded... and everything is done! Remember to [rebuild](#5-build-the-project) on changes before starting.

If the bot doesn't start as expected, check your terminal output for any errors, misconfigured environment variables, or missing permissions.

Feel free to open issues or ask for help in our Discord server.

## License

Zent Bot is licensed under the [GNU Affero General Public License v3.0](./LICENSE).

That means:

- ✅ You may use, modify, and share this bot freely.
- ✅ You must give proper credit (keep the copyright notice).
- ✅ If you run a modified version (includes any content changes) publicly, you must share your changes.
- ✅ You may run an unmodified version privately or publicly without needing to publish anything.
- ❌ You may not relicense this project under a closed-source or proprietary license.

This ensures Zent Bot stays free and open for everyone, while protecting the original authorship.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. You can also ask questions about the bot and the project in our Discord server ❤️
