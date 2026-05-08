import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
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

      let query = supabase.from("xtal").select("*");

      if (xtalName) {
        query = query.ilike("name", `%${xtalName}%`);
      }

      const { data, error } = await query;

      if (error || !data?.length) {
        return interaction.editReply("data xtal tidak ditemukan");
      }

      const pageSize = 25;
      let currentPage = 0;

      const generateMenu = (page) => {
        const start = page * pageSize;

        const end = start + pageSize;

        const currentData = data.slice(start, end);

        const options = currentData.map((item) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(item.name.slice(0, 100))
            .setDescription(`lihat xtal ${item.name}`.slice(0, 100))
            .setValue(item.name.slice(0, 100)),
        );

        const select = new StringSelectMenuBuilder()
          .setCustomId("xtal_select")
          .setPlaceholder(`Page ${page + 1}`)
          .addOptions(options);

        const rowSelect = new ActionRowBuilder().addComponents(select);

        const rowButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("◀ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(end >= data.length),
        );

        return [rowSelect, rowButton];
      };

      const msg = await interaction.editReply({
        content: `Silahkan pilih xtal\nPage ${currentPage + 1}/${Math.ceil(data.length / pageSize)}`,
        components: generateMenu(currentPage),
      });

      const collector = msg.createMessageComponentCollector({
        time: 120000,
      });

      collector.on("collect", async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: "ini bukan menu kamu",
              ephemeral: true,
            });
          }

          if (i.isButton()) {
            if (i.customId === "prev_page") {
              currentPage--;
            }

            if (i.customId === "next_page") {
              currentPage++;
            }

            return await i.update({
              content: `Silahkan pilih xtal\nPage ${currentPage + 1}/${Math.ceil(data.length / pageSize)}`,
              components: generateMenu(currentPage),
            });
          }

          if (i.isStringSelectMenu()) {
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
              .setTitle(xtal.name || "Unknown")
              .addFields([
                {
                  name: "Type",
                  value: xtal.type || "-",
                  inline: true,
                },
                {
                  name: "Stat",
                  value: (xtal.stats || "-").slice(0, 1024),
                  inline: false,
                },
                {
                  name: "Route",
                  value:
                    `- ${xtal.upgrade_route || "tidak ada"}\n- ${xtal.max_upgrade_route || "tidak ada"}`.slice(
                      0,
                      1024,
                    ),
                  inline: false,
                },
              ])
              .setFooter({
                text: "Neura Sama",
              })
              .setTimestamp();

            await i.update({
              content: "",
              embeds: [emb],
              components: [],
            });
          }
        } catch (err) {
          console.log(err);

          try {
            await i.reply({
              content: "terjadi kesalahan",
              ephemeral: true,
            });
          } catch {}
        }
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

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("terjadi kesalahan");
      } else {
        await interaction.reply({
          content: "terjadi kesalahan",
          ephemeral: true,
        });
      }
    }
  },
};
