import { Events } from "discord.js";

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "terjadi kesalahan",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "terjadi kesalahan",
          ephemeral: true,
        });
      }
    }
  },
};
