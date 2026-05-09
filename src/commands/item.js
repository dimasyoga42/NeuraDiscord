import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { supabase } from "../db/supabase";

function formatEffects(effects) {
  if (!effects) return "-";

  const cleaned = effects
    .split("|")
    .map((v) => v.trim())
    .filter((v) => v && !v.toLowerCase().includes("amount"));

  const priority = [];
  const normal = [];

  for (const stat of cleaned) {
    if (stat.toLowerCase().includes("base def")) {
      priority.push(stat);
    } else {
      normal.push(stat);
    }
  }

  return [...priority, ...normal]
    .map((v) => `• ${v}`)
    .join("\n")
    .slice(0, 1024);
}

export default {
  name: "item",

  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("search item toram")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("masukan nama item")
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString("name");
    const data = await supabase
      .from("item_v2")
      .select("*")
      .ilike("name", `%${query}%`);
    const emb = new EmbedBuilder()
      .setTitle("item search")
      .setTimestamp()
      .setFields(
        data.data.map((item) => ({
          name: item.ItemName,
          value: `Stat:\n${formatEffects(item.effects)}\nDuration:\n- ${item.Duration}\nProcess:\n- ${item.Process}\nobtained From:\n- ${item.ObtainedFrom}`,
        })),
      );
    await interaction.EditReplay({
      embeds: [emb],
    });
  },
};
