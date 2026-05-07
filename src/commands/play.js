import { SlashCommandBuilder } from "discord.js";
import { useMainPlayer } from "discord-player";

export default {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Memutar musik berdasarkan judul atau tautan")
    .addStringOption((option) =>
      option
        .setName("judul")
        .setDescription("Masukkan judul lagu atau URL (YouTube/Spotify)")
        .setRequired(true),
    ),

  async execute(interaction) {
    const player = useMainPlayer();
    const query = interaction.options.getString("judul");
    const voiceChannel = interaction.member.voice.channel;

    // Validasi keberadaan pengguna di saluran suara
    if (!voiceChannel) {
      return interaction.reply({
        content:
          "Anda harus berada di dalam saluran suara untuk menggunakan perintah ini.",
        ephemeral: true,
      });
    }

    // Memastikan bot memiliki izin untuk bergabung dan berbicara
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      return interaction.reply({
        content:
          "Saya tidak memiliki izin untuk bergabung atau berbicara di saluran suara Anda.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const searchResult = await player.search(query, {
        requestedBy: interaction.user,
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply(
          `Pencarian untuk **${query}** tidak ditemukan.`,
        );
      }

      const { track } = await player.play(voiceChannel, searchResult, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.client,
          },
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 300000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 300000,
          leaveOnStop: true,
          selfDeaf: true,
          volume: 80,
          bufferingTimeout: 15000,
        },
      });

      return interaction.editReply(
        `🎵 Sekarang memutar: **${track.title}** oleh **${track.author}**`,
      );
    } catch (error) {
      console.error("Terjadi kesalahan pada eksekusi perintah play:", error);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(
          "Terjadi kesalahan teknis saat mencoba memutar musik.",
        );
      } else {
        return interaction.reply({
          content: "Gagal mengeksekusi perintah karena gangguan internal.",
          ephemeral: true,
        });
      }
    }
  },
};
