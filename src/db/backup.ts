import Dexie, { type Table } from 'dexie'
import { type Tiles } from '@/entries/constants'

export interface ITrack {
  id?: number
  tiles: Tiles
}

class BackupTrackDatabase extends Dexie {
  public track!: Table<ITrack, number> // id is number in this case

  public constructor() {
    super('BackupTrackDatabase')
    this.version(1).stores({
      track: '++id, tiles'
    })
  }
}

const db = new BackupTrackDatabase()
  
export async function save (track: { tiles: Tiles }) {
  await db.track.clear()

  return await db.track.add({
    tiles: track.tiles
  })
}

export async function getAll () {
  const tracks = await db.track.toArray()
  return (tracks ?? [])[0]
}
