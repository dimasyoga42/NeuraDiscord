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
    return encodeURI(url)
      .replace(/'/g, "%27")
      .replace(/\[/g, "%5B")
      .replace(/\]/g, "%5D");
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

function createEmbed(item, imageUrl, index, total, imageIndex, imageTotal) {
  return new EmbedBuilder()
    .setColor(color.cyan)
    .setTitle(item.ItemName || "Unknown Item")
    .setDescription(
      `Stat\n${formatEffects(item.Effects)}\n\n` +
        `Duration\n- ${item.Duration || "-"}\n\n` +
        `Process\n- ${item.Process || "-"}\n\n` +
        `Obtained From\n- ${(item.ObtainedFrom || "-").slice(0, 1000)}`,
    )
    .setImage(imageUrl || undefined)
    .setFooter({
      text:
        `Item ${index + 1}/${total}` +
        ` • Image ${imageIndex + 1}/${imageTotal}`,
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
        .ilike("ItemName", `%${query}%`);

      if (error || !data || data.length === 0) {
        return await interaction.editReply("item tidak ditemukan");
      }

      const itemNames = data.map((item) => item.ItemName);

      const { data: allImages } = await supabase
        .from("appview")
        .select("name, image_url")
        .in("name", itemNames);

      const imageMap = {};

      if (allImages) {
        for (const img of allImages) {
          if (!img.image_url) continue;

          if (!imageMap[img.name]) {
            imageMap[img.name] = [];
          }

          imageMap[img.name].push(encodeImageUrl(img.image_url));
        }
      }

      const missingNames = itemNames.filter((name) => !imageMap[name]);

      if (missingNames.length > 0) {
        await Promise.all(
          missingNames.map(async (name) => {
            const { data: imgs } = await supabase
              .from("appview")
              .select("name, image_url")
              .ilike("name", `%${name}%`);

            if (imgs && imgs.length > 0) {
              imageMap[name] = imgs
                .filter((img) => img.image_url)
                .map((img) => encodeImageUrl(img.image_url));
            }
          }),
        );
      }

      const itemsWithImages = data.map((item) => ({
        ...item,
        images: imageMap[item.ItemName] || [],
      }));

      let page = 0;
      let imagePage = 0;

      const generateButtons = () => {
        const currentItem = itemsWithImages[page];

        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_item")
            .setLabel("⬅ Item")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId("next_item")
            .setLabel("Item ➡")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === itemsWithImages.length - 1),

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
              currentItem.images.length === 0 ||
                imagePage === currentItem.images.length - 1,
            ),
        );
      };

      const firstItem = itemsWithImages[0];

      const msg = await interaction.editReply({
        embeds: [
          createEmbed(
            firstItem,
            firstItem.images[0] || undefined,
            page,
            itemsWithImages.length,
            imagePage,
            firstItem.images.length || 1,
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
            imagePage = 0;
          }

          if (btn.customId === "prev_item") {
            page--;
            imagePage = 0;
          }

          const currentItem = itemsWithImages[page];

          if (btn.customId === "next_image") {
            if (imagePage < currentItem.images.length - 1) {
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
                currentItem,
                currentItem.images[imagePage] || undefined,
                page,
                itemsWithImages.length,
                imagePage,
                currentItem.images.length || 1,
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
