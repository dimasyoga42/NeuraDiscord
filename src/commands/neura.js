import { SlashCommandBuilder } from "discord.js";

export default {
  name: "neura",

  data: new SlashCommandBuilder()
    .setName("neura")
    .setDescription("Panggil Neura Sama"),

  async execute(interaction) {
    await interaction.reply("Neura Sama di sini! Gunakan `/bantuan`.");
  },
};
