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

function encodeImageUrl(url) {
  if (!url) return null;

  try {
    return encodeURI(url.trim());
  } catch {
    return url;
  }
}

function formatEffects(effects) {
  if (!effects) return "-";

  const cleaned = effects
    .split("|")
    .map((v) => v.trim())
    .filter((v) => v && !v.toLowerCase().includes("amount"));

  const priority = [];
  const normal = [];

  for (const stat of cleaned) {
    if (
      stat.toLowerCase().includes("base def") ||
      stat.toLowerCase().includes("base atk") ||
      stat.toLowerCase().includes("base stability")
    ) {
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

function createEmbed(
  item,
  imageUrl,
  itemPage,
  totalItems,
  imagePage,
  totalImages,
) {
  return new EmbedBuilder()
    .setColor(color.cyan)
    .setTitle(item.ItemName || "Unknown Item")
    .setDescription(
      `Stat\n${formatEffects(item.Effects)}\n\n` +
        `Duration\n• ${item.Duration || "-"}\n\n` +
        `Process\n• ${item.Process || "-"}\n\n` +
        `Obtained From\n• ${(item.ObtainedFrom || "-").slice(0, 1000)}`,
    )
    .setImage(imageUrl || null)
    .setFooter({
      text:
        `Item ${itemPage + 1}/${totalItems}` +
        ` • Image ${imagePage + 1}/${totalImages}`,
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

      const { data: items, error } = await supabase
        .from("item_v2")
        .select("*")
        .ilike("ItemName", `%${query}%`);

      if (error || !items || items.length === 0) {
        return await interaction.editReply("item tidak ditemukan");
      }

      const itemsWithImages = await Promise.all(
        items.map(async (item) => {
          const { data: images } = await supabase
            .from("appview")
            .select("image_url")
            .ilike("name", `%${item.ItemName.split("(")[0].trim()}%`);

          const imageList =
            images
              ?.map((img) => encodeImageUrl(img.image_url))
              .filter(Boolean) || [];

          return {
            ...item,
            images: [...new Set(imageList)],
          };
        }),
      );

      let itemPage = 0;
      let imagePage = 0;

      const currentItem = () => itemsWithImages[itemPage];

      const buildButtons = () => {
        const item = currentItem();

        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_item")
            .setLabel("⬅ Item")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(itemPage === 0),

          new ButtonBuilder()
            .setCustomId("next_item")
            .setLabel("Item ➡")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(itemPage >= itemsWithImages.length - 1),

          new ButtonBuilder()
            .setCustomId("prev_image")
            .setLabel("🖼 ⬅")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(imagePage === 0),

          new ButtonBuilder()
            .setCustomId("next_image")
            .setLabel("🖼 ➡")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(
              !item.images.length || imagePage >= item.images.length - 1,
            ),
        );
      };

      const firstItem = currentItem();

      const msg = await interaction.editReply({
        embeds: [
          createEmbed(
            firstItem,
            firstItem.images[0] || null,
            itemPage,
            itemsWithImages.length,
            imagePage,
            firstItem.images.length || 1,
          ),
        ],
        components: [buildButtons()],
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
            itemPage++;
            imagePage = 0;
          }

          if (btn.customId === "prev_item") {
            itemPage--;
            imagePage = 0;
          }

          const item = currentItem();

          if (btn.customId === "next_image") {
            if (imagePage < item.images.length - 1) {
              imagePage++;
            }
          }

          if (btn.customId === "prev_image") {
            if (imagePage > 0) {
              imagePage--;
            }
          }

          await btn.update({
            embeds: [
              createEmbed(
                item,
                item.images[imagePage] || null,
                itemPage,
                itemsWithImages.length,
                imagePage,
                item.images.length || 1,
              ),
            ],
            components: [buildButtons()],
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
