import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

const { data: buffList } = await supabase.from("buff").select("name");

const buffNames = buffList?.map((item) => item.name).join(", ") || "buff";

export default {
  name: "buff",

  data: new SlashCommandBuilder()
    .setName("buff")
    .setDescription("Melihat daftar buff")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(buffNames.slice(0, 100))
        .setRequired(false),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const buffname = interaction.options.getString("name");

      if (!buffname) {
        const { data: buffs, error } = await supabase.from("buff").select("*");

        if (error || !buffs?.length) {
          return interaction.editReply("buff tidak ditemukan");
        }

        const emb = new EmbedBuilder()
          .setColor(color.cyan)
          .setAuthor({
            name: "Neura Sama",
          })
          .setTitle("Daftar Buff")
          .addFields(
            buffs.map((item) => ({
              name: item.name || "-",
              value: `Code: ${item.code || "-"}`,
              inline: true,
            })),
          )
          .setTimestamp();

        return interaction.editReply({
          embeds: [emb],
        });
      }

      const { data, error } = await supabase
        .from("buff")
        .select("*")
        .ilike("name", `%${buffname}%`)
        .limit(1)
        .single();

      if (error || !data) {
        return interaction.editReply("buff tidak ditemukan");
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
