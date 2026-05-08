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

app.login(process.env.TOKEN);
