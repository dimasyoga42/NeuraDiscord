import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

export default {
  name: "xtal",

  data: new SlashCommandBuilder()
    .setName("xtal")
    .setDescription("melihat information xtall")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama xtal")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const xtalName = interaction.options.getString("name");

    const { data, error } = await supabase
      .from("xtal")
      .select("*")
      .ilike("name", `%${xtalName}%`)
      .limit(10);

    if (error || !data?.length) {
      return interaction.editReply("data xtal tidak ditemukan");
    }

    const embeds = data.map((item) => {
      return new EmbedBuilder()
        .setColor(color.gold)
        .setTitle(item.name)
        .addFields([
          {
            name: "Type",
            value: item.type || "-",
          },
          {
            name: "Stat",
            value: item.stats || "-",
          },
          {
            name: "Route",
            value:
              `- ${item.upgrade_route}\n- ${item.max_upgrade_route}` || "-",
          },
        ]);
    });

    await interaction.editReply({
      embeds,
    });
  },
};
