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

const PAGE_SIZE = 25;
const COLLECTOR_TIMEOUT = 120_000;

// --- Helpers ---

function buildMenuComponents(data, page) {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const options = data.slice(start, end).map((item, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setDescription(`lihat trait ${item.name}`.slice(0, 100))
      .setValue(String(start + i)),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId("trait_select")
    .setPlaceholder(`Page ${page + 1} / ${totalPages}`)
    .addOptions(options);

  const buttons = new ActionRowBuilder().addComponents(
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

  return [new ActionRowBuilder().addComponents(select), buttons];
}

function buildTraitEmbed(trait) {
  return new EmbedBuilder()
    .setColor(color.gold)
    .setTitle(trait.name ?? "Unknown")
    .addFields({
      name: "Stat Effect",
      value: (trait.stat_effect ?? "-").slice(0, 1024),
      inline: false,
    })
    .setFooter({ text: "Neura Sama" })
    .setTimestamp();
}

function pageContent(page, total) {
  return `Silahkan pilih trait\nPage ${page + 1} / ${total}`;
}

// --- Command ---

export default {
  name: "trait",

  data: new SlashCommandBuilder()
    .setName("trait")
    .setDescription("melihat information trait")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama trait")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Fetch data
    let query = supabase.from("ablityv2").select("name, stat_effect");
    const traitName = interaction.options.getString("name");
    if (traitName) query = query.ilike("name", `%${traitName}%`);

    const { data, error } = await query;

    if (error) {
      console.error("[trait] Supabase error:", error);
      return interaction.editReply("Terjadi kesalahan saat mengambil data.");
    }

    if (!data?.length) {
      return interaction.editReply("Data trait tidak ditemukan.");
    }

    // Send initial menu
    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    let currentPage = 0;

    const msg = await interaction.editReply({
      content: pageContent(currentPage, totalPages),
      components: buildMenuComponents(data, currentPage),
    });

    // Collect interactions
    const collector = msg.createMessageComponentCollector({
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      // Guard: only the command author
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "Ini bukan menu kamu.", ephemeral: true });
      }

      try {
        // Button: pagination
        if (i.isButton()) {
          if (i.customId === "prev_page") currentPage--;
          if (i.customId === "next_page") currentPage++;

          return i.update({
            content: pageContent(currentPage, totalPages),
            components: buildMenuComponents(data, currentPage),
          });
        }

        // Select menu: show trait detail
        if (i.isStringSelectMenu()) {
          const index = parseInt(i.values[0]);
          const trait = data[index];

          if (!trait) {
            return i.reply({
              content: "Trait tidak ditemukan.",
              ephemeral: true,
            });
          }

          return i.update({
            content: "",
            embeds: [buildTraitEmbed(trait)],
            components: [],
          });
        }
      } catch (err) {
        console.error("[trait] Collector error:", err);

        if (!i.replied && !i.deferred) {
          await i
            .reply({ content: "Terjadi kesalahan.", ephemeral: true })
            .catch(() => {});
        }
      }
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
