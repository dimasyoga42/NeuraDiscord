import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export default {
  name: "filarm",

  data: new SlashCommandBuilder()
    .setName("filarm")
    .setDescription("simulator filstat armor")
    .addStringOption((option) =>
      option
        .setName("stat")
        .setDescription("masukan stat yang anda inginkan")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("stat");

    const baseUrl = "https://neurapi.mochinime.cyou/api/toram/filarm?text=";

    try {
      const res = await axios.get(`${baseUrl}${encodeURIComponent(query)}`);

      const data = res.data;

      if (!data.ok || !data.hasValidResult) {
        return await interaction.editReply({
          content: "stat tidak ditemukan atau hasil tidak valid",
        });
      }

      const stepsText = data.steps
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n\n");

      const positiveStats = data.inputConfig.positiveStats
        .map((s) => `${s.name} ${s.level}`)
        .join("\n");

      const negativeStats = data.inputConfig.negativeStats
        .map((s) => `${s.name} ${s.level}`)
        .join("\n");

      const emb = new EmbedBuilder()
        .setTitle("Simulator Filstat Armor")
        .setDescription(
          `Berikut hasil simulasi filstat untuk query:\n\`${query}\``,
        )
        .addFields(
          {
            name: "Positive Stats",
            value: positiveStats || "-",
            inline: true,
          },
          {
            name: "Negative Stats",
            value: negativeStats || "-",
            inline: true,
          },
          {
            name: "Success Rate",
            value: data.successRate,
            inline: true,
          },
          {
            name: "Starting Potential",
            value: data.startingPot,
            inline: true,
          },
          {
            name: "Material Cost",
            value: data.materialCost,
            inline: false,
          },
          {
            name: "Highest Step Cost",
            value: data.highestStepCost,
            inline: true,
          },
          {
            name: "Total Steps",
            value: `${data.totalSteps}`,
            inline: true,
          },
          {
            name: "Steps",
            value:
              stepsText.length > 1024
                ? `${stepsText.slice(0, 1000)}...`
                : stepsText,
            inline: false,
          },
        )
        .setFooter({
          text: `Character Lv ${data.inputConfig.characterLevel} • PROF Lv ${data.inputConfig.professionLevel}`,
        })
        .setTimestamp(new Date(data.timestamp));

      await interaction.editReply({
        embeds: [emb],
      });
    } catch (err) {
      console.error(err);

      await interaction.editReply({
        content: "terjadi kesalahan saat mengambil data dari Rest API",
      });
    }
  },
};
