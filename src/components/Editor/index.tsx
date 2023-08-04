import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import Mousetrap from 'mousetrap'
import { ControlMode, MapController } from '@/utils/MapController'
import MainMenu from '@/components/MainMenu'
import { isLoadedAtom } from '@/components/LoadingSpinner/jotai'
import IconEraser from '@/components/Icon/Eraser'
import IconRedo from '@/components/Icon/Redo'
import IconUndo from '@/components/Icon/Undo'
import IconLine from '@/components/Icon/Line'

interface IProps {
  mapController: MapController
}

function Editor(props: IProps) {
  const { mapController } = props

  const [, setIsLoaded] = useAtom(isLoadedAtom)
  const [controlMode, setControlMode] = useState(ControlMode.View)

  useEffect(() => {
    mapController.setControlMode(controlMode)
  }, [controlMode])

  const [historyStatus, setHistoryStatus] = useState({
    canRedo: false,
    canUndo: false
  })

  useEffect(() => {
    mapController.registerOnChangeCallback('editor', () => {
      setHistoryStatus({
        canRedo: mapController.historyManager.canRedo(),
        canUndo: mapController.historyManager.canUndo()
      })
    })
    setIsLoaded(true)

    return function cleanup() {
      mapController.unregisterOnChangeCallback('editor')
    }
  }, [])

  Mousetrap.bind(['mod+z'], () => {
    mapController.undo()
  })
  Mousetrap.bind(['mod+shift+z'], () => {
    mapController.redo()
  })

  const toolButtons = [
    {
      key: 'undo',
      icon: <IconUndo />,
      clickable: historyStatus.canUndo,
      enabled: false,
      onClick: () => {
        mapController.undo()
      }
    },
    {
      key: 'redo',
      icon: <IconRedo />,
      clickable: historyStatus.canRedo,
      enabled: false,
      onClick: () => {
        mapController.redo()
      }
    },
    null,
    {
      key: 'eraser',
      icon: <IconEraser />,
      clickable: true,
      enabled: controlMode === ControlMode.Eraser,
      onClick: () => {
        if (controlMode === ControlMode.Eraser) {
          setControlMode(ControlMode.View)
        } else {
          setControlMode(ControlMode.Eraser)
        }
      }
    },
    {
      key: 'line',
      icon: <IconLine />,
      clickable: true,
      enabled: controlMode === ControlMode.DrawLine,
      onClick: () => {
        if (controlMode === ControlMode.DrawLine) {
          setControlMode(ControlMode.View)
        } else {
          setControlMode(ControlMode.DrawLine)
        }
      }
    }
  ]

  return (
    <>
      <MainMenu mapController={mapController} />

      <section className="absolute bottom-0 pb-4 z-10 pointer-events-none flex justify-center w-full">
        {toolButtons.map((toolButton) =>
          toolButton !== null ? (
            <button
              key={toolButton.key}
              className={
                'flex items-center justify-center mx-2 w-9 h-9 p-2 bg-white shadow rounded-lg hover:bg-gray-200 active:bg-gray-400' +
                (toolButton.enabled ? ' ring-4 ring-gray-700' : '') +
                (toolButton.clickable
                  ? ' pointer-events-auto'
                  : ' text-gray-300 opacity-40')
              }
              onClick={() => {
                if (toolButton.clickable) {
                  toolButton.onClick()
                }
              }}
            >
              {toolButton.icon}
            </button>
          ) : (
            <div
              key="|"
              className={
                'flex items-center justify-center rounded mx-7 w-1 h-9 bg-black shadow'
              }
            />
          )
        )}
      </section>
    </>
  )
}

export default Editor
