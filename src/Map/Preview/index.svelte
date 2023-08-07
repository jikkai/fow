<script lang="ts">
import { onMount } from 'svelte'
import dayjs from 'dayjs'
import { Icon } from 'flowbite-svelte-icons'
import ActionPanel from '@/components/ActionPanel/index.svelte'
import { type MapController } from '@/controller/MapController'
import FogMap from '@/entries/FogMap'
import { type Tiles } from '@/entries/constants'
import { type ITrack, getAll, save } from '@/db/tracks'
import { setToast } from '@/store/toast'

export let mapController: MapController = null
export let zipFilenameWithDate = ''
export let onOpenImportModal = () => {}

let tracks: ITrack[] = []
onMount(async () => {
  tracks = await getAll()
})
async function handleRestore (tiles: Tiles) {
  const newFogmap = await FogMap.createFromTiles(tiles)
  mapController.replaceFogMap(newFogmap)
  mapController.flyTo()

  setToast({
    visible: true,
    message: '加载成功。'
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
      const zipDate = zipFilenameWithDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')

      const result = await save({
        date: zipDate || dayjs().format('YYYY-MM-DD'),
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
      class="flex items-center gap-2 cursor-pointer p-2 -m-3 text-xs text-gray-500 transition duration-150 ease-in-out rounded-lg hover:text-blue-500"
      on:click={() => handleRestore(track.tiles)}
    >
      <Icon name="database-solid" />
      {track.date}
    </a>
  {/each}
</div>
