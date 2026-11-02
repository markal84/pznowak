/**
 * Zrzut z telefonu (np. obraz od Kamili) bez czarnych pasów: wzorzec koloru albo gotowy obraz wariantu (zlecenie W).
 *
 *   node --import=tsx/esm scripts/przytnij-zrzut.ts <wejście.png> <wyjście.jpg|.webp> [--4x5] [--szerokosc 1080]
 *
 * `--4x5` przycina środek do proporcji galerii jak obrazy Aion z V; `.webp` mieści się w 300 KB.
 */
import { trimScreenshot } from './wizualizacje-w-obraz'

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !/^\d+$/.test(a))
if (!input || !output) throw new Error('użycie: przytnij-zrzut.ts <wejście> <wyjście> [--4x5] [--szerokosc N]')
const widthArg = process.argv.indexOf('--szerokosc')
await trimScreenshot(input, output, {
  aspect: process.argv.includes('--4x5') ? 4 / 5 : undefined,
  width: widthArg > 0 ? Number(process.argv[widthArg + 1]) : undefined,
})
console.log('zapisano', output)
