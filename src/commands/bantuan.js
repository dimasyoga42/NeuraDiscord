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

function buildEmbed(commands, avaData, commandPage, imagePage, totalPages) {
  const start = commandPage * PAGE_SIZE;

  const current = commands.slice(start, start + PAGE_SIZE);

  const ava = avaData[imagePage];

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
      text: ava?.name
        ? `${ava.name} • Commands ${commandPage + 1}/${totalPages} • Image ${imagePage + 1}/${avaData.length}`
        : `Commands ${commandPage + 1}/${totalPages}`,
    })

    .setTimestamp();

  if (ava?.image) {
    embed.setImage(ava.image);
  }

  return embed;
}

function buildButtons(commandPage, totalPages, imagePage, totalImages) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cmd_prev")
        .setLabel("Command Prev")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(commandPage === 0),

      new ButtonBuilder()
        .setCustomId("cmd_next")
        .setLabel("Command Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(commandPage >= totalPages - 1),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("img_prev")
        .setLabel("Image Prev")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(imagePage === 0),

      new ButtonBuilder()
        .setCustomId("img_next")
        .setLabel("Image Next")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(imagePage >= totalImages - 1),
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

      let commandPage = 0;

      let imagePage = 0;

      const totalPages = Math.ceil(commands.length / PAGE_SIZE);

      const msg = await interaction.editReply({
        embeds: [
          buildEmbed(commands, avaData, commandPage, imagePage, totalPages),
        ],

        components: buildButtons(
          commandPage,
          totalPages,
          imagePage,
          avaData.length,
        ),
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

        if (i.customId === "cmd_prev") {
          commandPage--;
        }

        if (i.customId === "cmd_next") {
          commandPage++;
        }

        if (i.customId === "img_prev") {
          imagePage--;
        }

        if (i.customId === "img_next") {
          imagePage++;
        }

        await i.update({
          embeds: [
            buildEmbed(commands, avaData, commandPage, imagePage, totalPages),
          ],

          components: buildButtons(
            commandPage,
            totalPages,
            imagePage,
            avaData.length,
          ),
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
