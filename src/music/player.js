import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} from "@discordjs/voice";

import play from "play-dl";

import { getQueue, deleteQueue } from "./queue.js";

const players = new Map();

export const playMusic = async ({ interaction, query }) => {
  const member = interaction.member;

  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply("kamu harus masuk voice channel");
  }

  const guildId = interaction.guild.id;

  const queue = getQueue(guildId);

  const search = await play.search(query, {
    limit: 1,
  });

  if (!search.length) {
    return interaction.editReply("musik tidak ditemukan");
  }

  const song = search[0];

  queue.songs.push(song);

  await interaction.editReply(`ditambahkan ke queue:\n${song.title}`);

  if (queue.playing) return;

  queue.playing = true;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch {
    connection.destroy();

    deleteQueue(guildId);

    return;
  }

  const player = createAudioPlayer();

  players.set(guildId, player);

  connection.subscribe(player);

  const playNext = async () => {
    const nextSong = queue.songs.shift();

    if (!nextSong) {
      queue.playing = false;

      connection.destroy();

      deleteQueue(guildId);

      return;
    }

    const stream = await play.stream(nextSong.url);

    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
    });

    player.play(resource);

    player.once(AudioPlayerStatus.Idle, async () => {
      await playNext();
    });
  };

  await playNext();
};
