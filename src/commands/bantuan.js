import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "bantuan",

  data: new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Menu Neura Sama")
      .setDescription("list command");

    await interaction.reply({
      embeds: [embed],
    });
  },
};
