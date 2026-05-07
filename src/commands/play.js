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

      if (!result?.tracks?.length) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const track = result.tracks[0];

      await client.player.play(voiceChannel, track, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user,
          },

          volume: 80,

          leaveOnEnd: true,
          leaveOnEndCooldown: 300000,

          leaveOnStop: true,
          leaveOnStopCooldown: 300000,

          bufferingTimeout: 15000,
        },
      });

      await interaction.editReply({
        content:
          `🎵 sekarang memutar\n\n` +
          `judul: ${track.title}\n` +
          `durasi: ${track.duration}\n` +
          `author: ${track.author}`,
      });
    } catch (err) {
      console.error(err);

      if (interaction.deferred) {
        await interaction.editReply("gagal memutar musik");
      }
    }
  },
};
