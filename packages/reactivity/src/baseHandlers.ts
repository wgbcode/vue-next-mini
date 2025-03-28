import { isObject } from '@vue/shared'
import { reactive } from './reactive'

const track = () => {}
const trigger = () => {}

export const mutableHandlers: ProxyHandler<Object> = {
  get(target: object, key: string, receiver: object) {
    const res = Reflect.get(target, key, receiver)
    if (isObject(res)) {
      reactive(res) // 递归遍历
    }
    track() // 收集依赖
    return res
  },
  set(target: object, key: string, value: any, receiver: object) {
    const result = Reflect.set(target, key, value, receiver)
    trigger() // 触发依赖
    return result
  }
}
