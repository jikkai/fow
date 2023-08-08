<script lang="ts">
import { Modal, Button } from 'flowbite-svelte'

export let visible = false
export let onClose = () => {}
export let onSuccess = (fileList: FileList) => {}

function handleUpload (e: Event) {
  const fileList = (e.target as HTMLInputElement).files

  onSuccess(fileList)
}
</script>

<Modal title="导入数据库" bind:open={visible} on:hide={onClose} autoclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    你的数据将完全在本地处理。<br />

    接受的数据格式：<br />
    - 导出的数据库文件（.json）<br />
  </p>

  <svelte:fragment slot='footer'>
    <Button class="relative">
      手动上传
      <input
        class="absolute inset-0 opacity-0 cursor-pointer"
        type="file"
        on:input={handleUpload}
        accept=".json"
      >
    </Button>
  </svelte:fragment>
</Modal>
