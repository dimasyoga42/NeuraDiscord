import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  EmbedBuilder,
} from "discord.js";
import dotenv from "dotenv";
import { supabase } from "./src/db/supabase.js";
import { color } from "./src/config/color.js";
import { lv } from "./src/plug/lv.js";

dotenv.config();

// 1. Validasi Environment Variable
if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error("Error Fatal: Konfigurasi .env tidak lengkap.");
  process.exit(1);
}

const app = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 2. Definisi Commands
const commands = [
  new SlashCommandBuilder()
    .setName("neura")
    .setDescription("Panggil Neura Sama"),
  new SlashCommandBuilder()
    .setName("banner")
    .setDescription("melihat banner ava terbaru"),

  new SlashCommandBuilder()
    .setName("bantuan")
    .setDescription("Lihat semua menu Neura Sama"),
  new SlashCommandBuilder()
    .setName("buff")
    .setDescription("untuk melihat daftar buffland")
    .addStringOption(option =>
      option
        .setName("buffname")
        .setDescription("masukan nama buff")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("xtal")
    .setDescription("melihat information xtall")
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("masukan nama xtal yang dicari")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("ability")
    .setDescription("melihat information ability")
    .addStringOption(option =>
      option
        .setName("abilityname")
        .setDescription("masukan nama ability yang dicari")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("lv")
    .setDescription("melihat information xtall")
    .addStringOption(option =>
      option
        .setName("level")
        .setDescription("masukan level anda")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("bos")
    .setDescription("Cari informasi Boss")
    .addStringOption(option =>
      option
        .setName("nama")
        .setDescription("Masukkan nama boss yang dicari")
        .setRequired(true)
    )
].map(command => command.toJSON());

// 3. Fungsi Deploy
async function deployCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    console.log("Memperbarui slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Slash commands berhasil diperbarui.");
  } catch (error) {
    console.error("Gagal sinkronisasi API Discord:", error);
  }
}

app.once(Events.ClientReady, async (c) => {
  console.log(`✅ ${c.user.tag} telah aktif!`);
  await deployCommands();
});

// 4. Penanganan Interaksi
app.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "neura":
        await interaction.reply("Neura Sama di sini! Gunakan `/bantuan`.");
        break;

      case "bantuan":
        await interaction.deferReply();
        const menuNeura = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle("Menu Neura Sama")
          .setDescription("Neura hadir tidak hanya di discord melainkan juga ada di web dan whatsapp")
          .addFields([
            { name: "Guide Toram", value: "/perpus - daftar guide", inline: true },
            { name: "Toram Tools", value: "/bos - melihat statistik bos\n/buff - melihat daftar buffland yang tersedia\n/xtal - melihat detail xtal\n/regis - melihat detail regis\n/ability - melihat detail ability", inline: true }
          ])
          .setTimestamp()
          .setFooter({ text: "Neura Sama" })

        await interaction.editReply({ embeds: [menuNeura] })
        break;

      case "bos": {
        await interaction.deferReply();
        const namaBos = interaction.options.getString("nama");
        const { data, error } = await supabase
          .from("bosdef")
          .select("*")
          .ilike("name", `%${namaBos}%`)
          .limit(1);

        if (error || !data || data.length === 0) {
          return await interaction.editReply(`Boss **"${namaBos}"** tidak ditemukan.`);
        }
        const bos = data[0];


        let fullStat = bos.stat || 'No Data';


        if (fullStat.length > 4000) {
          fullStat = fullStat.substring(0, 4000) + "... (karakter maksimal tercapai)";
        }

        const embed = new EmbedBuilder()
          .setColor(color.black)
          .setTitle(`Boss Info: ${bos.name}`)
          .setDescription(`**Statistik Lengkap:**\n\`\`\`\n${fullStat}\n\`\`\``)
          .addFields([
            { name: 'Lokasi', value: bos.spawn || '-', inline: true },
            { name: 'Elemen', value: bos.element || '-', inline: true }
          ])
          .setImage(bos.image_url || null)
          .setTimestamp()
          .setFooter({ text: "Neura Sama Database" });

        await interaction.editReply({ embeds: [embed] });
        break;
      }
      case "banner": {
        await interaction.deferReply();

        try {
          const response = await fetch(process.env.BANNER);
          const res = await response.json();
          const ava = res.data;

          if (!ava || ava.length === 0) {
            return await interaction.editReply("Banner tidak berhasil dimuat atau data kosong.");
          }

          const bannertxt = ava.slice(0, 10).map((item) => {
            return new EmbedBuilder()
              .setColor(color.wind)
              .setTitle(item.title || "Untitled Banner")
              .setDescription(`**Tanggal:** ${item.dateStr || "N/A"}`)
              .setImage(item.image)
              .setTimestamp()
              .setFooter({ text: "Neura Sama Update Banner" });
          });

          await interaction.editReply({
            embeds: bannertxt
          });

        } catch (error) {
          console.error("Error pada perintah banner:", error);
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply("Terjadi kesalahan teknis saat mengambil data banner.");
          } else {
            // Ini hanya jika deferReply gagal dijalankan di awal
            await interaction.reply({ content: "Gagal memproses perintah.", ephemeral: true });
          }
        }
        break;
      }
      case "buff": {
        try {
          await interaction.deferReply();
          const buffname = interaction.options.getString("buffname")
          if (!buffname) return;
          const { data, error } = await supabase.from("buff").select("*").ilike("name", `%${buffname}%`);

          if (error || !data || data.length === 0) {
            return await interaction.editReply({
              content: "Data buff gagal dimuat atau database kosong."
            });
          }


          const buffEmbeds = data.map((item) => {
            return new EmbedBuilder()
              .setColor(color.blurple)
              .setTitle(item.name || "Unknown Buff")
              .setDescription(`\`\`\`\n${item.code || "No Code"}\n\`\`\``)
              .setTimestamp()
              .setFooter({ text: "Neura Sama" });
          });

          await interaction.editReply({
            embeds: buffEmbeds.slice(0, 10)
          });

        } catch (error) {
          console.error("Error pada perintah buff:", error.message);

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply("Terjadi kesalahan teknis saat memproses data buff.");
          }
        }
        break;
      }
      case "xtal": {
        try {
          await interaction.deferReply();

          const xtalName = interaction.options.getString("name");
          const { data, error } = await supabase
            .from("xtall")
            .select("name, type, upgrade, route, stat")
            .ilike("name", `%${xtalName}%`)
            .limit(10);

          if (error || !data || data.length === 0) {
            return await interaction.editReply({ content: "Data Crysta tidak ditemukan." });
          }

          const messageXtal = data.map((item) => {
            let rawStat = item.stat || "Tidak ada data statistik.";
            if (rawStat.length > 1000) rawStat = rawStat.substring(0, 1000) + "...";

            return new EmbedBuilder()
              .setColor(color.gold)
              .setTitle(`${item.name}`)
              .addFields([
                { name: "Tipe", value: item.type || "-", inline: true },
                { name: "Upgrade", value: item.upgrade || "Bukan Upgrade", inline: true },
                { name: "Route", value: item.route || "-", inline: false },
                { name: "Stat", value: `${rawStat}` }
              ])
              .setDescription("Hubungi owner jika ada bug data.")
              .setFooter({ text: "Neura Sama" })
              .setTimestamp();
          });

          await interaction.editReply({ embeds: messageXtal });

        } catch (err) {
          console.error("Error Xtal:", err.message);

          const errorMsg = "Terjadi kesalahan teknis saat memproses data Crysta.";
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(errorMsg);
          } else {
            await interaction.reply({ content: errorMsg, ephemeral: true });
          }
        }
        break;
      }
      case "lv": {
        await interaction.deferReply();
        const userLv = interaction.options.getString("level");

        try {
          const data = await lv(userLv);

          if (data.length === 0) {
            return interaction.editReply("Tidak ada saran leveling ditemukan.");
          }

          const bosses = data.filter(item => item.category === "Boss");
          const miniBosses = data.filter(item => item.category === "Mini Boss");
          const combined = [...bosses.slice(0, 20), ...miniBosses.slice(0, 10)];

          const levelingEmbeds = `
your level ${userLv}
*Rekomendasi*
${combined.map((item) => {
            return `[${item.category}] ${item.name} - ${item.exp} (${item.location})`
          }).join('\n')}
`.trim()

          await interaction.editReply({ content: levelingEmbeds });

        } catch (error) {
          console.error("Error in lv command:", error);
          await interaction.editReply("Gagal mengambil data leveling");
        }
        break;
      }

      default:
        await interaction.reply({ content: "Perintah tidak dikenal.", ephemeral: true });
    }

  } catch (error) {
    console.error(`Error pada perintah ${commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Terjadi kesalahan internal.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Terjadi kesalahan internal.", ephemeral: true });
    }
  }
});

app.login(process.env.TOKEN);
