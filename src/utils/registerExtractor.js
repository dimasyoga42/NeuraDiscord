import { YoutubeiExtractor } from "discord-player-youtubei";
import { readFileSync } from "fs";
import { resolve } from "path";

export const registerExtractor = async (player) => {
  const cookiesPath = resolve("./cookies.txt");
  let cookies;
  try {
    cookies = readFileSync(cookiesPath, "utf-8");
  } catch {
    console.warn("cookies.txt tidak ditemukan, lanjut tanpa cookies");
  }

  await player.extractors.register(YoutubeiExtractor, {
    cookie: cookies,
    streamOptions: {
      useClient: "TV_EMBEDDED",
    },
  });
  console.log("youtubei loaded");
};
