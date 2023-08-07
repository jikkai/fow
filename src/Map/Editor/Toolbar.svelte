<script lang="ts">
import { onMount } from 'svelte'
import { Icon } from 'flowbite-svelte-icons'
import Mousetrap from 'mousetrap'
import { type MapController, ControlMode } from '@/controller/MapController'

export let mapController: MapController = null

// 历史栈工具
Mousetrap.bind(['mod+z'], () => {
  mapController.undo()
})
Mousetrap.bind(['mod+shift+z'], () => {
  mapController.redo()
})
let historyState = {
  canUndo: false,
  canRedo: false
}
onMount(() => {
  mapController.registerOnChangeCallback('editor', () => {
    historyState = {
      canUndo: mapController.historyManager.canUndo(),
      canRedo: mapController.historyManager.canRedo()
    }
  })
})
const historyTools = [{
  key: 'canUndo',
  icon: 'reply-solid',
  onClick: () => {
    mapController.undo()
  }
}, {
  key: 'canRedo',
  icon: 'forward-solid',
  onClick: () => {
    mapController.redo()
  }
}]

// 操作栏工具
let controlMode = ControlMode.View as ControlMode
onMount(() => {
  mapController.setControlMode(controlMode)
})

const actionTools = [{
  key: 'eraser',
  icon: 'wand-sparkles-solid',
  enabled: controlMode === ControlMode.Eraser,
  onClick: () => {
    if (controlMode === ControlMode.Eraser) {
      controlMode = ControlMode.View
    } else {
      controlMode = ControlMode.Eraser
    }
    mapController.setControlMode(controlMode)
  }
}, {
  key: 'draw',
  icon: 'pen-solid',
  enabled: controlMode === ControlMode.DrawLine,
  onClick: () => {
    if (controlMode === ControlMode.DrawLine) {
      controlMode = ControlMode.View
    } else {
      controlMode = ControlMode.DrawLine
    }
    mapController.setControlMode(controlMode)
  }
}]
</script>

<section class="absolute bottom-0 pb-4 z-10 pointer-events-none flex justify-center w-full">
  {#each historyTools as btn}
    <button
      class={
        'flex items-center justify-center mx-2 w-9 h-9 p-2 bg-white shadow rounded-lg hover:bg-gray-200 active:bg-gray-400' +
        (historyState[btn.key]
          ? ' pointer-events-auto'
          : ' text-gray-300 opacity-40')
      }
      on:click={() => {
        if (historyState[btn.key]) {
          btn.onClick()
        }
      }}
    >
      <Icon name={btn.icon} />
    </button>
  {/each}
  <div
    class="flex items-center justify-center rounded mx-7 w-1 h-9 bg-black shadow"
  />

  {#each actionTools as btn}
    <button
      class={
        'flex items-center justify-center mx-2 w-9 h-9 p-2 bg-white shadow rounded-lg hover:bg-gray-200 active:bg-gray-400 pointer-events-auto' +
        (btn.enabled ? ' ring-4 ring-gray-700' : '')
      }
      on:click={() => {
        btn.onClick()
      }}
    >
      <Icon name={btn.icon} />
    </button>
  {/each}
</section>
