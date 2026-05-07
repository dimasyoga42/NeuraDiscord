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
    .setDescription("Memutar musik dari SoundCloud")
    .addStringOption((option) =>
      option.setName("url").setDescription("URL SoundCloud").setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const url = interaction.options.getString("url");
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("Anda harus berada di saluran suara.");
      }

      // Perbaikan: Gunakan metode validasi yang benar atau pengecekan regex jika metode bawaan gagal
      const isValid = scdl.default
        ? scdl.default.validateURL(url)
        : scdl.validateURL(url);
      if (!isValid) {
        return interaction.editReply("Format URL SoundCloud tidak valid.");
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      // Memastikan koneksi siap sebelum memutar
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

      // Mengambil stream dengan penanganan error internal
      const stream = await scdl.default.download(url).catch((err) => {
        throw new Error(`Gagal mengunduh stream: ${err.message}`);
      });

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

      player.on(AudioPlayerStatus.Idle, () => {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      });

      player.on("error", (error) => {
        console.error(`Audio Player Error: ${error.message}`);
        connection.destroy();
      });

      await interaction.editReply(`🎵 Memutar musik dari SoundCloud...`);
    } catch (err) {
      console.error("[Execution Error]", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`Gagal memutar: ${err.message}`);
      }
    }
  },
};
