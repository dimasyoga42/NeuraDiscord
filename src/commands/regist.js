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
const EFFECT_PAGE_SIZE = 3;

function buildMenuComponents(data, page) {
  const start = page * PAGE_SIZE;

  const end = start + PAGE_SIZE;

  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const options = data.slice(start, end).map((item, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(String(item.name || "Unknown").slice(0, 100))

      .setDescription(`lihat regist ${item.name}`.slice(0, 100))

      .setValue(String(start + i)),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId("regist_select")
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

function parseEffectLines(effect) {
  if (!effect) return ["-"];

  return effect
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getEffectPage(lines, effectPage) {
  const start = effectPage * EFFECT_PAGE_SIZE;

  return lines.slice(start, start + EFFECT_PAGE_SIZE);
}

function buildRegistEmbed(regist, effectPage) {
  const lines = parseEffectLines(regist.effect);

  const totalEffectPages = Math.max(
    1,
    Math.ceil(lines.length / EFFECT_PAGE_SIZE),
  );

  const pageLines = getEffectPage(lines, effectPage);

  return new EmbedBuilder()
    .setColor(color.gold)

    .setTitle(String(regist.name || "Unknown").slice(0, 256))

    .addFields(
      {
        name: "Max Level",
        value: String(regist.max_lv || "-"),
        inline: true,
      },

      {
        name: "Level Studied",
        value: String(regist.level_studied || "-"),
        inline: true,
      },

      {
        name: `Effect (${effectPage + 1}/${totalEffectPages})`,

        value: pageLines.join("\n").slice(0, 1024) || "-",

        inline: false,
      },
    )

    .setFooter({
      text: "Neura Sama",
    })

    .setTimestamp();
}

function buildDetailComponents(effectPage, totalEffectPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back_to_list")
        .setLabel("◀ Kembali")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("effect_prev")
        .setLabel("⬅ Effect")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(effectPage === 0),

      new ButtonBuilder()
        .setCustomId("effect_next")
        .setLabel("Effect ➡")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(effectPage >= totalEffectPages - 1),
    ),
  ];
}

function pageContent(page, total) {
  return `Silahkan pilih regist\nPage ${page + 1} / ${total}`;
}

export default {
  name: "regist",

  data: new SlashCommandBuilder()
    .setName("regist")
    .setDescription("melihat information regist")

    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama regist")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const registName = interaction.options.getString("name");

    let query = supabase
      .from("regist")
      .select("name, effect, max_lv, level_studied");

    if (registName) {
      query = query.ilike("name", `%${registName}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[regist] Supabase error:", error);

      return interaction.editReply("Terjadi kesalahan saat mengambil data.");
    }

    if (!data?.length) {
      return interaction.editReply("Data regist tidak ditemukan.");
    }

    const totalPages = Math.ceil(data.length / PAGE_SIZE);

    let currentPage = 0;
    let currentRegist = null;
    let effectPage = 0;

    const msg = await interaction.editReply({
      content: pageContent(currentPage, totalPages),

      components: buildMenuComponents(data, currentPage),
    });

    const collector = msg.createMessageComponentCollector({
      time: COLLECTOR_TIMEOUT,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "Ini bukan menu kamu.",
          ephemeral: true,
        });
      }

      try {
        if (i.isButton()) {
          if (i.customId === "back_to_list") {
            currentRegist = null;
            effectPage = 0;

            return i.update({
              content: pageContent(currentPage, totalPages),

              embeds: [],

              components: buildMenuComponents(data, currentPage),
            });
          }

          if (i.customId === "prev_page") {
            currentPage--;
          }

          if (i.customId === "next_page") {
            currentPage++;
          }

          if (i.customId === "prev_page" || i.customId === "next_page") {
            return i.update({
              content: pageContent(currentPage, totalPages),

              embeds: [],

              components: buildMenuComponents(data, currentPage),
            });
          }

          if (currentRegist) {
            const lines = parseEffectLines(currentRegist.effect);

            const totalEffectPages = Math.max(
              1,
              Math.ceil(lines.length / EFFECT_PAGE_SIZE),
            );

            if (i.customId === "effect_prev" && effectPage > 0) {
              effectPage--;
            }

            if (
              i.customId === "effect_next" &&
              effectPage < totalEffectPages - 1
            ) {
              effectPage++;
            }

            return i.update({
              embeds: [buildRegistEmbed(currentRegist, effectPage)],

              components: buildDetailComponents(effectPage, totalEffectPages),
            });
          }
        }

        if (i.isStringSelectMenu()) {
          const index = Number(i.values[0]);

          const regist = data[index];

          if (!regist) {
            return i.reply({
              content: "Regist tidak ditemukan.",

              ephemeral: true,
            });
          }

          currentRegist = regist;
          effectPage = 0;

          const lines = parseEffectLines(regist.effect);

          const totalEffectPages = Math.max(
            1,
            Math.ceil(lines.length / EFFECT_PAGE_SIZE),
          );

          return i.update({
            content: "",

            embeds: [buildRegistEmbed(regist, effectPage)],

            components: buildDetailComponents(effectPage, totalEffectPages),
          });
        }
      } catch (err) {
        console.error("[regist] Collector error:", err);

        if (!i.replied && !i.deferred) {
          await i
            .reply({
              content: "Terjadi kesalahan.",

              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    });

    collector.on("end", async () => {
      await interaction
        .editReply({
          components: [],
        })
        .catch(() => {});
    });
  },
};
