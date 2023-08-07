import { type XYKey } from '@/entries/constants'

export function makeKeyXY(x: number, y: number): XYKey {
  return `${x}-${y}`
}

/**
 * @title 读取文件
 * @param {File} file 文件 
 * @return {Promise<ArrayBuffer>} 文件内容
 */
export function readFileAsync (file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(reader.result as ArrayBuffer)
    })
    reader.addEventListener('error', reject)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * @title 获取文件扩展名
 * @param {string} filename 文件名
 * @return {string} 扩展名 
 */
export function getFileExtension (filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx === -1) {
    return ''
  }
  return filename.slice(idx + 1)
}

/**
 * @title 文件下载
 * @param {Blob} blob 文件内容
 * @param {string} filename 文件名
 */
export function download (blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
