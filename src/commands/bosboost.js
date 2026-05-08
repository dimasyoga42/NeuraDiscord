import * as cheerio from "cheerio";
import fetch from "node-fetch";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

const BASE_URL = "https://id.toram.jp";

const scrapeBoostBoss = async () => {
  const listRes = await fetch(`${BASE_URL}/information/?cat=info`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!listRes.ok) {
    throw new Error(`HTTP ${listRes.status}`);
  }

  const $ = cheerio.load(await listRes.text());

  const boostNews = [];

  $("a").each((_, el) => {
    const text = $(el).text().trim();

    if (!text.toLowerCase().includes("boost")) {
      return;
    }

    const href = $(el).attr("href");

    if (!href) {
      return;
    }

    boostNews.push({
      title: text,
      href: href.startsWith("http") ? href : `${BASE_URL}${href}`,
    });
  });

  if (!boostNews.length) {
    return {
      active: false,
      bosses: [],
    };
  }

  const latest = boostNews[0];

  const detailRes = await fetch(latest.href, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!detailRes.ok) {
    throw new Error(`HTTP ${detailRes.status}`);
  }

  const $d = cheerio.load(await detailRes.text());

  const bosses = [];

  $d("img").each((_, el) => {
    const src = $d(el).attr("src");

    if (!src) {
      return;
    }

    if (!src.includes("boss") && !src.includes("event")) {
      return;
    }

    let image = src;

    if (src.startsWith("//")) {
      image = `https:${src}`;
    } else if (src.startsWith("/")) {
      image = `${BASE_URL}${src}`;
    }

    const parentText = $d(el).parent().text().trim();

    const match = parentText.match(/Lv(\d+)\s+([^(]+)(?:\(([^)]+)\))?/);

    if (!match) {
      return;
    }

    const level = match[1];
    const name = match[2]?.trim();
    const location = match[3]?.trim() || "-";

    if (!name) {
      return;
    }

    bosses.push({
      level,
      name,
      location,
      image,
    });
  });

  const uniqueBosses = bosses.filter(
    (boss, index, self) =>
      index === self.findIndex((b) => b.name === boss.name),
  );

  return {
    active: true,
    bosses: uniqueBosses,
    title: latest.title,
  };
};

export default {
  name: "boost",

  data: new SlashCommandBuilder()
    .setName("boost")
    .setDescription("melihat boost boss toram"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const result = await scrapeBoostBoss();

      if (!result.active || !result.bosses.length) {
        return interaction.editReply("boost boss tidak ditemukan");
      }

      let currentPage = 0;

      const generateEmbed = (page) => {
        const boss = result.bosses[page];

        return new EmbedBuilder()
          .setColor("#00ffff")
          .setTitle(`${boss.name}`)
          .setDescription(`## Boost Boss\n${result.title}`)
          .addFields([
            {
              name: "Level",
              value: boss.level,
              inline: true,
            },
            {
              name: "Location",
              value: boss.location,
              inline: true,
            },
          ])
          .setImage(boss.image)
          .setFooter({
            text: `Boss ${page + 1} / ${result.bosses.length}`,
          })
          .setTimestamp();
      };

      const generateButtons = (page) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("boost_prev")
            .setLabel("◀ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId("boost_next")
            .setLabel("Next ▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === result.bosses.length - 1),
        );
      };

      const msg = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
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

          if (i.customId === "boost_prev") {
            currentPage--;
          }

          if (i.customId === "boost_next") {
            currentPage++;
          }

          await i.update({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)],
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
