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

const ITEM_TYPES = [
  "Magic Device",
  "Knuckles",
  "one sword",
  "bow",
  "dagger",
  "arrow",
  "Staff",
  "Halberd",
  "2 Handed Sword",
  "1 Handed Sword",
  "Additional",
  "Special",
  "bowgun",
];

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
    .setDescription("filter item berdasarkan stat dan type")
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

      const typeSelect = new StringSelectMenuBuilder()
        .setCustomId("item_type_select")
        .setPlaceholder("Pilih type item")
        .addOptions(
          ITEM_TYPES.map((type) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(type.toUpperCase())
              .setDescription(`filter ${type}`)
              .setValue(type),
          ),
        );

      const typeRow = new ActionRowBuilder().addComponents(typeSelect);

      const msg = await interaction.editReply({
        content: `Pilih category item\nStat: ${stat}`,
        components: [typeRow],
      });

      let currentPage = 0;
      let filteredItems = [];
      let selectedType = null;

      const generateComponents = () => {
        const start = currentPage * 25;

        const end = start + 25;

        const sliced = filteredItems.slice(start, end);

        const options = sliced.map((item) => {
          const effects = item.Effects || "-";

          const matchedStat =
            effects
              .split("|")
              .find((line) =>
                line.toLowerCase().includes(stat.toLowerCase()),
              ) || "stat tidak ditemukan";

          return new StringSelectMenuOptionBuilder()
            .setLabel(item.ItemName.slice(0, 100))
            .setDescription(
              matchedStat
                .replace(/amount/gi, "")
                .trim()
                .slice(0, 100),
            )
            .setValue(item.ItemName);
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("item_select")
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
            .setDisabled(end >= filteredItems.length),
        );

        return [selectRow, buttonRow];
      };

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120000,
      });

      const buttonCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
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

          if (i.customId === "item_type_select") {
            selectedType = i.values[0];

            const { data, error } = await supabase
              .from("item_v2")
              .select("*")
              .ilike("Effects", `%${stat}%`)
              .ilike("Category", `%${selectedType}%`)
              .limit(100);

            if (error || !data || data.length === 0) {
              return i.update({
                content: "item tidak ditemukan",
                components: [],
              });
            }

            filteredItems = data;

            currentPage = 0;

            return i.update({
              content:
                `Item ditemukan: ${filteredItems.length}\n` +
                `Type: ${selectedType}\n` +
                `Stat: ${stat}`,
              components: generateComponents(),
            });
          }

          if (i.customId === "item_select") {
            const selected = i.values[0];

            const { data: item, error } = await supabase
              .from("item_v2")
              .select("*")
              .eq("ItemName", selected)
              .single();

            if (error || !item) {
              return i.reply({
                content: "item tidak ditemukan",
                flags: MessageFlags.Ephemeral,
              });
            }

            const embed = new EmbedBuilder()
              .setColor(color.cyan)
              .setTitle(item.ItemName)
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
                  value: (item.ObtainedFrom || "-").slice(0, 1024),
                },
                {
                  name: "Recipe",
                  value: (item.RecipeMaterials || "-").slice(0, 1024),
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
        }
      });

      buttonCollector.on("collect", async (i) => {
        try {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: "ini bukan menu kamu",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (!filteredItems.length) return;

          if (i.customId === "next_page") {
            currentPage++;
          }

          if (i.customId === "prev_page") {
            currentPage--;
          }

          await i.update({
            components: generateComponents(),
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
