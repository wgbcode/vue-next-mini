import { isObject } from '@vue/shared'
import { reactive } from './reactive'
import { track, trigger } from './effect'

export const mutableHandlers: ProxyHandler<Object> = {
  // getter 在读取【响应式数据】时才会执行（初始化 => template 模板 => effect 函数 => Getter）
  get(target: object, key: string, receiver: object) {
    const res = Reflect.get(target, key, receiver)
    if (isObject(res)) {
      reactive(res) // 递归遍历
    }
    track(target, key) // 收集依赖
    return res
  },

  // setter 在修改【响应式数据】时才会执行(JS 修改 => Setter)
  set(target: object, key: string, value: any, receiver: object) {
    const result = Reflect.set(target, key, value, receiver)
    trigger(target, key) // 触发依赖
    return result
  }
}
