import { SlashCommandBuilder } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import scdl from "soundcloud-downloader";

export default {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Memutar musik dari SoundCloud berdasarkan URL")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Masukkan URL SoundCloud yang valid")
        .setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const url = interaction.options.getString("url");
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply(
          "Anda harus berada di dalam saluran suara untuk menggunakan perintah ini.",
        );
      }

      // Validasi URL secara sederhana sebelum melakukan proses pengunduhan
      if (!scdl.validateURL(url)) {
        return interaction.editReply(
          "URL SoundCloud tidak valid. Pastikan tautan yang Anda berikan benar.",
        );
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Menunggu hingga koneksi siap untuk menghindari kegagalan sinkronisasi
      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      } catch (error) {
        connection.destroy();
        return interaction.editReply(
          "Gagal menyambung ke saluran suara dalam waktu yang ditentukan.",
        );
      }

      const stream = await scdl.download(url);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });

      connection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Playing, () => {
        console.log(`[AudioPlayer] Sedang memutar: ${url}`);
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("[AudioPlayer] Selesai memutar musik.");
        // Menghancurkan koneksi jika tidak ada aktivitas lagi
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      });

      player.on("error", (error) => {
        console.error(
          `[AudioPlayer Error] Terjadi kesalahan: ${error.message}`,
        );
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      });

      await interaction.editReply(`🎵 **Sekarang Memutar:** ${url}`);
    } catch (err) {
      console.error("[Execution Error]", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "Terjadi kesalahan sistem saat mencoba memutar musik.",
        );
      }
    }
  },
};
