export default class Bbox {
  west: number
  south: number
  east: number
  north: number

  constructor(west: number, south: number, east: number, north: number) {
    this.west = west
    this.south = south
    this.east = east
    this.north = north
  }
}
