import { SlashCommandBuilder } from "discord.js";
import { QueryType } from "discord-player";

export default {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Memutar musik dengan sistem ekstraktor terintegrasi")
    .addStringOption((option) =>
      option
        .setName("judul")
        .setDescription("Judul lagu, artis, atau tautan YouTube")
        .setRequired(true),
    ),

  async execute(interaction, client) {
    // Memastikan interaksi dideferensi karena proses pencarian membutuhkan waktu
    await interaction.deferReply();

    const query = interaction.options.getString("judul");
    const voiceChannel = interaction.member.voice.channel;

    // Validasi keberadaan user di Voice Channel
    if (!voiceChannel) {
      return interaction.editReply(
        "Anda harus masuk ke saluran suara terlebih dahulu.",
      );
    }

    try {
      // Menggunakan instance player yang sudah terdaftar di client (app.player)
      const searchResult = await client.player.search(query, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply(
          `Hasil pencarian untuk "**${query}**" tidak ditemukan.`,
        );
      }

      // Membuat atau mengambil antrean aktif untuk server tersebut
      const queue = client.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEnd: true,
      });

      // Menangani proses koneksi ke saluran suara
      try {
        if (!queue.connection) await queue.connect(voiceChannel);
      } catch (err) {
        queue.delete();
        return interaction.editReply("Gagal menyambung ke saluran suara Anda.");
      }

      // Menambahkan lagu atau playlist ke antrean
      const track = searchResult.tracks[0];
      searchResult.playlist
        ? queue.addTrack(searchResult.tracks)
        : queue.addTrack(track);

      // Memulai pemutaran jika antrean sedang dalam posisi idle
      if (!queue.isPlaying()) {
        await queue.node.play();
      }

      return interaction.editReply(
        searchResult.playlist
          ? `✅ Ditambahkan ke antrean: **${searchResult.playlist.title}** (${searchResult.tracks.length} lagu)`
          : `✅ Sekarang memutar: **${track.title}**`,
      );
    } catch (error) {
      console.error("Terjadi kesalahan pada command play:", error);
      return interaction.editReply(
        "Terjadi kesalahan internal saat mencoba memutar musik.",
      );
    }
  },
};
