import { YoutubeiExtractor } from "discord-player-youtubei";
import { DefaultExtractors } from "@discord-player/extractor";

export const registerExtractor = async (player) => {
  await player.extractors.loadMulti(DefaultExtractors);
  await player.extractors.register(YoutubeiExtractor, {
    streamOptions: {
      useClient: "TV_EMBEDDED",
    },
  });
  console.log("youtubei loaded");
};
