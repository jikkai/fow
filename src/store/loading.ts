import { writable } from 'svelte/store'
 
export const loading = writable(true)
export function setLoading (value) {
  loading.set(value)
}
