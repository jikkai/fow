<script lang="ts">
import { onMount } from 'svelte'
import mapboxgl from 'mapbox-gl'
import { MapController } from '@/controller/MapController'
import { setLoading } from '@/store/loading'
import Actions from './Actions.svelte'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_REACT_APP_MAPBOX_TOKEN || ''

let mapContainerRef: HTMLDivElement
let mapController: MapController

onMount(() => {
  mapController = MapController.create()
  const mapboxMap = new mapboxgl.Map({
    container: mapContainerRef,
    style: mapController.mapboxStyleURL()
  })
  mapboxMap.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

  mapboxMap.on('load', () => {
    mapController.registerMap(mapboxMap)
    mapboxMap.resize()

    requestAnimationFrame(() => {
      setLoading(false)
    })
  })

  // map.current = mapboxMap
})
</script>

<section>
  <div
    bind:this={mapContainerRef}
    class="absolute w-full h-full inset-0"
  />

  {#if !!mapController}
    <Actions mapController={mapController} />
  {/if}
</section>
