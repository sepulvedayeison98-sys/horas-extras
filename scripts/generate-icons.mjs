/**
 * Genera los iconos PNG de la PWA a partir de un SVG, sin dependencias externas.
 * Usa el módulo nativo de Node para rasterizar vía canvas si está disponible;
 * si no, escribe PNGs mínimos de color sólido con el glifo. Ejecuta: npm run icons
 *
 * Para simplicidad y cero dependencias, aquí generamos PNGs de color sólido
 * con las dimensiones correctas. Reemplázalos por tu arte si lo deseas.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const OUT = new URL('../public/icons/', import.meta.url)
mkdirSync(OUT, { recursive: true })

// Color de marca (indigo) de fondo
const BG = [79, 70, 229]

/** Construye un PNG RGBA de color sólido de tamaño size×size */
function solidPng(size, [r, g, b]) {
  const bytesPerPixel = 4
  const rowLen = size * bytesPerPixel + 1 // +1 filtro por fila
  const raw = Buffer.alloc(rowLen * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowLen
    raw[rowStart] = 0 // filtro None
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * bytesPerPixel
      // Círculo central más claro para dar un mínimo de identidad visual
      const dx = x - size / 2
      const dy = y - size / 2
      const inner = Math.sqrt(dx * dx + dy * dy) < size * 0.26
      raw[p] = inner ? 255 : r
      raw[p + 1] = inner ? 255 : g
      raw[p + 2] = inner ? 255 : b
      raw[p + 3] = 255
    }
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0)
    return Buffer.concat([len, typeBuf, data, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// CRC32 para chunks PNG
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of targets) {
  writeFileSync(new URL(name, OUT), solidPng(size, BG))
  console.log('icono generado:', name)
}
