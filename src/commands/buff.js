import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

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

        let currentPage = 0;

        const pageSize = 25;

        const totalPages = Math.ceil(buffs.length / pageSize);

        const generateEmbed = (page) => {
          const start = page * pageSize;

          const end = start + pageSize;

          const currentBuffs = buffs.slice(start, end);

          return new EmbedBuilder()
            .setColor(color.cyan)
            .setAuthor({
              name: "Neura Sama",
            })
            .setTitle("Daftar Buff")
            .addFields(
              currentBuffs.map((item) => ({
                name: item.name || "-",
                value: `Code: ${item.code || "-"}`,
                inline: true,
              })),
            )
            .setFooter({
              text: `Page ${page + 1} / ${totalPages}`,
            })
            .setTimestamp();
        };

        const generateButtons = (page) => {
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev_page")
              .setLabel("◀ Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),

            new ButtonBuilder()
              .setCustomId("next_page")
              .setLabel("Next ▶")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1 || totalPages === 0),
          );
        };

        const msg = await interaction.editReply({
          embeds: [generateEmbed(currentPage)],
          components: [generateButtons(currentPage)],
        });

        const collector = msg.createMessageComponentCollector({
          componentType: ComponentType.Button,
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

            if (i.customId === "next_page") {
              currentPage++;
            }

            if (i.customId === "prev_page") {
              currentPage--;
            }

            await i.update({
              embeds: [generateEmbed(currentPage)],
              components: [generateButtons(currentPage)],
            });
          } catch (err) {
            console.log(err);
          }
        });

        collector.on("end", async () => {
          try {
            await interaction.editReply({
              components: [],
            });
          } catch {}
        });

        return;
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
