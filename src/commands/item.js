import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { supabase } from "../db/supabase.js";

function formatEffects(effects) {
  if (!effects) return "-";

  const cleaned = effects
    .split("|")
    .map((v) => v.trim())
    .filter((v) => v && !v.toLowerCase().includes("amount"));

  const priority = [];

  const normal = [];

  for (const stat of cleaned) {
    if (stat.toLowerCase().includes("base def")) {
      priority.push(stat);
    } else {
      normal.push(stat);
    }
  }

  return [...priority, ...normal]
    .map((v) => `• ${v}`)
    .join("\n")
    .slice(0, 1024);
}

export default {
  name: "item",

  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("search item toram")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama item")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const query = interaction.options.getString("name");

      const { data, error } = await supabase
        .from("item_v2")
        .select("*")
        .ilike("ItemName", `%${query}%`);

      if (error || !data?.length) {
        return interaction.editReply("item tidak ditemukan");
      }

      let currentPage = 0;

      const generateEmbed = (page) => {
        const item = data[page];

        return new EmbedBuilder()
          .setTitle(item.ItemName || "-")
          .setDescription(`Item Search`)
          .addFields([
            {
              name: "Category",
              value: item.Category || "-",
              inline: true,
            },
            {
              name: "Duration",
              value: item.Duration || "-",
              inline: true,
            },
            {
              name: "Process",
              value: item.Process || "-",
              inline: true,
            },
            {
              name: "Stat",
              value: formatEffects(item.Effects),
            },
            {
              name: "Obtained From",
              value: (item.ObtainedFrom || "-").slice(0, 1024),
            },
          ])
          .setFooter({
            text: `Page ${page + 1} / ${data.length}`,
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
            .setDisabled(page === data.length - 1),
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
    } catch (err) {
      console.log(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("terjadi kesalahan");
      }
    }
  },
};
