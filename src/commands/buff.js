import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

export default {
  name: "buff",

  data: new SlashCommandBuilder()
    .setName("buff")
    .setDescription("Melihat daftar buff")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama buff")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const buffname = interaction.options.getString("name");

      const { data, error } = await supabase
        .from("buff")
        .select("*")
        .ilike("name", `%${buffname}%`)
        .limit(1)
        .single();

      if (error || !data) {
        return await interaction.editReply("buff tidak ditemukan");
      }

      const emb = new EmbedBuilder()
        .setColor(color.cyan)
        .setAuthor({
          name: "Neura Sama",
        })
        .setTitle(data.name)
        .addFields([
          {
            name: "Code",
            value: data.code || "-",
            inline: true,
          },
        ])
        .setTimestamp();

      await interaction.editReply({
        embeds: [emb],
      });
    } catch (err) {
      console.log(err);

      await interaction.editReply("terjadi kesalahan");
    }
  },
};
