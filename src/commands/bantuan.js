import axios from "axios";

import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  name: "bantuan",

  data: new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const { data } = await axios.get(
        "https://api.waifu.im/search?included_tags=waifu",
      );

      const image = data.images?.[0]?.url;

      const user = interaction.user;

      const embed = new EmbedBuilder()
        .setColor(0x00ffff)
        .setTitle("Menu Neura Sama")
        .setDescription(`Halo ${interaction.member.displayName} ✨`)
        .setThumbnail(image)
        .addFields([
          {
            name: "Informasi Pribadi",
            value: [
              `> Username: ${user.username}`,
              `> Global Name: ${user.globalName || "-"}`,
              `> Display Name: ${interaction.member.displayName}`,
              `> User ID: ${user.id}`,
            ].join("\n"),
          },
          {
            name: "Menu Toram",
            value: [
              "`/xtal`",
              "`/trait`",
              "`/bos`",
              "`/boost`",
              "`/itemfilter`",
              "`/buff`",
            ].join("\n"),
            inline: true,
          },
          {
            name: "Menu Utility",
            value: ["`/bantuan`", "`/ping`", "`/userinfo`"].join("\n"),
            inline: true,
          },
        ])
        .setImage(image)
        .setFooter({
          text: `Requested by ${user.username}`,
          iconURL: user.displayAvatarURL(),
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
