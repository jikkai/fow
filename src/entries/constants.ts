import type Tile from '@/entries/Tile'
import type Block from '@/entries/Block'

export const FILENAME_MASK1 = 'olhwjsktri'
export const FILENAME_MASK2 = 'eizxdwknmo'

export const MAP_WIDTH = 512
export const TILE_WIDTH_OFFSET = 7
export const TILE_WIDTH = 1 << TILE_WIDTH_OFFSET
export const TILE_HEADER_LEN = TILE_WIDTH ** 2
export const TILE_HEADER_SIZE = TILE_HEADER_LEN * 2
export const BLOCK_BITMAP_SIZE = 512
export const BLOCK_EXTRA_DATA = 3
export const BLOCK_SIZE = BLOCK_BITMAP_SIZE + BLOCK_EXTRA_DATA
export const BITMAP_WIDTH_OFFSET = 6
export const BITMAP_WIDTH = 1 << BITMAP_WIDTH_OFFSET
export const ALL_OFFSET = TILE_WIDTH_OFFSET + BITMAP_WIDTH_OFFSET

export type TileID = number
export type XYKey = string
export interface Tiles {
  [key: XYKey]: Tile
}
export interface Blocks {
  [key: XYKey]: Block
}
