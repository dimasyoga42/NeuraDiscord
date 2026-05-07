import { SlashCommandBuilder } from "discord.js";

export default {
  name: "play",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("play musik")
    .addStringOption((option) =>
      option.setName("judul").setDescription("judul lagu").setRequired(true),
    ),
  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const query = interaction.options.getString("judul");
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("masuk vc dulu");
      }

      const searchResult = await client.player.search(query, {
        requestedBy: interaction.user,
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply("musik tidak ditemukan");
      }

      const queue = client.player.nodes.create(interaction.guild, {
        metadata: {
          channel: interaction.channel,
        },
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 300000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 300000,
        leaveOnStop: true,
        selfDeaf: true, // <-- tambahan
        volume: 80,
      });

      try {
        if (!queue.connection) {
          await queue.connect(voiceChannel, { deaf: true }); // <-- tambahan
        }
      } catch {
        queue.delete();
        return interaction.editReply("gagal join vc");
      }

      queue.addTrack(searchResult.tracks[0]);

      if (!queue.isPlaying()) {
        await queue.node.play(); // <-- hapus setVolume, kadang bikin bug
      }

      await interaction.editReply(
        `🎵 sekarang memutar:\n**${searchResult.tracks[0].title}**`,
      );
    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        await interaction.editReply("gagal memutar musik");
      }
    }
  },
};
