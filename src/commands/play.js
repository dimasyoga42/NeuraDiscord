import { SlashCommandBuilder } from "discord.js";

export default {
  name: "play",

  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik")
    .addStringOption((option) =>
      option.setName("judul").setDescription("judul musik").setRequired(true),
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();

      const query = interaction.options.getString("judul");

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("masuk vc dulu");
      }

      const result = await client.player.search(query, {
        requestedBy: interaction.user,
      });

      if (!result.hasTracks()) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const { track } = await client.player.play(voiceChannel, result, {
        nodeOptions: {
          metadata: interaction,
        },
      });

      await interaction.editReply(`🎵 sekarang memutar:\n${track.title}`);
    } catch (err) {
      console.error(err);

      await interaction.editReply("gagal memutar musik");
    }
  },
};
