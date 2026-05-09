import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

const PAGE_SIZE = 25;
const COLLECTOR_TIMEOUT = 120000;

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
  name: "itemfilter",

  data: new SlashCommandBuilder()
    .setName("itemfilter")
    .setDescription("filter item berdasarkan stat")
    .addStringOption((option) =>
      option
        .setName("stat")
        .setDescription("contoh: critical rate")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const stat = interaction.options.getString("stat");

      const { data, error } = await supabase
        .from("item_v2")
        .select("*")
        .ilike("Effects", `%${stat}%`)
        .limit(500);

      if (error) {
        console.log(error);

        return interaction.editReply("terjadi kesalahan saat mengambil data");
      }

      if (!data || data.length === 0) {
        return interaction.editReply("item tidak ditemukan");
      }

      let filteredItems = data;
      let currentPage = 0;

      const generateComponents = () => {
        const totalPages = Math.max(
          1,
          Math.ceil(filteredItems.length / PAGE_SIZE),
        );

        if (currentPage >= totalPages) {
          currentPage = totalPages - 1;
        }

        if (currentPage < 0) {
          currentPage = 0;
        }

        const start = currentPage * PAGE_SIZE;

        const end = start + PAGE_SIZE;

        const sliced = filteredItems.slice(start, end);

        if (!sliced.length) {
          return [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("empty")
                .setLabel("Tidak ada item")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            ),
          ];
        }

        const options = sliced.map((item, index) => {
          const effects = item.Effects || "-";

          const matchedStat =
            effects
              .split("|")
              .find((line) =>
                line.toLowerCase().includes(stat.toLowerCase()),
              ) || "stat tidak ditemukan";

          return new StringSelectMenuOptionBuilder()
            .setLabel(
              String(item.ItemName || `Item ${index + 1}`).slice(0, 100),
            )

            .setDescription(
              matchedStat
                .replace(/amount/gi, "")
                .trim()
                .slice(0, 100) || "tidak ada stat",
            )

            .setValue(String(item.ItemName || `item_${index}`).slice(0, 100));
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("item_select")
          .setPlaceholder(`Page ${currentPage + 1} / ${totalPages}`)
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
            .setDisabled(
              currentPage >= totalPages - 1 ||
                filteredItems.length <= PAGE_SIZE,
            ),
        );

        return [selectRow, buttonRow];
      };

      const msg = await interaction.editReply({
        content: `Item ditemukan: ${filteredItems.length}\n` + `Stat: ${stat}`,

        components: generateComponents(),
      });

      const collector = msg.createMessageComponentCollector({
        time: COLLECTOR_TIMEOUT,
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

            if (i.customId === "prev_page" && currentPage > 0) {
              currentPage--;
            }

            return i.update({
              components: generateComponents(),
            });
          }

          if (i.isStringSelectMenu()) {
            const selected = i.values[0];

            const item = filteredItems.find((v) => v.ItemName === selected);

            if (!item) {
              return i.reply({
                content: "item tidak ditemukan",
                flags: MessageFlags.Ephemeral,
              });
            }

            const embed = new EmbedBuilder()
              .setColor(color.cyan)

              .setTitle(item.ItemName || "Unknown Item")

              .addFields([
                {
                  name: "Category",
                  value: item.Category || "-",
                  inline: true,
                },
                {
                  name: "Price",
                  value: item.SellPrice || "-",
                  inline: true,
                },
                {
                  name: "Effects",
                  value: formatEffects(item.Effects),
                },
                {
                  name: "Obtained",
                  value: String(item.ObtainedFrom || "-").slice(0, 1024),
                },
                {
                  name: "Recipe",
                  value: String(item.RecipeMaterials || "-").slice(0, 1024),
                },
              ])

              .setFooter({
                text: "Neura Sama",
              })

              .setTimestamp();

            return i.update({
              content: "",

              embeds: [embed],

              components: [],
            });
          }
        } catch (err) {
          console.log(err);

          if (!i.replied && !i.deferred) {
            await i
              .reply({
                content: "terjadi kesalahan",
                flags: MessageFlags.Ephemeral,
              })
              .catch(() => {});
          }
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
