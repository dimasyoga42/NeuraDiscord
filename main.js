import { Client, Collection, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { loadCommands, loadEvents } from "./src/utils/loader.js";

dotenv.config();

const app = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

app.commands = new Collection();

await loadCommands(app);
await loadEvents(app);

app.player.events.on("debug", (queue, message) => {
  console.log(message);
});

app.player.events.on("error", (queue, error) => {
  console.log(error);
});

app.player.events.on("playerError", (queue, error) => {
  console.log(error);
});

app.login(process.env.TOKEN);
