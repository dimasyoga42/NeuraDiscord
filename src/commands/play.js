import { SlashCommandBuilder } from "discord.js";
import { useMainPlayer } from "discord-player";

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

      const player = useMainPlayer();

      const { track } = await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
          },
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 300000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 300000,
          leaveOnStop: true,
          selfDeaf: true,
          volume: 80,
        },
        requestedBy: interaction.user,
      });

      await interaction.editReply(`🎵 sekarang memutar:\n**${track.title}**`);
    } catch (err) {
      console.error(err);
      if (interaction.deferred) {
        await interaction.editReply("gagal memutar musik");
      }
    }
  },
};
