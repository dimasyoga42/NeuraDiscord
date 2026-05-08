import axios from "axios";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
export default {
  name: "bantuan",

  data: new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu"),

  async execute(interaction) {
    const data = await axios.get(
      "https://api.waifu.im/images?IncludedTags=waifu",
    );
    const img = data.data.items;
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Menu Neura Sama")
      .setThumbnail(img[0].url)
      .setFields([
        {
          name: "Menu Toram",
          value:
            "- /xtal\n- /trait\n- /bos\n - /ava\n- /bossdef\n- /bosboost\n- /mt\n- /live",
        },
      ]);

    await interaction.reply({
      embeds: [embed],
    });
  },
};
