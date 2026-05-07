import { SlashCommandBuilder } from "discord.js";
import { QueryType } from "discord-player";

export default {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Memutar musik dari YouTube")
    .addStringOption((option) =>
      option
        .setName("judul")
        .setDescription("Judul lagu atau URL YouTube")
        .setRequired(true),
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const query = interaction.options.getString("judul");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply("Anda harus masuk ke saluran suara.");
    }

    try {
      /**
       * Secara akademis, memaksa searchEngine ke YOUTUBE atau YOUTUBE_SEARCH
       * memastikan ekstraktor tidak melakukan pengecekan ke platform lain (Spotify/SoundCloud),
       * sehingga proses resolusi metadata menjadi lebih cepat dan efisien.
       */
      const searchResult = await client.player.search(query, {
        requestedBy: interaction.user,
        searchEngine:
          query.includes("youtube.com") || query.includes("youtu.be")
            ? QueryType.YOUTUBE_VIDEO
            : QueryType.YOUTUBE_SEARCH,
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply(
          `Konten YouTube untuk "**${query}**" tidak ditemukan.`,
        );
      }

      const queue = client.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
        },
        selfDeaf: true,
        volume: 80,
        leaveOnEmpty: true,
        leaveOnEnd: true,
      });

      try {
        if (!queue.connection) await queue.connect(voiceChannel);
      } catch {
        queue.delete();
        return interaction.editReply("Gagal bergabung ke saluran suara.");
      }

      const track = searchResult.tracks[0];

      // Menangani penambahan track atau playlist secara kolektif
      queue.addTrack(searchResult.playlist ? searchResult.tracks : track);

      if (!queue.isPlaying()) {
        await queue.node.play();
      }

      return interaction.editReply(
        `✅ Sumber YouTube ditemukan:\n**${track.title}**`,
      );
    } catch (error) {
      console.error("Kesalahan pencarian YouTube:", error);
      return interaction.editReply(
        "Terjadi kesalahan saat mengekstraksi data dari YouTube.",
      );
    }
  },
};
