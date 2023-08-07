<script lang="ts">
import GlobalSpinner from '@/components/GlobalSpinner/index.svelte'
import GlobalToast from '@/components/GlobalToast/index.svelte'
import { loading } from '@/store/loading'
import { toast } from '@/store/toast'
import Map from './Map/index.svelte'
</script>

<Map />

{#if $loading}
  <GlobalSpinner />
{/if}

<GlobalToast {...$toast} />
