import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import axios from "axios";

import { color } from "../config/color.js";

export default {
  name: "ava",

  data: new SlashCommandBuilder()
    .setName("ava")
    .setDescription(
      "view latest avatar banners",
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const { data } = await axios.get(
        "https://neurapi.mochinime.cyou/api/toram/ava",
      );

      const banners =
        data?.result?.data || [];

      if (!banners.length) {
        return interaction.editReply(
          "avatar banner not found",
        );
      }

      let currentPage = 0;

      const totalPages =
        banners.length;

      const buildEmbed = (page) => {
        const item =
          banners[page];

        return new EmbedBuilder()
          .setColor(color.dark)

          .setTitle(
            item.name.slice(0, 256),
          )

          .setImage(item.image)

          .setFooter({
            text:
              `${item.date} • Page ${page + 1}/${totalPages}`,
          })

          .setTimestamp();
      };

      const buildButtons = (
        page,
      ) => {
        return [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("Prev")
              .setStyle(
                ButtonStyle.Secondary,
              )
              .setDisabled(
                page === 0,
              ),

            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Next")
              .setStyle(
                ButtonStyle.Secondary,
              )
              .setDisabled(
                page >=
                  totalPages - 1,
              ),
          ),
        ];
      };

      const msg =
        await interaction.editReply({
          embeds: [
            buildEmbed(
              currentPage,
            ),
          ],

          components:
            buildButtons(
              currentPage,
            ),
        });

      const collector =
        msg.createMessageComponentCollector({
          componentType:
            ComponentType.Button,

          time: 120000,
        });

      collector.on(
        "collect",
        async (i) => {
          if (
            i.user.id !==
            interaction.user.id
          ) {
            return i.reply({
              content:
                "this is not your menu",

              ephemeral: true,
            });
          }

          if (
            i.customId ===
            "prev"
          ) {
            currentPage--;
          }

          if (
            i.customId ===
            "next"
          ) {
            currentPage++;
          }

          await i.update({
            embeds: [
              buildEmbed(
                currentPage,
              ),
            ],

            components:
              buildButtons(
                currentPage,
              ),
          });
        },
      );

      collector.on(
        "end",
        async () => {
          await interaction
            .editReply({
              components: [],
            })
            .catch(() => {});
        },
      );
    } catch (err) {
      console.log(err);

      if (
        interaction.deferred ||
        interaction.replied
      ) {
        await interaction.editReply(
          "an error occurred",
        );
      }
    }
  },
};
