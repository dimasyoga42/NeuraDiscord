import { SlashCommandBuilder } from "discord.js";

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} from "@discordjs/voice";

import ytSearch from "yt-search";

import { exec } from "child_process";

import path from "path";

import fs from "fs";

export default {
  name: "play",

  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik dari youtube")
    .addStringOption((option) =>
      option
        .setName("judul")
        .setDescription("masukan judul musik")
        .setRequired(true),
    ),

  async execute(interaction) {
    let output = null;
    let connection = null;

    try {
      await interaction.deferReply();

      const query = interaction.options.getString("judul");

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("masuk vc dulu");
      }

      const search = await ytSearch(query);

      const video = search.videos[0];

      if (!video) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const fileName = `${Date.now()}.mp3`;

      output = path.resolve(`./temp/${fileName}`);

      await interaction.editReply(`⏳ mengunduh:\n${video.title}`);

      await new Promise((resolve, reject) => {
        const command = `
yt-dlp \
--cookies /home/ubuntu/NeuraDiscord/cookies.txt \
--extractor-args "youtube:player_client=android" \
--extract-audio \
--audio-format mp3 \
--audio-quality 0 \
-o "${output}" \
"${video.url}"
`;

        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.log(stderr);

            reject(err);
          } else {
            resolve();
          }
        });
      });

      connection = joinVoiceChannel({
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

      const resource = createAudioResource(output);

      connection.subscribe(player);

      player.play(resource);

      player.on(AudioPlayerStatus.Playing, async () => {
        console.log(`playing ${video.title}`);

        await interaction.followUp(`🎵 sekarang memutar:\n${video.title}`);
      });

      player.on(AudioPlayerStatus.Idle, async () => {
        console.log("music finished");

        try {
          connection.destroy();
        } catch {}

        if (output && fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      });

      player.on("error", async (err) => {
        console.log(err);

        try {
          connection.destroy();
        } catch {}

        if (output && fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      });
    } catch (err) {
      console.log(err);

      try {
        if (connection) {
          connection.destroy();
        }
      } catch {}

      if (output && fs.existsSync(output)) {
        fs.unlinkSync(output);
      }

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("gagal memutar musik");
      }
    }
  },
};
