<script lang="ts">
import { Icon } from 'flowbite-svelte-icons'

export let actions = []
</script>

<section class="grid gap-4 bg-white px-3 py-2">
  {#each actions as action}
    <!-- svelte-ignore a11y-invalid-attribute -->
    <a
      href="javascript:void(0)" class="p-2 flex items-center cursor-pointer transition duration-150 ease-in-out rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
      on:click={action.onClick}
    >
      <div class="flex items-center justify-center flex-shrink-0 w-10 h-10 bg-[#FFEDD5] text-[#FDBA74] rounded-lg [&>*]:w-8 [&>*]:h-8 sm:h-12 sm:w-12">
        <Icon name={action.icon} />
      </div>
      <div class="ml-4">
        <p class="text-sm font-medium text-gray-900">
          {action.title}
        </p>
        <p class="text-sm text-gray-500">
          {action.description}
        </p>
      </div>
    </a>
  {/each}
</section>
