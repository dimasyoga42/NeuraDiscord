import { Client, Collection, GatewayIntentBits } from "discord.js";

import dotenv from "dotenv";

import { loadCommands } from "./src/utils/loader.js";
import { loadEvents } from "./src/utils/loader.js";

dotenv.config();

const app = new Client({
  intents: [GatewayIntentBits.Guilds],
});

app.commands = new Collection();

await loadCommands(app);
await loadEvents(app);

app.login(process.env.TOKEN);
