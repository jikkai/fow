import { writable } from 'svelte/store'

interface IToast {
  visible: boolean
  message: string
}
 
export const toast = writable<IToast>({
  visible: false,
  message: ''
})
toast.subscribe((value) => {
  if (value.visible) {
    setTimeout(() => {
      toast.set({
        visible: false,
        message: ''
      })
    }, 3000)
  }
})

export function setToast (value: IToast) {
  toast.set(value)
}
