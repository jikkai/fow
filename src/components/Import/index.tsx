import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import { FogMap } from '@/entries/FogMap'
import { readFileAsync } from '@/utils/helpers'
import { MapController } from '@/utils/MapController'
import { getFileExtension } from '@/utils/helpers'
import { useAtom } from 'jotai'
import { msgboxStateAtom } from '@/components/MessageBox/jotai'

type Props = {
  mapController: MapController
  isOpen: boolean
  setIsOpen(isOpen: boolean): void
}

async function formatZipFiles(files: { [key: string]: JSZip.JSZipObject }) {
  const tileFiles: [string, ArrayBuffer][] = []
  for (const key in files) {
    const filename = key.replace(/^.*[\\/]/, '')
    const file = files[key]
    if (filename !== '' && !filename.match(/^\./)) {
      const data = await file.async('arraybuffer')

      tileFiles.push([filename, data])
    }
  }
  return tileFiles
}

async function createMapFromZip(data: ArrayBuffer): Promise<FogMap> {
  const zip = await new JSZip().loadAsync(data)
  const tileFiles = await formatZipFiles(zip.files)
  const map = FogMap.createFromFiles(tileFiles)
  return map
}

export default function MyModal(props: Props): JSX.Element {
  const { isOpen, setIsOpen } = props
  const [, setMsgboxState] = useAtom(msgboxStateAtom)

  async function importFiles(files: File[]) {
    const mapController = props.mapController
    closeModal()
    if (mapController.fogMap !== FogMap.empty) {
      // we need this because we do not support overriding in `mapController.addFoGFile`
      setMsgboxState({
        isOpen: true,
        title: '错误',
        msg: '无法多次导入 [世界迷雾] 数据。可通过刷新页面重置。'
      })
      return
    }

    console.log(files)
    // TODO: error handling
    // TODO: progress bar
    // TODO: improve file checking
    let done = false
    if (files.every((file) => getFileExtension(file.name) === '')) {
      const tileFiles = await Promise.all(
        files.map(async (file) => {
          const data = await readFileAsync(file)
          return [file.name, data] as [string, ArrayBuffer]
        })
      )
      const map = FogMap.createFromFiles(tileFiles)
      mapController.replaceFogMap(map)
      done = true
    } else {
      if (files.length === 1 && getFileExtension(files[0].name) === 'zip') {
        const data = await readFileAsync(files[0])
        if (data instanceof ArrayBuffer) {
          const map = await createMapFromZip(data)
          mapController.replaceFogMap(map)
        }
        done = true
      }
    }

    if (done) {
      // TODO: move to center?
    } else {
      setMsgboxState({
        isOpen: true,
        title: '错误',
        msg: '无效文件格式。'
      })
    }
  }

  const { open, getRootProps, getInputProps } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => importFiles(files)
  })
  const openFileSelector = open

  function closeModal() {
    setIsOpen(false)
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-40 overflow-y-auto"
        onClose={closeModal}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                导入
              </Dialog.Title>
              <div className="mt-2">
                <p
                  className="text-sm text-gray-500"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  你的数据将完全在本地处理。
                  <br />
                  <br />
                  接受的数据格式:
                  <br />
                  - "Sync" 文件夹
                  <br />
                  - "Sync" 文件夹中的全部文件
                  <br />- 包含 "Sync" 文件夹的 zip 压缩包
                </p>
              </div>
              <div className="pt-4">
                <div className="border-2 border-dashed border-gray-300 border-opacity-100 rounded-lg">
                  <div {...getRootProps({ className: 'dropzone' })}>
                    <input {...getInputProps()} />
                    <div className="py-4 w-min mx-auto">
                      <div className="mb-4 whitespace-nowrap">
                        拖入 [世界迷雾] 同步数据
                      </div>
                      <div className="w-min mx-auto">
                        <button
                          type="button"
                          className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                          onClick={openFileSelector}
                        >
                          手动选择
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
