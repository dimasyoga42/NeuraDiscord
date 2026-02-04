import fetch from "node-fetch"
import * as cheerio from "cheerio"

export const lv = async (currentLv) => {
  try {
    if (!currentLv || isNaN(currentLv)) {
      throw new Error("Invalid level input")
    }

    const res = await fetch(
      `https://coryn.club/leveling.php?lv=${encodeURIComponent(currentLv)}&gap=7&bonusEXP=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    )

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`)
    }

    const html = await res.text()
    const $ = cheerio.load(html)
    const result = []

    $(".table-grid.item-leveling").each((_, table) => {
      const title = $(table).find("h3").text().trim()

      if (title === "Boss" || title === "Mini Boss") {
        $(table).find(".level-row").each((__, row) => {
          const level = $(row).find(".level-col-1 b").text().trim()
          const name = $(row).find(".level-col-2 b a").text().trim()
          const loc = $(row).find(".level-col-2 p").eq(1).text().trim()
          const exp = $(row).find(".level-col-3 p b").first().text().trim()

          if (name && exp) {
            result.push({
              category: title,
              level,
              name,
              location: loc,
              exp
            })
          }
        })
      }
    })

    return result

  } catch (error) {
    console.error("Error fetching leveling data:", error.message)
    throw error
  }
}
