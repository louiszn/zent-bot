# Zent Bot

Zent Bot is an utility bot, originally made for our friends server with love for role playing.

## Installation

### Requirements

- Node.js version >= 20
- PNPM package manager
- PostgreSQL database

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

Setup your `.env` file in the root of the project:

```sh
cp .env.example .env
```

Then fill everything with your information.

#### 4. Build the project

```sh
pnpm build
```

After building, `dist` directory will be created, containing JavaScript version of the source code.

#### 5. Deloy all application commands

You have to deploy commands for your bot manually.

```sh
pnpm deploy
```

You may need to reload your Discord client to see the changes

#### 6. Start the bot!

```sh
pnpm start
```

Wait for everything to be loaded... and you are done!

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests. You can also ask questions about the bot and the project in our Discord server ❤️
