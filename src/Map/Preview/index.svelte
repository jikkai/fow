<script lang="ts">
import { onMount } from 'svelte'
import dayjs from 'dayjs'
import { Icon } from 'flowbite-svelte-icons'
import ActionPanel from '@/components/ActionPanel/index.svelte'
import { type MapController } from '@/controller/MapController'
import FogMap from '@/entries/FogMap'
import { type Tiles } from '@/entries/constants'
import { type ITrack, getAll, save, remove, exportTracks, importTracks } from '@/db/tracks'
import { setToast } from '@/store/toast'
import ImportDbModal from './ImportDbModal.svelte'

export let mapController: MapController = null
export let zipFilenameWithDate = ''
export let onOpenImportModal = () => {}

let tracks: ITrack[] = []
async function getAllTracks () {
  tracks = await getAll()
  tracks.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
}
onMount(getAllTracks)

async function handleRestore (tiles: Tiles) {
  const newFogmap = await FogMap.createFromTiles(tiles)
  mapController.replaceFogMap(newFogmap)
  mapController.flyTo()

  setToast({
    visible: true,
    message: '加载成功。'
  })
}

async function handleRemove (id: number) {
  await remove(id)
  getAllTracks()

  setToast({
    visible: true,
    message: '删除成功。'
  })
}

let importModalVisible = false
function toggleImportModalVisible (visible: boolean) {
  importModalVisible = visible
}
async function handleUploadSuccess (fileList: FileList) {
  await importTracks(fileList[0])
  toggleImportModalVisible(false)
  getAllTracks()

  setToast({
    visible: true,
    message: '导入成功。'
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
        getAllTracks()
        setToast({
          visible: true,
          message: '保存成功。'
        })
      }
    }
  }, {
    icon: 'file-import-solid',
    title: '导入数据库',
    description: '导入全部记录。',
    onClick: () => {
      toggleImportModalVisible(true)
    }
  }, {
    icon: 'download-solid',
    title: '导出数据库',
    description: '导出全部记录。',
    onClick: () => {
      exportTracks()
      
      setToast({
        visible: true,
        message: '开始导出。'
      })
    }
  }]}
/>

<section class="px-7 py-4 bg-gray-50">
  {#each tracks as track}
    <section class="flex items-center justify-between gap-2 p-2 -m-3 rounded-lg">
      <div>
        <button
          class="text-gray-500 transition duration-150 ease-in-out  text-xs hover:text-blue-500 cursor-pointer"
          on:click={() => handleRestore(track.tiles)}
        >
          {track.date}
        </button>
      </div>
      <div>
        <button class="hover:text-red-500" on:click={() => handleRemove(track.id)}>
          <Icon name="trash-bin-solid" size="sm" />
        </button>
      </div>
    </section>
  {/each}
</section>

<ImportDbModal
  visible={importModalVisible}
  onClose={() => toggleImportModalVisible(false)}
  onSuccess={handleUploadSuccess}
/>
