import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { NekosAPI } from "nekosapi";
const neko = new NekosAPI();
export default {
  name: "bantuan",

  data: new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu"),

  async execute(interaction) {
    neko.getRandomImage((categories = ["catgirl"])).then((image) => {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Menu Neura Sama")
        .setImage(image.url)
        .setDescription(
          "- /bantuan (untuk melihat daftar Menu\n- /xtal digunakan untuk melihat stat xtall\n- /buff menampilkan code buff",
        );
      interaction.reply({
        embeds: [embed],
      });
    });
  },
};
