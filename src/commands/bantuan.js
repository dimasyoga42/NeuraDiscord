import axios from "axios";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
export default {
  name: "bantuan",

  data: new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu"),

  async execute(interaction) {
    const data = await axios.get(
      "https://api.nekosapi.com/v4/images/random?limit=1",
    );
    const img = data.data;
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("Menu Neura Sama")
      .setImage(img[0].url)
      .setDescription(
        "- /bantuan (untuk melihat daftar Menu\n- /xtal digunakan untuk melihat stat xtall\n- /buff menampilkan code buff",
      );

    await interaction.reply({
      embeds: [embed],
    });
  },
};
