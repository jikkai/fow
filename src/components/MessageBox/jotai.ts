import { atomWithReset } from 'jotai/utils'

export interface IMsgboxState {
  isOpen: boolean
  title?: null | string
  msg?: null | string
}

export const msgboxStateAtom = atomWithReset<IMsgboxState>({
  isOpen: false,
  title: null,
  msg: null
})
