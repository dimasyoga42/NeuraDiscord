import { SlashCommandBuilder } from "discord.js";

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
} from "@discordjs/voice";

import scdl from "soundcloud-downloader";

export default {
  name: "play",

  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik soundcloud")
    .addStringOption((option) =>
      option.setName("url").setDescription("url soundcloud").setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const url = interaction.options.getString("url");

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("masuk vc dulu");
      }

      const info = await scdl.getInfo(url);

      const stream = await scdl.download(url);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
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

      player.on(AudioPlayerStatus.Playing, () => {
        console.log(`playing ${info.title}`);
      });

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("music finished");

        connection.destroy();
      });

      player.on("error", (err) => {
        console.log(err);

        connection.destroy();
      });

      await interaction.editReply(`🎵 sekarang memutar:\n${info.title}`);
    } catch (err) {
      console.log(err);

      await interaction.editReply("gagal memutar musik");
    }
  },
};
