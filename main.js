import { Client, Collection, GatewayIntentBits } from "discord.js";

import dotenv from "dotenv";

import { Player } from "discord-player";

import { DefaultExtractors } from "@discord-player/extractor";

import { loadCommands, loadEvents } from "./src/utils/loader.js";

dotenv.config();

const app = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

app.commands = new Collection();

app.player = new Player(app);

await app.player.extractors.loadMulti(DefaultExtractors);

console.log("extractors loaded");

await loadCommands(app);

await loadEvents(app);

app.login(process.env.TOKEN);
