<script lang="ts">
import { Button, Popover } from 'flowbite-svelte'
import JSZip, { type JSZipObject } from 'jszip'
import { Icon } from 'flowbite-svelte-icons'
import Tabs from '@/components/Tabs/index.svelte'
import { type MapController, ControlMode } from '@/controller/MapController'
import { Mode } from '@/entries/enums'
import FogMap from '@/entries/FogMap'
import { setToast } from '@/store/toast'
import { getFileExtension, readFileAsync } from '@/utils/helpers'
import ImportModal from './ImportModal.svelte'
import Editor from './Editor/index.svelte'
import Toolbar from './Editor/Toolbar.svelte'
import Preview from './Preview/index.svelte'

export let mapController: MapController = null

let mode = Mode.Editor
const modeTabs = [
  { label: '编辑器', value: Mode.Editor },
  { label: '时光机', value: Mode.Preview }
]

let importModalVisible = false
function toggleImportModalVisible (visible: boolean) {
  importModalVisible = visible
}

let zipFilenameWithDate = ''

// 导入地图文件
function handleUploadSuccess (fileList: FileList) {
  async function createMapFromZip(data: ArrayBuffer): Promise<FogMap> {
    const zip = await new JSZip().loadAsync(data)
    const tileFiles = await formatZipFiles(zip.files)
    const map = FogMap.createFromFiles(tileFiles)
    return map
  }


  async function formatZipFiles (files: { [key: string]: JSZipObject }) {
    const tileFiles: [string, ArrayBuffer][] = []
    for (const key in files) {
      const filename = key.replace(/^.*[\\/]/, '')
      const file = files[key]
      if (filename !== '' && !filename.match(/^\./)) {
        const data = await file.async('arraybuffer')

        tileFiles.push([filename, data])
      }
    }
    return tileFiles
  }

  async function importFiles(files: File[]) {
    if (mapController.fogMap !== FogMap.empty) {
      mapController.replaceFogMap(FogMap.empty)
    }

    let done = false
    if (files.every((file) => getFileExtension(file.name) === '')) {
      const tileFiles = await Promise.all(
        files.map(async (file) => {
          const data = await readFileAsync(file)
          return [file.name, data] as [string, ArrayBuffer]
        })
      )
      const map = FogMap.createFromFiles(tileFiles)
      mapController.replaceFogMap(map)
      done = true
    } else {
      if (files.length === 1 && getFileExtension(files[0].name) === 'zip') {
        if (mode === Mode.Preview) {
          zipFilenameWithDate = ''
          const filename = files[0].name
          // Sync_yyyymmdd.zip => yyyymmdd
          const date = filename.match(/(\d{8})/)?.[0]
          if (date) {
            zipFilenameWithDate = date
          }
        }

        const data = await readFileAsync(files[0])
        if (data instanceof ArrayBuffer) {
          const map = await createMapFromZip(data)
          mapController.replaceFogMap(map)
        }
        done = true
      }
    }

    if (done) {
      mapController.flyTo(10)
    } else {
      setToast({
        visible: true,
        message: '无效的文件格式。'
      })
    }
    toggleImportModalVisible(false)
  }

  importFiles(Array.from(fileList))

  setToast({
    visible: true,
    message: '导入成功。'
  })
}
</script>

<section class="absolute z-40 top-4 left-4">
  <Button class="text-base font-bold" id="menu" color="alternative">
    菜单 <Icon name="chevron-down-solid" class="ml-2" size="xs" />
  </Button>

  <Popover
    class="ml-4 w-screen max-w-sm text-sm [&>div]:p-0"
    triggeredBy="#menu"
    trigger="click"
    arrow={false}
  >
    <!-- 模式切换 -->
    <Tabs
      defaultIndex={modeTabs.findIndex((tab) => tab.value === mode)}
      tabs={modeTabs}
      onChange={async (index) => {
        mode = modeTabs[index].value
        mapController.replaceFogMap(FogMap.empty)
        mapController.setControlMode(ControlMode.View)
      }}
    />

    {#if mode === Mode.Editor}
      <Editor
        mapController={mapController}
        onOpenImportModal={() => toggleImportModalVisible(true)}
      />
    {:else if mode === Mode.Preview}
      <Preview
        mapController={mapController}
        zipFilenameWithDate={zipFilenameWithDate}
        onOpenImportModal={() => toggleImportModalVisible(true)}
      />
    {/if}
  </Popover>
</section>

<ImportModal
  visible={importModalVisible}
  onClose={() => toggleImportModalVisible(false)}
  onSuccess={handleUploadSuccess}
/>

<!-- 工具栏 -->
{#if mode === Mode.Editor}
<Toolbar mapController={mapController} />
{/if}
