import { useState } from 'react'
import { useAtom } from 'jotai'
import LoadingSpinner from '@/components/LoadingSpinner'
import { isLoadedAtom } from '@/components/LoadingSpinner/jotai'
import MessageBox from '@/components/MessageBox'
import { MapController } from '@/utils/MapController'
import Map from '@/components/Map'
import Editor from '@/components/Editor'

function App(): JSX.Element {
  const [mapController, setMapController] = useState<MapController | null>(null)
  const [isLoaded] = useAtom(isLoadedAtom)

  return (
    <>
      <section className={isLoaded ? '' : 'invisible'}>
        <Map
          note="THIS SHOULDN'T BE UNMOUNTED"
          initialized={(mapController) => {
            setMapController(mapController)
          }}
        />
      </section>

      <MessageBox />

      {mapController && (
        <Editor mapController={mapController} />
      )}

      <LoadingSpinner />
    </>
  )
}

export default App
