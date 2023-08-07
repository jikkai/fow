<script lang="ts">
import { download } from '@/utils/helpers'
import Tabs from '@/components/Tabs/index.svelte'
import ActionPanel from '@/components/ActionPanel/index.svelte'
import { type MapController } from '@/controller/MapController'
import { MapStyle, FogConcentration } from '@/entries/enums'
import { setToast } from '@/store/toast'

export let mapController: MapController = null
export let onOpenImportModal = () => {}

const mapStylesTabs = [
  { label: '标准', value: MapStyle.Standard },
  { label: '卫星', value: MapStyle.Satellite },
  { label: '混合', value: MapStyle.Hybrid },
  { label: '无', value: MapStyle.None }
]

const fogConcentrationTabs = [
  { label: '低', value: FogConcentration.Low },
  { label: '中', value: FogConcentration.Medium },
  { label: '高', value: FogConcentration.High }
]
</script>

<!-- 导入 / 导出 -->
<ActionPanel
  actions={[{
    icon: 'file-import-solid',
    title: '导入',
    description: '从 [世界迷雾] 中导入数据。',
    onClick: onOpenImportModal
  }, {
    icon: 'download-solid',
    title: '导出',
    description: '导出数据到 [世界迷雾]。',
    onClick: async () => {
      const blob = await mapController.fogMap.exportArchive()
      if (blob) {
        download(blob, 'Sync.zip')

        setToast({
          visible: true,
          message: '导出成功。'
        })
      }
    }
  }]}
/>

<!-- 地图模式 -->
<Tabs
  title="地图模式"
  defaultIndex={mapStylesTabs.findIndex(
    (tab) => tab.value === mapController.getMapStyle()
  )}
  tabs={mapStylesTabs}
  onChange={(index) => {
    const style = mapStylesTabs[index]
    mapController.setMapStyle(
      style.value
    )
  }}
/>

<!-- 迷雾浓度 -->
<Tabs
  title="迷雾浓度"
  defaultIndex={fogConcentrationTabs.findIndex(
    (tab) => tab.value === mapController.getFogConcentration()
  )}
  tabs={fogConcentrationTabs}
  onChange={(index) => {
    const fogConcentration = fogConcentrationTabs[index]
    mapController.setFogConcentration(
      fogConcentration.value
    )
  }}
/>
