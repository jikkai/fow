<script lang="ts">
import { onMount } from 'svelte'
import dayjs from 'dayjs'
import ActionPanel from '@/components/ActionPanel/index.svelte'
import { type MapController } from '@/controller/MapController'
import FogMap from '@/entries/FogMap'
import { type Tiles } from '@/entries/constants'
import { type ITrack, getAll, save } from '@/db/tracks'
import { setToast } from '@/store/toast'

export let mapController: MapController = null
export let onOpenImportModal = () => {}

let tracks: ITrack[] = []
onMount(async () => {
  tracks = await getAll()
})
function handleRestore (tiles: Tiles) {
  const newFogmap = FogMap.createFromTiles(tiles)
  mapController.replaceFogMap(newFogmap)

  setToast({
    visible: true,
    message: '恢复成功。'
  })
}
</script>

<!-- 导入 / 保存 -->
<ActionPanel
  actions={[{
    icon: 'file-import-solid',
    title: '导入',
    description: '从 [世界迷雾] 中导入数据。',
    onClick: onOpenImportModal
  }, {
    icon: 'archive-solid',
    title: '保存',
    description: '保存记录到本地。',
    onClick: async () => {
      const result = await save({
        date: dayjs().format('YYYY-MM-DD'),
        tiles: mapController.fogMap.tiles
      })
      if (result) {
        tracks = await getAll()
        setToast({
          visible: true,
          message: '保存成功。'
        })
      }
    }
  }]}
/>

<div class="px-7 py-4 bg-gray-50">
  {#each tracks as track}
    <!-- svelte-ignore a11y-invalid-attribute -->
    <a
      href="javascript:void(0)"
      class="flex items-center cursor-pointer p-2 -m-3 text-sm text-gray-500 transition duration-150 ease-in-out rounded-lg hover:bg-gray-50"
      on:click={() => handleRestore(track.tiles)}
    >
      {track.date}
    </a>
  {/each}
</div>
