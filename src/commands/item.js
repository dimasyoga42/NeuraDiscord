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

function createEmbed(item, imageUrl, index, total) {
  return new EmbedBuilder()
    .setColor(color.cyan)
    .setTitle(item.ItemName || "Unknown Item")
    .setDescription(
      `Stat\n${formatEffects(item.Effects)}\n\n` +
        `Duration\n- ${item.Duration || "-"}\n\n` +
        `Process\n- ${item.Process || "-"}\n\n` +
        `Obtained From\n- ${(item.ObtainedFrom || "-").slice(0, 1000)}`,
    )
    .setImage(imageUrl || null)
    .setFooter({
      text: `Item ${index + 1} dari ${total}`,
    })
    .setTimestamp();
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
        .ilike("ItemName", `%${query}%`)
        .limit(50);

      if (error || !data || data.length === 0) {
        return await interaction.editReply("item tidak ditemukan");
      }

      const itemsWithImages = await Promise.all(
        data.map(async (item) => {
          const { data: imageData } = await supabase
            .from("appview")
            .select("image_url")
            .ilike("name", `%${item.ItemName}%`)
            .limit(1)
            .single();

          return {
            ...item,
            image_url: imageData?.image_url || null,
          };
        }),
      );

      let page = 0;

      const generateButtons = () => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_item")
            .setLabel("◀ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId("next_item")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === itemsWithImages.length - 1),
        );
      };

      const firstItem = itemsWithImages[page];

      const msg = await interaction.editReply({
        embeds: [
          createEmbed(
            firstItem,
            firstItem.image_url,
            page,
            itemsWithImages.length,
          ),
        ],
        components: [generateButtons()],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });

      collector.on("collect", async (btn) => {
        try {
          if (btn.user.id !== interaction.user.id) {
            return await btn.reply({
              content: "ini bukan menu kamu",
              ephemeral: true,
            });
          }

          if (btn.customId === "next_item") {
            page++;
          }

          if (btn.customId === "prev_item") {
            page--;
          }

          const currentItem = itemsWithImages[page];

          await btn.update({
            embeds: [
              createEmbed(
                currentItem,
                currentItem.image_url,
                page,
                itemsWithImages.length,
              ),
            ],
            components: [generateButtons()],
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
