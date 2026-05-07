import { REST, Routes, Events } from "discord.js";

import cron from "node-cron";

const idChannel = "1468532735575589009";

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`${client.user.tag} ready`);

    const commands = [];

    client.commands.forEach((cmd) => {
      commands.push(cmd.data.toJSON());
    });

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("slash synced");

    cron.schedule("32 23 * * *", async () => {
      try {
        const channel = await client.channels.fetch(idChannel);

        if (!channel) return;

        const response = await fetch(process.env.BANNER);

        const res = await response.json();

        const ava = res.data;

        if (!ava?.length) return;

        await channel.send("broadcast banner");
      } catch (err) {
        console.error(err);
      }
    });
  },
};
