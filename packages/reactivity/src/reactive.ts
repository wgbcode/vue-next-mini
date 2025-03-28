import { mutableHandlers } from './baseHandlers'

const proxyMap = new WeakMap()

export const reactive = (target: object) => {
  if (proxyMap.has(target)) {
    return proxyMap.get(target)
  } else {
    const proxy = new Proxy(target, mutableHandlers)
    proxyMap.set(target, proxy)
    return proxy
  }
}
