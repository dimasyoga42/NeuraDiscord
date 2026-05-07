import { Client, Collection, GatewayIntentBits } from "discord.js";

import dotenv from "dotenv";

import { Player } from "discord-player";

import { YoutubeiExtractor } from "@discord-player/extractor";

dotenv.config();

const app = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

app.commands = new Collection();

app.player = new Player(app);

await app.player.extractors.register(YoutubeiExtractor, {});

app.login(process.env.TOKEN);
