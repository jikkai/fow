// TODO: consider reactify this?
import mapboxgl from 'mapbox-gl'
import FogMap from '@/entries/FogMap'
import Bbox from '@/entries/Bbox'
import { HistoryManager } from './HistoryManager'
import { MapDraw } from './MapDraw'
import { MapRenderer, MAPBOX_MAIN_CANVAS_LAYER } from './MapRenderer'
import { MapStyle, FogConcentration } from '@/entries/enums'

export enum ControlMode {
  View = 'view',
  Eraser = 'eraser',
  DrawLine = 'drawLine'
}

export class MapController {
  private static instance: MapController | null = null
  private map: mapboxgl.Map | null
  private mapRenderer: MapRenderer | null
  public fogMap: FogMap
  public historyManager: HistoryManager
  private controlMode: ControlMode
  private eraserArea: [mapboxgl.LngLat, mapboxgl.GeoJSONSource] | null
  private mapDraw: MapDraw | null
  private onChangeCallback: { [key: string]: () => void }
  private mapStyle: MapStyle
  private fogConcentration: FogConcentration

  private constructor() {
    this.map = null
    this.fogMap = FogMap.empty
    this.controlMode = ControlMode.View
    this.eraserArea = null
    this.historyManager = new HistoryManager(this.fogMap)
    this.onChangeCallback = {}
    this.mapStyle = MapStyle.Standard
    this.fogConcentration = FogConcentration.Medium
    this.mapDraw = null
    this.mapRenderer = null
  }

  static create(): MapController {
    if (MapController.instance) {
      console.log(
        'WARNING: One shouldn\'t create a second copy of `mapController`'
      )
    } else {
      MapController.instance = new MapController()
    }
    return MapController.instance
  }

  private setMapboxLanguage(): void {
    const map = this.map
    if (!map) {
      return
    }

    map.getStyle().layers.forEach(function (thisLayer) {
      if (thisLayer.id.indexOf('-label') > 0) {
        map.setLayoutProperty(thisLayer.id, 'text-field', [
          'get',
          'name_zh-Hans'
        ])
      }
    })
  }

  mapboxStyleURL(): string {
    if (this.mapStyle == MapStyle.Standard || this.mapStyle == MapStyle.None) {
      return 'mapbox://styles/mapbox/streets-v11'
    } else if (this.mapStyle == MapStyle.Satellite) {
      return 'mapbox://styles/mapbox/satellite-v9'
    } else {
      return 'mapbox://styles/mapbox/satellite-streets-v11'
    }
  }

  private setMapVisibility(visibility: 'visible' | 'none'): void {
    this.map?.getStyle().layers.forEach((thisLayer) => {
      if (thisLayer.id !== MAPBOX_MAIN_CANVAS_LAYER) {
        this.map?.setLayoutProperty(thisLayer.id, 'visibility', visibility)
      }
    })
  }

  setMapStyle(style: MapStyle): void {
    if (style !== this.mapStyle) {
      if (style === MapStyle.None) {
        this.mapStyle = style
        this.setMapVisibility('none')
      } else {
        if (this.mapStyle == MapStyle.None) {
          this.setMapVisibility('visible')
        }
        this.mapStyle = style
        this.map?.setStyle(this.mapboxStyleURL())
      }
    }
  }

  getMapStyle(): MapStyle {
    return this.mapStyle
  }

  setFogConcentration(fogConcentration: FogConcentration): void {
    if (fogConcentration != this.fogConcentration) {
      this.fogConcentration = fogConcentration
      this.redrawArea('all')
    }
  }

  getFogConcentration(): FogConcentration {
    return this.fogConcentration
  }

  private onChange() {
    Object.keys(this.onChangeCallback).map((key) => {
      const callback = this.onChangeCallback[key]
      callback()
    })
  }

  registerMap(map: mapboxgl.Map): void {
    this.map = map
    this.map.on('mousedown', this.handleMouseClick.bind(this))
    this.map.on('mouseup', this.handleMouseRelease.bind(this))
    this.map.on('mousemove', this.handleMouseMove.bind(this))
    map.on('styledata', () => {
      // Set the default atmosphere style for globe mode
      // map.setFog({})
      this.setMapboxLanguage()
    })
    this.setControlMode(this.controlMode)
    this.onChange()
    this.mapRenderer = new MapRenderer(
      map,
      0,
      () => {
        return this.fogMap
      },
      () => {
        if (this.fogConcentration == 'high') {
          return 0.8
        } else if (this.fogConcentration == 'medium') {
          return 0.6
        } else {
          return 0.4
        }
      }
    )

    this.mapDraw = new MapDraw(
      map,
      () => {
        return this.fogMap
      },
      (newMap, areaChanged) => {
        this.updateFogMap(newMap, areaChanged)
      }
    )
  }

  unregisterMap(map: mapboxgl.Map): void {
    // TODO
    console.log(map)
  }

  registerOnChangeCallback(key: string, callback: () => void) {
    this.onChangeCallback[key] = callback
    this.onChange()
  }

  unregisterOnChangeCallback(key: string) {
    delete this.onChangeCallback[key]
  }

  redrawArea(area: Bbox | 'all'): void {
    this.mapRenderer?.redrawArea(area)
  }

  private applyFogMapUpdate(newMap: FogMap, areaChanged: Bbox | 'all') {
    this.fogMap = newMap
    this.redrawArea(areaChanged)

    if (this.onChange) {
      this.onChange()
    }
  }

  private updateFogMap(newMap: FogMap, areaChanged: Bbox | 'all'): void {
    if (this.fogMap !== newMap) {
      this.historyManager.append(newMap, areaChanged)
      this.applyFogMapUpdate(newMap, areaChanged)
    }
  }

  replaceFogMap(newMap: FogMap): void {
    this.historyManager = new HistoryManager(FogMap.empty)
    this.updateFogMap(newMap, 'all')
  }

  undo(): void {
    this.historyManager.undo(this.applyFogMapUpdate.bind(this))
  }

  redo(): void {
    this.historyManager.redo(this.applyFogMapUpdate.bind(this))
  }

  flyTo(zoomLevel?: number): void {
    // 获取当前经纬度
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords
      const zoom = zoomLevel ?? this.map.getZoom()

      this.map.flyTo({
        center: [longitude, latitude], // 指定的经度和纬度
        zoom, // 缩放级别
        essential: true // 如果设置为 true，将在用户视线中心的地方执行此操作
      })
    })
  }

  handleMouseClick(e: mapboxgl.MapMouseEvent): void {
    if (this.controlMode === ControlMode.Eraser) {
      console.log(
        `A click event has occurred on a visible portion of the poi-label layer at ${e.lngLat}`
      )

      if (!this.eraserArea) {
        this.map?.addSource('eraser', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[]]
            }
          }
        })

        this.map?.addLayer({
          id: 'eraser',
          type: 'fill',
          source: 'eraser',
          layout: {},
          paint: {
            'fill-color': '#969696',
            'fill-opacity': 0.5
          }
        })
        this.map?.addLayer({
          id: 'eraser-outline',
          type: 'line',
          source: 'eraser',
          layout: {},
          paint: {
            'line-color': '#969696',
            'line-width': 1
          }
        })

        const eraserSource = this.map?.getSource(
          'eraser'
        ) as mapboxgl.GeoJSONSource | null
        if (eraserSource) {
          const startPoint = new mapboxgl.LngLat(e.lngLat.lng, e.lngLat.lat)
          this.eraserArea = [startPoint, eraserSource]
        }
      }
    }
  }

  handleMouseMove(e: mapboxgl.MapMouseEvent): void {
    if (this.controlMode === ControlMode.Eraser && this.eraserArea) {
      const [startPoint, eraserSource] = this.eraserArea
      const west = Math.min(e.lngLat.lng, startPoint.lng)
      const north = Math.max(e.lngLat.lat, startPoint.lat)
      const east = Math.max(e.lngLat.lng, startPoint.lng)
      const south = Math.min(e.lngLat.lat, startPoint.lat)

      eraserSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [east, north],
              [west, north],
              [west, south],
              [east, south],
              [east, north]
            ]
          ]
        }
      })
    }
  }

  handleMouseRelease(e: mapboxgl.MapMouseEvent): void {
    if (this.controlMode === ControlMode.Eraser && this.eraserArea) {
      const startPoint = this.eraserArea[0]
      const west = Math.min(e.lngLat.lng, startPoint.lng)
      const north = Math.max(e.lngLat.lat, startPoint.lat)
      const east = Math.max(e.lngLat.lng, startPoint.lng)
      const south = Math.min(e.lngLat.lat, startPoint.lat)

      this.map?.removeLayer('eraser')
      this.map?.removeLayer('eraser-outline')
      this.map?.removeSource('eraser')

      const bbox = new Bbox(west, south, east, north)
      console.log(`clearing the bbox ${west} ${north} ${east} ${south}`)

      const newMap = this.fogMap.clearBbox(bbox)
      this.updateFogMap(newMap, bbox)

      this.eraserArea = null
    }
  }

  setControlMode(mode: ControlMode): void {
    const mapboxCanvas = this.map?.getCanvasContainer()
    if (!mapboxCanvas) {
      return
    }

    // disable the current active mode
    switch (this.controlMode) {
      case ControlMode.View:
        break
      case ControlMode.Eraser:
        mapboxCanvas.style.cursor = ''
        this.map?.dragPan.enable()
        if (this.eraserArea) {
          this.map?.removeLayer('eraser')
          this.map?.removeLayer('eraser-outline')
          this.map?.removeSource('eraser')
          this.eraserArea = null
        }
        break
      case ControlMode.DrawLine:
        mapboxCanvas.style.cursor = ''
        this.map?.dragPan.enable()
        this.mapDraw?.deactivate()
        break
    }

    // enable the new mode
    switch (mode) {
      case ControlMode.View:
        break
      case ControlMode.Eraser:
        mapboxCanvas.style.cursor = 'cell'
        this.map?.dragPan.disable()
        break
      case ControlMode.DrawLine:
        mapboxCanvas.style.cursor = 'crosshair'
        this.map?.dragPan.disable()
        this.mapDraw?.activate()
        break
    }
    this.controlMode = mode
  }
}
