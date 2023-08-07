<script lang="ts">
import { Tabs, TabItem } from 'flowbite-svelte'

export let title = ''
export let defaultIndex = 0
export let tabs: { label: string, value: string }[] = []
export let onChange: (index: number) => void = () => {}
</script>

<section class="[&_[role=tabpanel]]:hidden bg-gray-50 px-3 py-2 rounded-lg">
  {#if title}
    <header class="flex items-center">
      <span class="text-sm font-medium text-gray-900">
        {title}
      </span>
    </header>
  {/if}

  <div class="w-full pt-4 grid">
    <Tabs class="flex p-1 space-x-1 bg-gray-300 rounded-xl" style="pill">
      {#each tabs as tab, i}
        <TabItem class="flex-1 [&>button]:py-1 [&>button]:w-full" open={defaultIndex === i} on:click={()=> onChange(i)}>
          <span slot="title">{tab.label}</span>
        </TabItem>
      {/each}
    </Tabs>
  </div>
</section>
