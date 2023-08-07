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
  mapboxMap.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    // When active the map will receive updates to the device's location as it changes.
    trackUserLocation: true,
    // Draw an arrow next to the location dot to indicate which direction the device is heading.
    showUserHeading: true
  }))

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
