import { useState, Fragment } from 'react'
import { useAtom } from 'jotai'
import { Popover, Tab, Transition } from '@headlessui/react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'
import { MapController } from '@/utils/MapController'
import { download } from '@/utils/helpers'
import { msgboxStateAtom } from '@/components/MessageBox/jotai'
import Import from '@/components/Import'
import IconImport from '@/components/Icon/Import'
import IconExport from '@/components/Icon/Export'

function MapTap(props: { mapController: MapController }): JSX.Element {
  const mapController = props.mapController
  const mapStyles = ['standard', 'satellite', 'hybrid', 'none']
  const fogConcentrations = ['low', 'medium', 'high']

  return (
    <>
      <div className="p-4 bg-gray-50">
        <span className="flex items-center">
          <span className="text-sm font-medium text-gray-900">地图模式</span>
        </span>
        <div className="w-full pt-4 grid">
          <Tab.Group
            onChange={(index) => {
              const style = mapStyles[index]
              mapController.setMapStyle(
                style as 'standard' | 'satellite' | 'hybrid' | 'none'
              )
            }}
            defaultIndex={mapStyles.indexOf(mapController.getMapStyle())}
          >
            <Tab.List className="flex p-1 space-x-1 bg-gray-300 rounded-xl">
              {['标准', '卫星', '混合', '无'].map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) => {
                    return (
                      'w-full py-1 text-sm leading-5 font-medium text-grey-500 rounded-lg focus:outline-none' +
                      (selected ? ' bg-white' : ' hover:bg-gray-200')
                    )
                  }}
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
          </Tab.Group>
        </div>
      </div>
      <div className="p-4 bg-gray-50">
        <span className="flex items-center">
          <span className="text-sm font-medium text-gray-900">迷雾浓度</span>
        </span>
        <div className="w-full pt-4 grid">
          <Tab.Group
            onChange={(index) => {
              const fogConcentration = fogConcentrations[index]
              mapController.setFogConcentration(
                fogConcentration as 'low' | 'medium' | 'high'
              )
            }}
            defaultIndex={fogConcentrations.indexOf(
              mapController.getFogConcentration()
            )}
          >
            <Tab.List className="flex p-1 space-x-1 bg-gray-300 rounded-xl">
              {['低', '中', '高'].map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) => {
                    return (
                      'w-full py-1 text-sm leading-5 font-medium text-grey-500 rounded-lg focus:outline-none' +
                      (selected ? ' bg-white' : ' hover:bg-gray-200')
                    )
                  }}
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
          </Tab.Group>
        </div>
      </div>
    </>
  )
}

type Props = {
  mapController: MapController
}

export default function MainMenu(props: Props): JSX.Element {
  const mapController = props.mapController

  const [importDialog, setImportDialog] = useState(false)
  const [, setMsgboxState] = useAtom(msgboxStateAtom)

  // Import and Export is only allowed in editor
  const menuItems = [
    {
      name: '导入',
      description: '从 [世界迷雾] 中导入数据。',
      action: () => {
        setImportDialog(true)
      },
      icon: IconImport
    },
    {
      name: '导出',
      description: '以 [世界迷雾] 的格式导出数据。',
      action: async () => {
        const blob = await mapController.fogMap.exportArchive()
        if (blob) {
          download(blob, 'Sync.zip')
          setMsgboxState({
            isOpen: true,
            title: '提示',
            msg: '导出成功。\n\n请使用导出的 zip 压缩包中的 "Sync" 文件夹替换原有文件夹，并重置 [世界迷雾] app 以清除已有数据。'
          })
        }
      },
      icon: IconExport
    }
  ]

  return (
    <>
      <Import
        mapController={mapController}
        isOpen={importDialog}
        setIsOpen={setImportDialog}
      />
      <div className="absolute z-40 top-4 left-4">
        <div className="max-w-sm m-auto bg-white bg-opacity-90 rounded-xl shadow-md flex items-center space-x-4">
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  className={`
                ${open ? '' : 'text-opacity-90'}
                text-black group px-3 py-2 rounded-md inline-flex items-center text-base font-medium hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
                >
                  <div className="p-0.5">
                    <span>迷雾机器</span>
                  </div>
                  {open ? (
                    <ChevronUpIcon
                      className="ml-2 h-5 w-5 group-hover:text-opacity-80 transition ease-in-out duration-150"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDownIcon
                      className="ml-2 h-5 w-5 group-hover:text-opacity-80 transition ease-in-out duration-150"
                      aria-hidden="true"
                    />
                  )}
                </Popover.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-150"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel className="absolute z-10 w-screen max-w-sm mt-3 transform">
                    <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="relative grid gap-8 bg-white p-7">
                        {menuItems.map((item) => (
                          <a
                            key={item.name}
                            onClick={item.action}
                            className="flex items-center cursor-pointer p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                          >
                            <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-white sm:h-12 sm:w-12">
                              <item.icon aria-hidden="true" />
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {item.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.description}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>

                      <MapTap mapController={mapController} />
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
        </div>
      </div>
    </>
  )
}
