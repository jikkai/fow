import Bbox from '@/entries/Bbox'
import FogMap from '@/entries/FogMap'

const MAX_HISTORY_SIZE = 20

class HistoryItem {
  public readonly fogMap: FogMap
  public readonly areaChanged: Bbox | 'all'
  public constructor(fogMap: FogMap, areaChanged: Bbox | 'all') {
    this.fogMap = fogMap
    this.areaChanged = areaChanged
  }
}

export class HistoryManager {
  // use ring buffer instead?
  private history: HistoryItem[]
  private pos: number
  public constructor(initialMap: FogMap) {
    this.history = [new HistoryItem(initialMap, 'all')]
    this.pos = 0
  }

  public canRedo(): boolean {
    return this.pos + 1 < this.history.length
  }

  public canUndo(): boolean {
    return this.pos > 0
  }

  public append(newMap: FogMap, areaChanged: Bbox | 'all'): void {
    while (this.history.length > this.pos + 1) {
      this.history.pop()
    }
    this.history.push(new HistoryItem(newMap, areaChanged))
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.shift()
    } else {
      this.pos += 1
    }
  }

  public undo(
    apply: (map: FogMap, areaChanged: Bbox | 'all') => void
  ): void {
    if (this.canUndo()) {
      this.pos -= 1
      // `apply` should be called after the pos update
      apply(
        this.history[this.pos].fogMap,
        this.history[this.pos + 1].areaChanged
      )
    }
  }

  public redo(
    apply: (map: FogMap, areaChanged: Bbox | 'all') => void
  ): void {
    if (this.canRedo()) {
      this.pos += 1
      const item = this.history[this.pos]
      apply(item.fogMap, item.areaChanged)
    }
  }
}
