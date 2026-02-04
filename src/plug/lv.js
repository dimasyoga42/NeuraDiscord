import fetch from "node-fetch"
import * as cheerio from "cheerio"

export const lv = async (currentLv) => {
  try {
    // Validasi input
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

    $(".table-grid").each((_, table) => {
      const title = $(table).find("h3").text().trim()

      if (title === "Boss" || title === "Mini Boss") {
        $(table).find("li").each((__, row) => {
          const level = $(row).find(".level-col-1").text().replace("Lv", "").trim()
          const name = $(row).find(".level-col-2 a").text().trim()
          const loc = $(row).find(".level-col-2 p").last().text().trim()
          const exp = $(row).find(".level-col-3").text().replace("EXP", "").trim()

          if (name) {
            result.push({
              category: title,
              level: parseInt(level) || level,
              name,
              location: loc,
              exp: parseInt(exp.replace(/,/g, "")) || exp
            })
          }
        })
      }
    })

    return result

  } catch (error) {
    console.error("Error fetching leveling data:", error.message)
    return []
  }
}
