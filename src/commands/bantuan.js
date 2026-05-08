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
    const user = interaction.user;
    const img = data.data.items;
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Menu Neura Sama")
      .setThumbnail(img[0].url)
      .setFooter("neura")
      .setTimestamp()
      .setFields([
        {
          name: "Informasi Pribadi",
          value: `
          username: ${user.username}
          name: ${interaction.member.displayName}
          `,
        },
        {
          name: "Menu Toram",
          value: "- /xtal\n- /trait\n- /bos\n- /boost\n- /itemfilter\n- /buff",
        },
      ]);

    await interaction.reply({
      embeds: [embed],
    });
  },
};
