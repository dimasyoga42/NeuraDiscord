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
    .setDescription("play musik")
    .addStringOption((option) =>
      option.setName("judul").setDescription("judul musik").setRequired(true),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const query = interaction.options.getString("judul");

      const vc = interaction.member.voice.channel;

      if (!vc) {
        return interaction.editReply("masuk vc dulu");
      }

      const search = await ytSearch(query);

      const video = search.videos[0];

      if (!video) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const fileName = `${Date.now()}.mp3`;

      const output = path.resolve(`./temp/${fileName}`);

      await interaction.editReply(`mengunduh ${video.title}`);

      await new Promise((resolve, reject) => {
        exec(
          `yt-dlp -x --audio-format mp3 -o "${output}" "${video.url}"`,
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      const connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: vc.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
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

      player.on(AudioPlayerStatus.Idle, () => {
        console.log("music finished");

        connection.destroy();

        if (fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      });

      player.on("error", (err) => {
        console.log(err);

        connection.destroy();

        if (fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      });
    } catch (err) {
      console.log(err);

      await interaction.editReply("gagal memutar musik");
    }
  },
};
