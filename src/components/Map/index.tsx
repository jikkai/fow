import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { MapController } from '@/utils/MapController'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.scss'

mapboxgl.accessToken = import.meta.env.VITE_REACT_APP_MAPBOX_TOKEN || ''

// This componet is a bit sad, we don't want to re-initialize the mapbox/deckgl
// and our `mapController` doesn't handle cleanup correctly. So it shouldn't be
// unmounted and re-mounted. We only use the <Map /> in <App /> and made sure
// that the Props are static. We have a warning message when `mapController` is
// created multiple times.
type Props = {
  initialized(mapController: MapController): void
  note: 'THIS SHOULDN\'T BE UNMOUNTED'
}

function Map(props: Props): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (map.current) return
    if (!mapContainerRef.current) return

    const mapController = MapController.create()
    const mapboxMap = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapController.mapboxStyleURL()
    })
    mapboxMap.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

    mapboxMap.on('load', () => {
      mapController.registerMap(mapboxMap)
      mapboxMap.resize()

      requestAnimationFrame(() => {
        props.initialized(mapController)
      })
    })

    map.current = mapboxMap

    return function cleanup() {
      // TODO: This clean up seems wrong
      mapController.unregisterMap(mapboxMap);
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <div ref={mapContainerRef} className="absolute w-full h-full inset-0" />
      <div className="absolute w-full h-full inset-0 z-10 pointer-events-none"></div>
    </div>
  )
}

export default Map
