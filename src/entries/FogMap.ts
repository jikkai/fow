import JSZip from 'jszip'
import Bbox from '@/entries/Bbox'
import Tile from '@/entries/Tile'
import { makeKeyXY } from '@/utils/helpers'
import { type Tiles, ALL_OFFSET, TILE_WIDTH, BITMAP_WIDTH } from './constants'

// TODO: figure out a better way to imeplement immutable data structure
//       we encountered performance issue when using `immutable.js`

// SAD: Type Aliases do not seem to give us type safety


export default class FogMap {
  readonly tiles: Tiles
  static empty = new FogMap({})

  private constructor(tiles: Tiles) {
    Object.freeze(tiles)
    this.tiles = tiles
  }

  static async createFromTiles(tiles: Tiles): Promise<FogMap> {
    const mutableTiles = Object.keys(tiles).reduce((acc, key) => {
      acc[key] = Tile.createFromExisting(tiles[key])
      return acc
    }, {} as Tiles)
    return new FogMap(mutableTiles)
  }

  static createFromFiles(files: [string, ArrayBuffer][]): FogMap {
    if (files.length === 0) {
      return FogMap.empty
    }
    const mutableTiles = { ...FogMap.empty.tiles }
    files.forEach(([filename, data]) => {
      try {
        const tile = Tile.create(filename, data)
        // just in case the imported data doesn't hold this invariant
        if (Object.entries(tile.blocks).length !== 0) {
          mutableTiles[makeKeyXY(tile.x, tile.y)] = tile
        }
      } catch (e) {
        // TODO: handle error properly
        console.log(`${filename} is not a valid tile file.`)
        console.log(e)
      }
    })
    return new FogMap(mutableTiles)
  }

  async exportArchive(): Promise<Blob | null> {
    const zip = new JSZip()
    const syncZip = zip.folder('Sync')
    if (!syncZip) {
      // TODO: handle error
      console.log('unable to create archive')
      return null
    }
    Object.values(this.tiles).forEach((tile) => {
      // just in case
      if (Object.entries(tile.blocks).length !== 0) {
        syncZip.file('Sync/' + tile.filename, tile.dump())
      }
    })
    return syncZip.generateAsync({ type: 'blob' })
  }

  static LngLatToGlobalXY(lng: number, lat: number): number[] {
    const x = ((lng + 180) / 360) * 512
    const y =
      ((Math.PI - Math.asinh(Math.tan((lat / 180) * Math.PI))) * 512) /
      (2 * Math.PI)
    const xg = Math.floor(x * TILE_WIDTH * BITMAP_WIDTH)
    const yg = Math.floor(y * TILE_WIDTH * BITMAP_WIDTH)
    return [xg, yg]
  }

  addLine(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number
  ): FogMap {
    console.log(`[${startLng},${startLat}] to [${endLng},${endLat}]`)
    const [x0, y0] = FogMap.LngLatToGlobalXY(startLng, startLat)
    const [x1, y1] = FogMap.LngLatToGlobalXY(endLng, endLat)

    let mutableTiles: Tiles | null = null

    // Iterators, counters required by algorithm
    let x, y, px, py, xe, ye
    // Calculate line deltas
    const dx = x1 - x0
    const dy = y1 - y0
    // Create a positive copy of deltas (makes iterating easier)
    const dx0 = Math.abs(dx)
    const dy0 = Math.abs(dy)
    // Calculate error intervals for both axis
    px = 2 * dy0 - dx0
    py = 2 * dx0 - dy0
    // The line is X-axis dominant
    if (dy0 <= dx0) {
      // Line is drawn left to right
      if (dx >= 0) {
        x = x0
        y = y0
        xe = x1
      } else {
        // Line is drawn right to left (swap ends)
        x = x1
        y = y1
        xe = x0
      }
      while (x < xe) {
        const [tileX, tileY] = [x >> ALL_OFFSET, y >> ALL_OFFSET]
        const key = makeKeyXY(tileX, tileY)
        let tile = this.tiles[key]
        if (!tile) {
          tile = Tile.createEmptyTile(tileX, tileY)
        }
        if (tile) {
          console.log(`tile draw: tileX: ${tileX}, tileY: ${tileY}`)
          let newTile
          ;[newTile, x, y, px] = tile.addLine(
            x - (tileX << ALL_OFFSET),
            y - (tileY << ALL_OFFSET),
            xe - (tileX << ALL_OFFSET),
            px,
            dx0,
            dy0,
            true,
            (dx < 0 && dy < 0) || (dx > 0 && dy > 0)
          )
          x += tileX << ALL_OFFSET
          y += tileY << ALL_OFFSET

          if (tile !== newTile) {
            if (!mutableTiles) {
              mutableTiles = { ...this.tiles }
            }
            if (newTile) {
              mutableTiles[key] = newTile
            } else {
              delete mutableTiles[key]
            }
          }
        }
      }
    } else {
      // The line is Y-axis dominant
      // // Line is drawn bottom to top
      if (dy >= 0) {
        x = x0
        y = y0
        ye = y1
      } else {
        // Line is drawn top to bottom
        x = x1
        y = y1
        ye = y0
      }

      while (y < ye) {
        const [tileX, tileY] = [x >> ALL_OFFSET, y >> ALL_OFFSET]
        const key = makeKeyXY(tileX, tileY)
        let tile = this.tiles[key]
        if (!tile) {
          tile = Tile.createEmptyTile(tileX, tileY)
        }
        if (tile) {
          console.log(`tile draw: tileX: ${tileX}, tileY: ${tileY}`)
          let newTile
          ;[newTile, x, y, py] = tile.addLine(
            x - (tileX << ALL_OFFSET),
            y - (tileY << ALL_OFFSET),
            ye - (tileY << ALL_OFFSET),
            py,
            dx0,
            dy0,
            false,
            (dx < 0 && dy < 0) || (dx > 0 && dy > 0)
          )
          x += tileX << ALL_OFFSET
          y += tileY << ALL_OFFSET

          if (tile !== newTile) {
            if (!mutableTiles) {
              mutableTiles = { ...this.tiles }
            }
            if (newTile) {
              mutableTiles[key] = newTile
            } else {
              delete mutableTiles[key]
            }
          }
        }
      }
    }
    if (mutableTiles) {
      return new FogMap(mutableTiles)
    } else {
      return this
    }
  }

  // we only provide interface for clearing a bbox, because we think it make no sense to add paths for whole bbox
  clearBbox(bbox: Bbox): FogMap {
    const nw = Tile.LngLatToXY(bbox.west, bbox.north)
    const se = Tile.LngLatToXY(bbox.east, bbox.south)

    const xMin = nw[0]
    const xMax = se[0]
    const yMin = nw[1]
    const yMax = se[1]
    // TODO: what if lng=0

    const xMinInt = Math.floor(xMin)
    const xMaxInt = Math.floor(xMax)
    const yMinInt = Math.floor(yMin)
    const yMaxInt = Math.floor(yMax)

    let mutableTiles: Tiles | null = null

    for (let x = xMinInt; x <= xMaxInt; x++) {
      for (let y = yMinInt; y <= yMaxInt; y++) {
        const key = makeKeyXY(x, y)
        const tile = this.tiles[key]
        if (tile) {
          const xp0 = Math.max(xMin - tile.x, 0) * TILE_WIDTH
          const yp0 = Math.max(yMin - tile.y, 0) * TILE_WIDTH
          const xp1 = Math.min(xMax - tile.x, 1) * TILE_WIDTH
          const yp1 = Math.min(yMax - tile.y, 1) * TILE_WIDTH
          const newTile = tile.clearRect(xp0, yp0, xp1 - xp0, yp1 - yp0)

          if (tile !== newTile) {
            if (!mutableTiles) {
              mutableTiles = { ...this.tiles }
            }
            if (newTile) {
              mutableTiles[key] = newTile
            } else {
              delete mutableTiles[key]
            }
          }
        }
      }
    }
    if (mutableTiles) {
      return new FogMap(mutableTiles)
    } else {
      return this
    }
  }
}
