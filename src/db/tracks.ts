import Dexie, { type Table } from 'dexie'
import { importDB, exportDB } from 'dexie-export-import'
import { download } from '@/utils/helpers'
import { type Tiles } from '@/entries/constants'

export interface ITrack {
  id?: number
  date: string
  tiles: Tiles
}

class trackDatabase extends Dexie {
  public track!: Table<ITrack, number> // id is number in this case

  public constructor() {
    super('trackDatabase')
    this.version(1).stores({
      track: '++id, date, tiles'
    })
  }
}

const db = new trackDatabase()

export async function importTracks (file: File) {
  await importDB(file)
}

export async function exportTracks () {
  const blob = await exportDB(db)
  download(blob, 'tracks.json')
}
  
export async function save (track: { date: string, tiles: Tiles }) {
  const existing = await db.track.where({ date: track.date }).first()

  if (existing?.id) {
    return await db.track.update(existing.id, {
      date: track.date,
      tiles: track.tiles
    })
  } else {
    return await db.track.add({
      date: track.date,
      tiles: track.tiles
    })
  }
}

export function getAll () {
  return db.track.toArray() ?? []
}

export function get (id: number) {
  return db.track.get(id)
}

export function remove (id: number) {
  return db.track.delete(id)
}
