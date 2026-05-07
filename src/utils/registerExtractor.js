import { YoutubeiExtractor } from "discord-player-youtubei";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Mendaftarkan YoutubeiExtractor ke dalam instance player.
 * @param {import('discord-player').Player} player - Instance player utama.
 */
export const registerExtractor = async (player) => {
  const cookiesPath = resolve("./cookies.txt");
  let cookies = null;

  try {
    // Memeriksa keberadaan file secara eksplisit sebelum membaca
    if (existsSync(cookiesPath)) {
      const rawCookies = readFileSync(cookiesPath, "utf-8").trim();
      if (rawCookies) {
        cookies = rawCookies;
        console.log("[Extractor] Berhasil memuat data dari cookies.txt");
      }
    } else {
      console.warn(
        "[Extractor] cookies.txt tidak ditemukan, menggunakan akses publik.",
      );
    }
  } catch (error) {
    console.error(
      "[Extractor] Kesalahan saat membaca file cookie:",
      error.message,
    );
  }

  // Registrasi extractor dengan konfigurasi optimal
  await player.extractors.register(YoutubeiExtractor, {
    useDefaultCookies: false, // Menonaktifkan cookie default library jika menggunakan milik sendiri
    authentication: cookies, // Beberapa versi Youtubei menggunakan properti 'authentication' atau 'cookie'
    streamOptions: {
      useClient: "TV_EMBEDDED",
    },
  });

  console.log(
    `[Extractor] Youtubei loaded. Status: ${cookies ? "Authenticated" : "Anonymous"}`,
  );
};
