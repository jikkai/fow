// This file is basically a wrapper around `@mapbox/mapbox-gl-draw`
// because we don't have type definitions for it.

import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import Bbox from '@/entries/Bbox'
import FogMap from '@/entries/FogMap'

export class MapDraw {
  private map: mapboxgl.Map
  private mapboxDraw: MapboxDraw
  private getCurrentFogMap: () => FogMap
  private updateFogMap: (newMap: FogMap, areaChanged: Bbox) => void

  constructor(
    map: mapboxgl.Map,
    getCurrentFogMap: () => FogMap,
    updateFogMap: (newMap: FogMap, areaChanged: Bbox) => void
  ) {
    this.map = map
    this.getCurrentFogMap = getCurrentFogMap
    this.updateFogMap = updateFogMap
    this.mapboxDraw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: 'draw_line_string',
      styles: [{
        id: 'gl-draw-line',
        type: 'line',
        filter: [
          'all',
          ['==', '$type', 'LineString'],
          ['!=', 'mode', 'static']
        ],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#969696',
          'line-dasharray': [0.2, 2],
          'line-width': 2
        }
      }]
    })

    this.map.on('draw.create', (e) => {
      // parse each line segments, apply to fogmap
      for (const geo of e.features) {
        if (geo.geometry.type == 'LineString') {
          const coordinates = geo.geometry.coordinates

          let [startLng, startLat] = coordinates[0]
          let newMap = this.getCurrentFogMap()
          const bounds = new mapboxgl.LngLatBounds(
            coordinates[0],
            coordinates[0]
          )
          for (let j = 1; j < coordinates.length; ++j) {
            const [endLng, endLat] = coordinates[j]
            newMap = newMap.addLine(startLng, startLat, endLng, endLat)
            bounds.extend(coordinates[j])
            ;[startLng, startLat] = [endLng, endLat]
          }
          const bbox = new Bbox(
            bounds.getWest(),
            bounds.getSouth(),
            bounds.getEast(),
            bounds.getNorth()
          )
          this.updateFogMap(newMap, bbox)
        }
      }
      this.mapboxDraw.trash() // clean up the user drawing
    })
    this.map.on('draw.modechange', () => {
      this.mapboxDraw.changeMode('draw_line_string', {})
    })
  }

  activate() {
    this.map?.addControl(this.mapboxDraw, 'bottom-left')
  }

  deactivate() {
    if (this.map.hasControl(this.mapboxDraw)) {
      this.map.removeControl(this.mapboxDraw)
    }
  }
}
