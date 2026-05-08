import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { color } from "../config/color.js";

export default {
  name: "help",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("melihat menu"),

  async execute(interaction) {
    const enm = new EmbedBuilder()
      .setColor(color.dark)
      .setTitle("Neura Sama")
      .setTimestamp()
      .setDescription("Neura Sama akan selalu membantu anda")
      .setFields([
        {
          name: "Menu Toram",
          value: `- /itemfilter\n- /buff\n- /bos\n- /xtal\n- /trait\n- /boost`,
        },
      ]);
    await interaction.EditReply("");
  },
};
