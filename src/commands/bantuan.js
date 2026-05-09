import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import { color } from "../config/color.js";

const COMMANDS_PATH = path.resolve("./src/commands");

function formatCommandName(name) {
  return `/${name}`;
}

function formatDescription(description) {
  if (!description) {
    return "No description";
  }

  return description;
}

async function loadCommands() {
  const files = fs
    .readdirSync(COMMANDS_PATH)
    .filter((file) => file.endsWith(".js"));

  const commands = [];

  for (const file of files) {
    try {
      const filePath = path.join(COMMANDS_PATH, file);

      const imported = await import(
        `${pathToFileURL(filePath).href}?update=${Date.now()}`
      );

      const command = imported.default || imported;

      if (!command?.data?.name) {
        continue;
      }

      const options = command.data.options || [];

      const optionDescriptions =
        options.length > 0
          ? options
              .map((opt) => {
                const required = opt.required ? "required" : "optional";

                return `• ${opt.name} (${required})\n> ${opt.description}`;
              })
              .join("\n")
          : "No parameters";

      commands.push({
        name: command.data.name,
        description: command.data.description || "No description",
        options: optionDescriptions,
      });
    } catch (err) {
      console.log(`[help] failed load ${file}`, err);
    }
  }

  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

export default {
  name: "help",

  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("lihat semua command"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const commands = await loadCommands();

      const embeds = [];

      const chunkSize = 8;

      for (let i = 0; i < commands.length; i += chunkSize) {
        const chunk = commands.slice(i, i + chunkSize);

        const embed = new EmbedBuilder()
          .setColor(color.dark)

          .setTitle("Neura Sama")

          .setDescription("Neura Sama akan selalu membantu anda ✨")

          .addFields(
            chunk.map((cmd) => ({
              name: `📌 ${formatCommandName(cmd.name)}`,

              value:
                `> ${formatDescription(cmd.description)}\n\n` +
                `**Parameters:**\n${cmd.options}`,

              inline: false,
            })),
          )

          .setFooter({
            text: `Total Commands: ${commands.length}`,
            iconURL: interaction.user.displayAvatarURL(),
          })

          .setTimestamp();

        embeds.push(embed);
      }

      await interaction.editReply({
        embeds,
      });
    } catch (err) {
      console.log(err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("terjadi kesalahan");
      }
    }
  },
};
