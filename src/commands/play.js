import { SlashCommandBuilder } from "discord.js";

export default {
  name: "play",

  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik")
    .addStringOption((option) =>
      option.setName("judul").setDescription("judul lagu").setRequired(true),
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const query = interaction.options.getString("judul");

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("masuk vc dulu");
      }

      const searchResult = await client.player.search(query, {
        requestedBy: interaction.user,
      });

      if (!searchResult.hasTracks()) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const { track } = await client.player.play(voiceChannel, searchResult, {
        nodeOptions: {
          metadata: interaction,
        },
      });

      await interaction.editReply(`sedang memutar:\n${track.title}`);
    } catch (err) {
      console.error(err);

      await interaction.editReply("gagal memutar musik");
    }
  },
};
