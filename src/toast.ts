export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: message }))
}
