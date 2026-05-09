import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import axios from "axios";
import translate from "google-translate-api-x";

import { color } from "../config/color.js";

const COMMANDS_PATH = path.resolve("./src/commands");

const PAGE_SIZE = 8;

async function loadCommands() {
  const files = fs
    .readdirSync(COMMANDS_PATH)
    .filter((file) => file.endsWith(".js"));

  const commands = [];

  for (const file of files) {
    try {
      const filePath = path.join(COMMANDS_PATH, file);

      const imported = await import(
        `${pathToFileURL(filePath).href}?v=${Date.now()}`
      );

      const command = imported.default || imported;

      if (!command?.data?.name) {
        continue;
      }

      const options = command.data.options || [];

      const translatedDescription = await translate(
        command.data.description || "No description",
        {
          to: "en",
        },
      )
        .then((res) => res.text)
        .catch(() => command.data.description || "No description");

      const params =
        options.length > 0
          ? options
              .map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
              .join(" ")
          : "";

      commands.push({
        name: command.data.name,

        description: translatedDescription,

        usage: `/${command.data.name} ${params}`.trim(),
      });
    } catch (err) {
      console.log(`[help] failed load ${file}`, err);
    }
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadAvaImages() {
  try {
    const { data } = await axios.get(
      "https://neurapi.mochinime.cyou/api/toram/ava",
    );

    return data?.result?.data || [];
  } catch {
    return [];
  }
}

function buildEmbed(commands, avaData, page, totalPages) {
  const start = page * PAGE_SIZE;

  const current = commands.slice(start, start + PAGE_SIZE);

  const ava = avaData[page % avaData.length];

  const embed = new EmbedBuilder()
    .setColor(color.dark)

    .setTitle("Neura Sama")

    .setDescription(
      current
        .map((cmd) =>
          [`/${cmd.name}`, `${cmd.description}`, `Usage: ${cmd.usage}`].join(
            "\n",
          ),
        )
        .join("\n\n"),
    )

    .setFooter({
      text: `Page ${page + 1} / ${totalPages} • Total ${commands.length} Commands`,
    })

    .setTimestamp();

  if (ava?.image) {
    embed.setImage(ava.image);

    if (ava.name) {
      embed.setFooter({
        text: `${ava.name} • Page ${page + 1} / ${totalPages}`,
      });
    }
  }

  return embed;
}

function buildButtons(page, totalPages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),

      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    ),
  ];
}

export default {
  name: "help",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("view all commands"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const [commands, avaData] = await Promise.all([
        loadCommands(),
        loadAvaImages(),
      ]);

      if (!commands.length) {
        return interaction.editReply("command not found");
      }

      let currentPage = 0;

      const totalPages = Math.ceil(commands.length / PAGE_SIZE);

      const msg = await interaction.editReply({
        embeds: [buildEmbed(commands, avaData, currentPage, totalPages)],

        components: buildButtons(currentPage, totalPages),
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,

        time: 120000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: "this is not your menu",

            ephemeral: true,
          });
        }

        if (i.customId === "prev") {
          currentPage--;
        }

        if (i.customId === "next") {
          currentPage++;
        }

        await i.update({
          embeds: [buildEmbed(commands, avaData, currentPage, totalPages)],

          components: buildButtons(currentPage, totalPages),
        });
      });

      collector.on("end", async () => {
        await interaction
          .editReply({
            components: [],
          })
          .catch(() => {});
      });
    } catch (err) {
      console.log(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("an error occurred");
      }
    }
  },
};
