import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { color } from "../config/color.js";

export default {
  name: "help",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("melihat menu"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setColor(color.dark)
        .setTitle("Neura Sama")
        .setDescription("Neura Sama akan selalu membantu anda ✨")
        .addFields([
          {
            name: "Menu Toram",
            value: [
              "/itemfilter",
              "/buff",
              "/bos",
              "/xtal",
              "/trait",
              "/boost",
              "/item",
            ].join("\n"),
          },
          {
            name: "Menu Utility",
            value: ["`/help`"].join("\n"),
          },
        ])
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (err) {
      console.log(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("terjadi kesalahan");
      }
    }
  },
};
