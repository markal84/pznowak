/**
 * Jednorazowe wygenerowanie statycznej mapy pracowni dla strony „Kontakt” (zlecenie J, pkt 4a):
 *
 *   npx tsx scripts/generate-contact-map.ts
 *
 * Skleja kafelki OpenStreetMap wokół pracowni, rysuje pinezkę i podpis źródła, zapisuje `public/mapa-pracowni.webp`.
 * Strona nie odpytuje potem żadnego zewnętrznego serwera i nie ustawia ciasteczek. Skrypt uruchamiamy tylko po
 * zmianie adresu pracowni (kilkadziesiąt kafelków naraz, zgodnie z zasadami https://operations.osmfoundation.org/policies/tiles/).
 * Dane mapy: © współtwórcy OpenStreetMap, licencja ODbL (podpis jest wpisany w obraz).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'

// Kilińskiego 12, Busko-Zdrój (Nominatim, budynek OSM way/967042970).
const LAT = 50.4700884
const LON = 20.7164823
const ZOOM = 17
const TILE = 256
const COLS = 7
const ROWS = 5
const WIDTH = 1200
const HEIGHT = 640
const UA = 'agent-local'

const n = 2 ** ZOOM
const worldX = ((LON + 180) / 360) * n * TILE
const latRad = (LAT * Math.PI) / 180
const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE

const firstTileX = Math.floor(worldX / TILE) - Math.floor(COLS / 2)
const firstTileY = Math.floor(worldY / TILE) - Math.floor(ROWS / 2)
const originX = firstTileX * TILE
const originY = firstTileY * TILE

async function tile(x: number, y: number): Promise<Buffer> {
  const response = await fetch(`https://tile.openstreetmap.org/${ZOOM}/${x}/${y}.png`, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`kafelek ${x}/${y}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const composites: OverlayOptions[] = []
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    composites.push({ input: await tile(firstTileX + col, firstTileY + row), left: col * TILE, top: row * TILE })
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}
const stitched = await sharp({
  create: { width: COLS * TILE, height: ROWS * TILE, channels: 3, background: '#e8e4da' },
})
  .composite(composites)
  .png()
  .toBuffer()

// Środek obrazu = pinezka.
const left = Math.round(worldX - originX - WIDTH / 2)
const top = Math.round(worldY - originY - HEIGHT / 2)
const cx = WIDTH / 2
const cy = HEIGHT / 2

const pin = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <ellipse cx="${cx}" cy="${cy}" rx="13" ry="5" fill="#000" opacity="0.28"/>
  <path d="M${cx} ${cy} C${cx - 34} ${cy - 34} ${cx - 30} ${cy - 76} ${cx} ${cy - 76} C${cx + 30} ${cy - 76} ${cx + 34} ${cy - 34} ${cx} ${cy} Z"
        fill="#b3261e" stroke="#ffffff" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy - 50}" r="11" fill="#ffffff"/>
  <rect x="${WIDTH - 214}" y="${HEIGHT - 26}" width="214" height="26" fill="#ffffff" opacity="0.85"/>
  <text x="${WIDTH - 8}" y="${HEIGHT - 8}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#333">© współtwórcy OpenStreetMap</text>
</svg>`

const out = path.resolve(import.meta.dirname, '../public/mapa-pracowni.webp')
await mkdir(path.dirname(out), { recursive: true })
const image = await sharp(stitched)
  .extract({ left, top, width: WIDTH, height: HEIGHT })
  .composite([{ input: Buffer.from(pin) }])
  .webp({ quality: 82 })
  .toBuffer()
await writeFile(out, image)
console.log(`Zapisano ${out} (${Math.round(image.length / 1024)} KB)`)
