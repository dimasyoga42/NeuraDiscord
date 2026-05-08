import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

function formatNumber(number) {
  return new Intl.NumberFormat("id-ID").format(Number(number || 0));
}

function formatDrop(drop) {
  if (!drop) return "-";

  return drop
    .split(",")
    .map((item) => `• ${item.trim()}`)
    .join("\n")
    .slice(0, 1024);
}

function formatDifficulty(range) {
  if (!range) return "-";

  const order = ["Easy", "Normal", "Hard", "Nightmare", "Ultimate"];

  return order
    .filter((mode) => range[mode])
    .map((mode) => {
      const data = range[mode];

      return (
        `## ${mode}\n` +
        `• Level : ${data.lv || "-"}\n` +
        `• HP : ${formatNumber(data.hp)}\n` +
        `• EXP : ${formatNumber(data.exp)}\n` +
        `• Leveling : ${data.leveling || "-"}`
      );
    })
    .join("\n\n")
    .slice(0, 1024);
}

export default {
  name: "bos",

  data: new SlashCommandBuilder()
    .setName("bos")
    .setDescription("melihat informasi boss")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama boss")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const bossName = interaction.options.getString("name");

      const { data, error } = await supabase
        .from("bosv22")
        .select("*")
        .ilike("name", `%${bossName}%`)
        .limit(100);

      if (error || !data || data.length === 0) {
        return interaction.editReply("boss tidak ditemukan");
      }

      let currentPage = 0;
      const pageSize = 25;

      const generateMenu = () => {
        const start = currentPage * pageSize;

        const end = start + pageSize;

        const currentData = data.slice(start, end);

        const options = currentData.map((item) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(item.name.slice(0, 100))
            .setDescription(
              `${item.element || "Netral"} • ${item.location || "-"}`.slice(
                0,
                100,
              ),
            )
            .setValue(item.name),
        );

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("boss_select")
          .setPlaceholder(`Page ${currentPage + 1}`)
          .addOptions(options);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("◀ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),

          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(end >= data.length),
        );

        return [selectRow, buttonRow];
      };

      const msg = await interaction.editReply({
        content: `Boss ditemukan: ${data.length}\n` + `Keyword: ${bossName}`,
        components: generateMenu(),
      });

      const collector = msg.createMessageComponentCollector({
        time: 120000,
      });

      collector.on("collect", async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: "ini bukan menu kamu",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (i.isButton()) {
            if (i.customId === "next_page") {
              currentPage++;
            }

            if (i.customId === "prev_page") {
              currentPage--;
            }

            return await i.update({
              components: generateMenu(),
            });
          }

          if (i.isStringSelectMenu()) {
            const selected = i.values[0];

            const { data: boss, error } = await supabase
              .from("bosv22")
              .select("*")
              .eq("name", selected)
              .single();

            if (error || !boss) {
              return i.reply({
                content: "boss tidak ditemukan",
                flags: MessageFlags.Ephemeral,
              });
            }

            const embed = new EmbedBuilder()
              .setColor(color.red)
              .setTitle(boss.name)
              .addFields([
                {
                  name: "Element",
                  value: boss.element || "-",
                  inline: true,
                },
                {
                  name: "Location",
                  value: boss.location || "-",
                  inline: true,
                },
                {
                  name: "Drop List",
                  value: formatDrop(boss.drop),
                },
                {
                  name: "Difficulty",
                  value: formatDifficulty(boss.range),
                },
              ])
              .setFooter({
                text: "Neura Sama",
              })
              .setTimestamp();

            return await i.update({
              content: "",
              embeds: [embed],
              components: [],
            });
          }
        } catch (err) {
          console.log(err);

          try {
            await i.reply({
              content: "terjadi kesalahan",
              flags: MessageFlags.Ephemeral,
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
      }
    }
  },
};
