import { BLOCK_BITMAP_SIZE, BLOCK_EXTRA_DATA, BLOCK_SIZE, BITMAP_WIDTH } from './constants'

export default class Block {
  readonly x: number
  readonly y: number
  readonly bitmap: Uint8Array
  readonly extraData: Uint8Array

  private constructor(
    x: number,
    y: number,
    bitmap: Uint8Array,
    extraData: Uint8Array
  ) {
    this.x = x
    this.y = y
    this.bitmap = bitmap
    this.extraData = extraData
  }

  static createFromExisting(block: Block): Block {
    return new Block(block.x, block.y, block.bitmap, block.extraData)
  }

  static create(x: number, y: number, data: Uint8Array | null): Block {
    if (data) {
      const bitmap = data.slice(0, BLOCK_BITMAP_SIZE)
      const extraData = data.slice(BLOCK_BITMAP_SIZE, BLOCK_SIZE)
      return new Block(x, y, bitmap, extraData)
    } else {
      const bitmap = new Uint8Array(BLOCK_BITMAP_SIZE)
      const extraData = new Uint8Array(BLOCK_EXTRA_DATA)
      // FIXME: correct the extraData
      return new Block(x, y, bitmap, extraData)
    }
  }

  check(): boolean {
    let count = 0
    for (let i = 0; i < BITMAP_WIDTH; i++) {
      for (let j = 0; j < BITMAP_WIDTH; j++) {
        if (this.isVisited(i, j)) {
          count++
        }
      }
    }

    const isCorrect = count === this.count()
    if (!isCorrect) {
      console.warn('block check sum error!')
    }
    return isCorrect
  }

  dump(): Uint8Array {
    const data = new Uint8Array(BLOCK_SIZE)

    let count = 0
    for (let i = 0; i < BITMAP_WIDTH; i++) {
      for (let j = 0; j < BITMAP_WIDTH; j++) {
        if (this.isVisited(i, j)) {
          count++
        }
      }
    }
    const checksumDataview = new DataView(this.extraData.buffer, 1, 2)
    checksumDataview.setUint16(
      0,
      (checksumDataview.getUint16(0, false) & 0xc000) | ((count << 1) + 1),
      false
    )

    data.set(this.bitmap)
    data.set(this.extraData, BLOCK_BITMAP_SIZE)

    return data
  }

  region(): string {
    const regionChar0 = String.fromCharCode(
      (this.extraData[0] >> 3) + '?'.charCodeAt(0)
    )
    const regionChar1 = String.fromCharCode(
      (((this.extraData[0] & 0x7) << 2) | ((this.extraData[1] & 0xc0) >> 6)) +
        '?'.charCodeAt(0)
    )
    return regionChar0 + regionChar1
  }

  count(): number {
    return (
      (new DataView(this.extraData.buffer, 1, 2).getUint16(0, false) &
        0x3fff) >>
      1
    )
  }

  isVisited(x: number, y: number): boolean {
    const bitOffset = 7 - (x % 8)
    const i = Math.floor(x / 8)
    const j = y
    return (this.bitmap[i + j * 8] & (1 << bitOffset)) !== 0
  }

  private static setPoint(
    mutableBitmap: Uint8Array,
    x: number,
    y: number,
    val: boolean
  ): void {
    const bitOffset = 7 - (x % 8)
    const i = Math.floor(x / 8)
    const j = y
    const valNumber = val ? 1 : 0
    mutableBitmap[i + j * 8] =
      (mutableBitmap[i + j * 8] & ~(1 << bitOffset)) | (valNumber << bitOffset)
  }

  private static bitmapEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) {
      return false
    }
    for (let i = 0; i != a.byteLength; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  // a modified Bresenham algorithm with initialized error from upper layer
  addLine(
    x: number,
    y: number,
    e: number,
    p: number,
    dx0: number,
    dy0: number,
    xaxis: boolean,
    quadrants13: boolean
  ): [Block, number, number, number] {
    const mutableBitmap = new Uint8Array(this.bitmap)
    console.log(`subblock draw: x:${x}, y:${y}, e:${e}`)
    // Draw the first pixel
    Block.setPoint(mutableBitmap, x, y, true)
    if (xaxis) {
      // Rasterize the line
      for (let i = 0; x < e; i++) {
        x = x + 1
        // Deal with octants...
        if (p < 0) {
          p = p + 2 * dy0
        } else {
          if (quadrants13) {
            y = y + 1
          } else {
            y = y - 1
          }
          p = p + 2 * (dy0 - dx0)
        }

        if (x >= BITMAP_WIDTH || y < 0 || y >= BITMAP_WIDTH) {
          break
        }
        // Draw pixel from line span at
        // currently rasterized position
        Block.setPoint(mutableBitmap, x, y, true)
      }
    } else {
      // The line is Y-axis dominant
      // Rasterize the line
      for (let i = 0; y < e; i++) {
        y = y + 1
        // Deal with octants...
        if (p <= 0) {
          p = p + 2 * dx0
        } else {
          if (quadrants13) {
            x = x + 1
          } else {
            x = x - 1
          }
          p = p + 2 * (dx0 - dy0)
        }

        if (y >= BITMAP_WIDTH || x < 0 || x >= BITMAP_WIDTH) {
          break
        }
        // Draw pixel from line span at
        // currently rasterized position
        Block.setPoint(mutableBitmap, x, y, true)
      }
    }
    if (Block.bitmapEqual(mutableBitmap, this.bitmap)) {
      return [this, x, y, p]
    } else {
      return [new Block(this.x, this.y, mutableBitmap, this.extraData), x, y, p]
    }
  }

  clearRect(x: number, y: number, width: number, height: number): Block | null {
    const mutableBitmap = new Uint8Array(this.bitmap)

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        Block.setPoint(mutableBitmap, x + i, y + j, false)
      }
    }
    if (mutableBitmap.every((v) => v === 0)) {
      return null
    }
    if (Block.bitmapEqual(mutableBitmap, this.bitmap)) {
      return this
    } else {
      return new Block(this.x, this.y, mutableBitmap, this.extraData)
    }
  }
}
