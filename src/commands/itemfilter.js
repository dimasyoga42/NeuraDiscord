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
        content: `Pilih category item untuk stat:\n${stat}`,
        components: [typeRow],
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

          if (i.customId === "item_type_select") {
            const type = i.values[0];

            const { data, error } = await supabase
              .from("item_v2")
              .select("*")
              .ilike("Effects", `%${stat}%`)
              .ilike("Category", `%${type}%`)
              .limit(100);

            if (error || !data?.length) {
              return i.reply({
                content: "item tidak ditemukan",
                ephemeral: true,
              });
            }

            let currentPage = 0;
            const pageSize = 25;

            const generateMenu = (page) => {
              const start = page * pageSize;

              const end = start + pageSize;

              const currentItems = data.slice(start, end);

              const options = currentItems.map((item) => {
                const effects = item.Effects || "-";

                const matchedStat =
                  effects
                    .split("\n")
                    .find((line) =>
                      line.toLowerCase().includes(stat.toLowerCase()),
                    ) || "stat tidak ditemukan";

                return new StringSelectMenuOptionBuilder()
                  .setLabel(item.ItemName.slice(0, 100))
                  .setDescription(matchedStat.slice(0, 100))
                  .setValue(item.ItemName.slice(0, 100));
              });

              const itemSelect = new StringSelectMenuBuilder()
                .setCustomId("item_select")
                .setPlaceholder(`Page ${page + 1}`)
                .addOptions(options);

              const selectRow = new ActionRowBuilder().addComponents(
                itemSelect,
              );

              const buttonRow = new ActionRowBuilder().addComponents(
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

              return [selectRow, buttonRow];
            };

            await i.update({
              content: `Item ditemukan: ${data.length}\nType: ${type.toUpperCase()}\nStat: ${stat}`,
              embeds: [],
              components: generateMenu(currentPage),
            });

            const itemCollector = msg.createMessageComponentCollector({
              time: 120000,
            });

            itemCollector.on("collect", async (btn) => {
              try {
                if (btn.user.id !== interaction.user.id) {
                  return btn.reply({
                    content: "ini bukan menu kamu",
                    ephemeral: true,
                  });
                }

                if (btn.isButton()) {
                  if (btn.customId === "prev_page") {
                    currentPage--;
                  }

                  if (btn.customId === "next_page") {
                    currentPage++;
                  }

                  return await btn.update({
                    components: generateMenu(currentPage),
                  });
                }

                if (btn.isStringSelectMenu()) {
                  if (btn.customId !== "item_select") return;

                  const selected = btn.values[0];

                  const { data: item, error } = await supabase
                    .from("item_v2")
                    .select("*")
                    .eq("ItemName", selected)
                    .single();

                  if (error || !item) {
                    return btn.reply({
                      content: "item tidak ditemukan",
                      ephemeral: true,
                    });
                  }

                  const emb = new EmbedBuilder()
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
                        value: (item.Effects || "-").slice(0, 1024),
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

                  await btn.update({
                    content: "",
                    embeds: [emb],
                    components: [],
                  });
                }
              } catch (err) {
                console.log(err);

                try {
                  await btn.reply({
                    content: "terjadi kesalahan",
                    ephemeral: true,
                  });
                } catch {}
              }
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
    } catch (err) {
      console.log(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("terjadi kesalahan");
      }
    }
  },
};
