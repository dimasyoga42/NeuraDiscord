import { YoutubeiExtractor } from "discord-player-youtubei";

export const registerExtractor = async (player) => {
  await player.extractors.register(YoutubeiExtractor, {
    streamOptions: {
      useClient: "WEB", // <-- ganti dari ANDROID ke WEB
    },
  });
  console.log("youtubei loaded");
};
