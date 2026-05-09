import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { translate } from "@vitalets/google-translate-api";
import { supabase } from "../db/supabase.js";
import { color } from "../config/color.js";

const PAGE_SIZE = 25;
const COLLECTOR_TIMEOUT = 120_000;
const STAT_PAGE_SIZE = 3;

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

function parseStatLines(statEffect) {
  if (!statEffect) return ["-"];
  return statEffect
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function getStatPage(lines, statPage) {
  const start = statPage * STAT_PAGE_SIZE;
  return lines.slice(start, start + STAT_PAGE_SIZE);
}

function buildTraitEmbed(trait, statPage) {
  const lines = parseStatLines(trait.stat_effect);
  const totalStatPages = Math.ceil(lines.length / STAT_PAGE_SIZE);
  const pageLines = getStatPage(lines, statPage);

  return new EmbedBuilder()
    .setColor(color.gold)
    .setTitle(trait.name.slice(0, 256))
    .addFields({
      name: `Stat Effect (${statPage + 1}/${totalStatPages})`,
      value: pageLines.join("\n").slice(0, 1024) || "-",
      inline: false,
    })
    .setFooter({ text: "Neura Sama" })
    .setTimestamp();
}

function buildDetailComponents(statPage, totalStatPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back_to_list")
        .setLabel("◀ Kembali")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("stat_prev")
        .setLabel("⬅ Stat")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(statPage === 0),
      new ButtonBuilder()
        .setCustomId("stat_next")
        .setLabel("Stat ➡")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(statPage >= totalStatPages - 1),
    ),
  ];
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
    )
    .addStringOption((option) =>
      option
        .setName("lang")
        .setDescription("bahasa hasil (id/en)")
        .setRequired(false)
        .addChoices(
          { name: "Indonesia", value: "id" },
          { name: "English", value: "en" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const traitName = interaction.options.getString("name");
    const lang = interaction.options.getString("lang");

    let query = supabase.from("ablityv2").select("name, stat_effect");
    if (traitName) query = query.ilike("name", `%${traitName}%`);

    const { data, error } = await query;

    if (error) {
      console.error("[trait] Supabase error:", error);
      return interaction.editReply("Terjadi kesalahan saat mengambil data.");
    }

    if (!data?.length) {
      return interaction.editReply("Data trait tidak ditemukan.");
    }

    // ✅ Fix: translate stat_effect, simpan ke stat_effect (bukan name)
    let displayData = data;
    if (lang === "en") {
      displayData = await Promise.all(
        data.map(async (item) => {
          try {
            const res = await translate(item.stat_effect ?? "", { to: "en" });
            return { ...item, stat_effect: res.text };
          } catch {
            return item;
          }
        }),
      );
    }

    const totalPages = Math.ceil(displayData.length / PAGE_SIZE);
    let currentPage = 0;
    let currentTrait = null;
    let statPage = 0;

    const msg = await interaction.editReply({
      content: pageContent(currentPage, totalPages),
      components: buildMenuComponents(displayData, currentPage),
    });

    const collector = msg.createMessageComponentCollector({
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "Ini bukan menu kamu.", ephemeral: true });
      }

      try {
        if (i.isButton()) {
          if (i.customId === "back_to_list") {
            currentTrait = null;
            statPage = 0;
            return i.update({
              content: pageContent(currentPage, totalPages),
              embeds: [],
              components: buildMenuComponents(displayData, currentPage),
            });
          }

          if (i.customId === "prev_page") currentPage--;
          if (i.customId === "next_page") currentPage++;

          if (i.customId === "prev_page" || i.customId === "next_page") {
            return i.update({
              content: pageContent(currentPage, totalPages),
              embeds: [],
              components: buildMenuComponents(displayData, currentPage),
            });
          }

          if (currentTrait) {
            const lines = parseStatLines(currentTrait.stat_effect);
            const totalStatPages = Math.ceil(lines.length / STAT_PAGE_SIZE);

            if (i.customId === "stat_prev" && statPage > 0) statPage--;
            if (i.customId === "stat_next" && statPage < totalStatPages - 1)
              statPage++;

            return i.update({
              embeds: [buildTraitEmbed(currentTrait, statPage)],
              components: buildDetailComponents(statPage, totalStatPages),
            });
          }
        }

        if (i.isStringSelectMenu()) {
          const index = parseInt(i.values[0]);
          const trait = displayData[index];

          if (!trait) {
            return i.reply({
              content: "Trait tidak ditemukan.",
              ephemeral: true,
            });
          }

          currentTrait = trait;
          statPage = 0;

          const lines = parseStatLines(trait.stat_effect);
          const totalStatPages = Math.ceil(lines.length / STAT_PAGE_SIZE);

          return i.update({
            content: "",
            embeds: [buildTraitEmbed(trait, statPage)],
            components: buildDetailComponents(statPage, totalStatPages),
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
