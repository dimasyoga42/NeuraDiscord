import { SlashCommandBuilder } from "discord.js";

import { playMusic } from "../music/player.js";

export default {
  name: "play",

  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik di voice")
    .addStringOption((option) =>
      option.setName("judul").setDescription("nama musik").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("judul");

    await playMusic({
      interaction,
      query,
    });
  },
};
