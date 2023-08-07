import pako from 'pako'
import { Md5 } from 'ts-md5'
import Bbox from '@/entries/Bbox'
import Block from '@/entries/Block'
import { makeKeyXY } from '@/utils/helpers'
import { type Blocks, type TileID, FILENAME_MASK1, FILENAME_MASK2, MAP_WIDTH, BITMAP_WIDTH, BITMAP_WIDTH_OFFSET, TILE_HEADER_SIZE, TILE_WIDTH, BLOCK_SIZE } from './constants'

const FILENAME_ENCODING = FILENAME_MASK1.split('').reduce(
  (acc, cur, idx) => {
    acc[cur] = idx
    return acc
  },
  {} as { [key: string]: number }
)

export default class Tile {
  readonly filename: string
  readonly id: TileID
  readonly x: number
  readonly y: number
  readonly blocks: Blocks

  private constructor(
    filename: string,
    id: TileID,
    x: number,
    y: number,
    blocks: Blocks
  ) {
    Object.freeze(blocks)
    this.filename = filename
    this.id = id
    this.x = x
    this.y = y
    this.blocks = blocks
  }

  static createEmptyTile(x: number, y: number): Tile {
    const id = y * MAP_WIDTH + x
    console.log(`Creating tile. id: ${id}, x: ${x}, y: ${y}`)

    const digits = id.toString().split('').map(Number)
    const name0 = Md5.hashStr(id.toString()).substring(0, 4)
    const name1 = digits.map((d) => FILENAME_MASK1.charAt(d)).join('')
    const name2 = digits.map((d) => FILENAME_MASK2.charAt(d)).join('')
    const filename = `${name0}${name1}${name2.substring(name2.length - 2)}`

    const blocks = {} as Blocks

    return new Tile(filename, id, x, y, blocks)
  }

  static createFromExisting(tile: Tile): Tile {
    const { filename, id, x, y, blocks } = tile

    const newBlocks = Object.keys(blocks).reduce((acc, key) => {
      acc[key] = Block.createFromExisting(blocks[key])
      acc[key].check()
      return acc
    }, {} as Blocks)

    return new Tile(filename, id, x, y, newBlocks)
  }

  static create(filename: string, data: ArrayBuffer): Tile {
    // TODO: try catch
    const id = Number.parseInt(
      filename
        .slice(4, -2)
        .split('')
        .map((idMasked) => FILENAME_ENCODING[idMasked])
        .join('')
    )
    const x = id % MAP_WIDTH
    const y = Math.floor(id / MAP_WIDTH)

    console.log(`Loading tile. id: ${id}, x: ${x}, y: ${y}`)

    // TODO: try catch
    const actualData = pako.inflate(new Uint8Array(data))

    const header = new Uint16Array(actualData.slice(0, TILE_HEADER_SIZE).buffer)

    const blocks = {} as Blocks

    for (let i = 0; i < header.length; i++) {
      const blockIdx = header[i]
      if (blockIdx > 0) {
        const blockX = i % TILE_WIDTH
        const blockY = Math.floor(i / TILE_WIDTH)
        const startOffset = TILE_HEADER_SIZE + (blockIdx - 1) * BLOCK_SIZE
        const endOffset = startOffset + BLOCK_SIZE
        const blockData = actualData.slice(startOffset, endOffset)
        const block = Block.create(blockX, blockY, blockData)
        block.check()
        blocks[makeKeyXY(blockX, blockY)] = block
      }
    }
    return new Tile(filename, id, x, y, blocks)
  }

  dump(): Uint8Array {
    const header = new Uint8Array(TILE_HEADER_SIZE)
    const headerView = new DataView(header.buffer, 0, TILE_HEADER_SIZE)

    const blockDataSize = BLOCK_SIZE * Object.entries(this.blocks).length

    const blockData = new Uint8Array(blockDataSize)

    let activeBlockIdx = 1
    Object.values(this.blocks)
      .map((block) => {
        const i = block.x + block.y * TILE_WIDTH
        return [i, block] as [number, Block]
      })
      .sort((a, b) => {
        return a[0] - b[0]
      })
      .forEach(([i, block]) => {
        headerView.setUint16(i * 2, activeBlockIdx, true)
        blockData.set(block.dump(), (activeBlockIdx - 1) * BLOCK_SIZE)
        activeBlockIdx++
      })

    const data = new Uint8Array(TILE_HEADER_SIZE + blockDataSize)
    data.set(header)
    data.set(blockData, TILE_HEADER_SIZE)

    return pako.deflate(data)
  }

  static XYToLngLat(x: number, y: number): number[] {
    const lng = (x / 512) * 360 - 180
    const lat =
      (Math.atan(Math.sinh(Math.PI - (2 * Math.PI * y) / 512)) * 180) / Math.PI
    return [lng, lat]
  }

  static LngLatToXY(lng: number, lat: number): number[] {
    const x = ((lng + 180) / 360) * 512
    const y =
      ((Math.PI - Math.asinh(Math.tan((lat / 180) * Math.PI))) * 512) /
      (2 * Math.PI)
    return [x, y]
  }

  bounds(): number[][] {
    const sw = Tile.XYToLngLat(this.x, this.y + 1)
    const se = Tile.XYToLngLat(this.x + 1, this.y + 1)
    const ne = Tile.XYToLngLat(this.x + 1, this.y)
    const nw = Tile.XYToLngLat(this.x, this.y)
    return [nw, ne, se, sw]
  }

  bbox(): Bbox {
    const [west, south] = Tile.XYToLngLat(this.x, this.y + 1)
    const [east, north] = Tile.XYToLngLat(this.x + 1, this.y)
    const bbox = new Bbox(west, south, east, north)
    return bbox
  }

  addLine(
    x: number,
    y: number,
    e: number,
    p: number,
    dx0: number,
    dy0: number,
    xaxis: boolean,
    quadrants13: boolean
  ): [Tile | null, number, number, number] {
    let mutableBlocks: Blocks | null = null
    if (xaxis) {
      // Rasterize the line
      for (let i = 0; x < e; i++) {
        if (
          x >> BITMAP_WIDTH_OFFSET >= TILE_WIDTH ||
          y >> BITMAP_WIDTH_OFFSET < 0 ||
          y >> BITMAP_WIDTH_OFFSET >= TILE_WIDTH
        ) {
          break
        }
        const blockX = x >> BITMAP_WIDTH_OFFSET
        const blockY = y >> BITMAP_WIDTH_OFFSET
        const key = makeKeyXY(blockX, blockY)
        let block = this.blocks[key]
        if (!block) {
          block = Block.create(blockX, blockY, null)
        }
        if (block) {
          console.log(
            `block draw: blockx: ${blockX}, blocky: ${blockY} x: ${x}, y: ${y}`
          )
          let newBlock
          ;[newBlock, x, y, p] = block.addLine(
            x - (blockX << BITMAP_WIDTH_OFFSET),
            y - (blockY << BITMAP_WIDTH_OFFSET),
            e - (blockX << BITMAP_WIDTH_OFFSET),
            p,
            dx0,
            dy0,
            xaxis,
            quadrants13
          )

          x += blockX << BITMAP_WIDTH_OFFSET
          y += blockY << BITMAP_WIDTH_OFFSET

          if (newBlock !== block) {
            if (!mutableBlocks) {
              mutableBlocks = { ...this.blocks }
            }
            if (newBlock) {
              mutableBlocks[key] = newBlock
            } else {
              delete mutableBlocks[key] // TODO: this is impossible since we are adding tracks?
            }
          }
        }
      }
    } else {
      // Rasterize the line
      for (let i = 0; y < e; i++) {
        if (
          y >> BITMAP_WIDTH_OFFSET >= TILE_WIDTH ||
          x >> BITMAP_WIDTH_OFFSET < 0 ||
          x >> BITMAP_WIDTH_OFFSET >= TILE_WIDTH
        ) {
          break
        }
        const blockX = x >> BITMAP_WIDTH_OFFSET
        const blockY = y >> BITMAP_WIDTH_OFFSET
        const key = makeKeyXY(blockX, blockY)
        let block = this.blocks[key]
        if (!block) {
          block = Block.create(blockX, blockY, null)
        }
        if (block) {
          console.log(
            `block draw: blockx: ${blockX}, blocky: ${blockY} x: ${x}, y: ${y}`
          )
          let newBlock
          ;[newBlock, x, y, p] = block.addLine(
            x - (blockX << BITMAP_WIDTH_OFFSET),
            y - (blockY << BITMAP_WIDTH_OFFSET),
            e - (blockY << BITMAP_WIDTH_OFFSET),
            p,
            dx0,
            dy0,
            xaxis,
            quadrants13
          )

          x += blockX << BITMAP_WIDTH_OFFSET
          y += blockY << BITMAP_WIDTH_OFFSET

          if (newBlock !== block) {
            if (!mutableBlocks) {
              mutableBlocks = { ...this.blocks }
            }
            if (newBlock) {
              mutableBlocks[key] = newBlock
            } else {
              delete mutableBlocks[key] // TODO: this is impossible since we are adding tracks?
            }
          }
        }
      }
    }

    // Immutable.js avoids creating new objects for updates where no change in value occurred
    if (mutableBlocks) {
      if (Object.entries(mutableBlocks).length === 0) {
        return [null, x, y, p]
      } else {
        console.log('return updated tile')
        Object.freeze(mutableBlocks)
        return [
          new Tile(this.filename, this.id, this.x, this.y, mutableBlocks),
          x,
          y,
          p
        ]
      }
    } else {
      return [this, x, y, p]
    }
  }

  clearRect(x: number, y: number, width: number, height: number): Tile | null {
    const xMin = x
    const yMin = y
    const xMax = x + width
    const yMax = y + height

    const xMinInt = Math.floor(xMin)
    const xMaxInt = Math.floor(xMax)

    const yMinInt = Math.floor(yMin)
    const yMaxInt = Math.floor(yMax)

    let mutableBlocks: Blocks | null = null

    for (let x = xMinInt; x <= xMaxInt; x++) {
      for (let y = yMinInt; y <= yMaxInt; y++) {
        const key = makeKeyXY(x, y)
        const block = this.blocks[key]
        if (block) {
          const xp0 = Math.round(Math.max(xMin - block.x, 0) * BITMAP_WIDTH)
          const yp0 = Math.round(Math.max(yMin - block.y, 0) * BITMAP_WIDTH)
          const xp1 = Math.round(Math.min(xMax - block.x, 1) * BITMAP_WIDTH)
          const yp1 = Math.round(Math.min(yMax - block.y, 1) * BITMAP_WIDTH)
          const newBlock = block.clearRect(xp0, yp0, xp1 - xp0, yp1 - yp0)

          if (newBlock !== block) {
            if (!mutableBlocks) {
              mutableBlocks = { ...this.blocks }
            }
            if (newBlock) {
              mutableBlocks[key] = newBlock
            } else {
              delete mutableBlocks[key]
            }
          }
        }
      }
    }

    // Immutable.js avoids creating new objects for updates where no change in value occurred
    if (mutableBlocks) {
      if (Object.entries(mutableBlocks).length === 0) {
        return null
      } else {
        Object.freeze(mutableBlocks)
        return new Tile(this.filename, this.id, this.x, this.y, mutableBlocks)
      }
    } else {
      return this
    }
  }
}
