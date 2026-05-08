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

  const options = data
    .slice(start, end)
    .map((item) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(item.name.slice(0, 100))
        .setDescription(`lihat xtal ${item.name}`.slice(0, 100))
        .setValue(item.name.slice(0, 100)),
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId("xtal_select")
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

function buildXtalEmbed(xtal) {
  return new EmbedBuilder()
    .setColor(color.gold)
    .setTitle(xtal.name ?? "Unknown")
    .addFields(
      { name: "Type", value: xtal.type ?? "-", inline: true },
      {
        name: "Stat",
        value: (xtal.stats ?? "-").slice(0, 1024),
        inline: false,
      },
      {
        name: "Route",
        value:
          `- ${xtal.upgrade_route ?? "tidak ada"}\n- ${xtal.max_upgrade_route ?? "tidak ada"}`.slice(
            0,
            1024,
          ),
        inline: false,
      },
    )
    .setFooter({ text: "Neura Sama" })
    .setTimestamp();
}

function pageContent(page, total) {
  return `Silahkan pilih xtal\nPage ${page + 1} / ${total}`;
}

// --- Command ---

export default {
  name: "xtal",

  data: new SlashCommandBuilder()
    .setName("xtal")
    .setDescription("melihat information xtal")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama xtal")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Fetch data
    let query = supabase.from("xtal").select("*");
    const xtalName = interaction.options.getString("name");
    if (xtalName) query = query.ilike("name", `%${xtalName}%`);

    const { data, error } = await query;

    if (error) {
      console.error("[xtal] Supabase error:", error);
      return interaction.editReply("Terjadi kesalahan saat mengambil data.");
    }

    if (!data?.length) {
      return interaction.editReply("Data xtal tidak ditemukan.");
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

        // Select menu: show xtal detail
        if (i.isStringSelectMenu()) {
          const selected = i.values[0];

          const { data: xtal, error: xtalError } = await supabase
            .from("xtal")
            .select("*")
            .eq("name", selected)
            .single();

          if (xtalError || !xtal) {
            return i.reply({
              content: "Xtal tidak ditemukan.",
              ephemeral: true,
            });
          }

          return i.update({
            content: "",
            embeds: [buildXtalEmbed(xtal)],
            components: [],
          });
        }
      } catch (err) {
        console.error("[xtal] Collector error:", err);

        // Safely reply if interaction hasn't been acknowledged
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
