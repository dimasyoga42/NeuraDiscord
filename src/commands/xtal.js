import {
  ActionRowBuilder,
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

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
        .setRequired(false),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const xtalName = interaction.options.getString("name");

      let query = supabase.from("xtal").select("*").limit(25);

      if (xtalName) {
        query = query.ilike("name", `%${xtalName}%`);
      }

      const { data, error } = await query;

      if (error || !data?.length) {
        return interaction.editReply("data xtal tidak ditemukan");
      }

      const options = data.map((item) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(item.name)
          .setDescription(`lihat xtal ${item.name}`)
          .setValue(item.name),
      );

      const select = new StringSelectMenuBuilder()
        .setCustomId("xtal_id")
        .setPlaceholder("Pilih xtal")
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      const msg = await interaction.editReply({
        content: "Silahkan pilih xtal",
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (!i.isStringSelectMenu()) return;

        if (i.customId !== "xtal_id") return;

        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "ini bukan menu kamu",
            ephemeral: true,
          });
        }

        const selected = i.values[0];

        const { data: xtal, error } = await supabase
          .from("xtal")
          .select("*")
          .eq("name", selected)
          .single();

        if (error || !xtal) {
          return i.reply({
            content: "xtal tidak ditemukan",
            ephemeral: true,
          });
        }

        const emb = new EmbedBuilder()
          .setColor(color.gold)
          .setTitle(xtal.name)
          .addFields([
            {
              name: "Type",
              value: xtal.type || "-",
              inline: true,
            },
            {
              name: "Stat",
              value: xtal.stats || "-",
              inline: false,
            },
            {
              name: "Route",
              value: `- ${xtal.upgrade_route || "tidak ada"}\n- ${xtal.max_upgrade_route || "tidak ada"}`,
              inline: false,
            },
          ])
          .setTimestamp();

        await i.update({
          embeds: [emb],
          content: "",
          components: [],
        });
      });

      collector.on("end", async () => {
        try {
          await interaction.editReply({
            components: [],
          });
        } catch {}
      });
    } catch (err) {
      console.log(err);

      await interaction.editReply("terjadi kesalahan");
    }
  },
};
