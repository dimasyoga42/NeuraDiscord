import fetch from "node-fetch"
import * as cheerio from "cheerio"

export const lv = async (currentLv) => {
  try {
    const res = await fetch(`https://coryn.club/leveling.php?lv=${encodeURIComponent(currentLv)}&gap=7&bonusEXP=0`)

    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

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
              level,
              name,
              loc,
              exp
            })
          }
        })
      }
    })

    return result
  } catch (error) {
    console.log(error.message)
    return []
  }
}
