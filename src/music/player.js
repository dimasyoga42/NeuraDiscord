import { useMainPlayer } from "discord-player";

/**
 * Mengambil instance utama player secara dinamis.
 * Hal ini mencegah error null jika diakses sebelum inisialisasi.
 */
export const getPlayer = () => useMainPlayer();
