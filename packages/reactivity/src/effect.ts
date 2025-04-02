import { isObject } from '@vue/shared'
import { reactive } from './reactive'

// 当前的副作用函数实例，用于在 Getter 时保存起来，而且始终唯一
export let activeEffect: ReactiveEffect | null = null

// 保存依赖的变量。WeakMap {target:Map} => Map {key:Set} => Set _effect[]
// 使用 WeakMap 的原因：弱引用，不使用时可被垃圾回收
// 使用 Map 的原因：键集对的集合
// 使用 Set 的原因：去重
export const targetWeakMap = new WeakMap()

// 声明类的同时，也声明了类型
export class ReactiveEffect {
  // fn 是 new 时传入的参数，会自动转换成类的公共属性
  constructor(public fn: () => void) {}
  run() {
    // new 执行时，this 会指向实例
    activeEffect = this
    this.fn()
  }
}

// fn 就是依赖(核心)
export const effect = (fn: () => void): void => {
  const _effect = new ReactiveEffect(fn)
  // 初始化时就执行一次，触发 Getter 收集依赖
  _effect.run()
}

// 添加副作用函数进 Set
// 无论是 reactive，还是 ref，activeEffect 都是保存进 Set
// reactive 的 Set 在 WeakMap 中，ref 的 Set 在 RefImpl 的 def 中
export const addEffectFn = (set: Set<ReactiveEffect>) => {
  activeEffect && set.add(activeEffect)
}

// 收集依赖
export const track = (target: object, key: string) => {
  if (!activeEffect) return
  if (!targetWeakMap.get(target)) {
    targetWeakMap.set(target, new Map([[key, new Set()]]))
  }
  // 每个响应式数据，可能存在多个 _effect
  addEffectFn(targetWeakMap.get(target).get(key))
}

// 触发依赖
export const trigger = (target: object, key: string) => {
  targetWeakMap
    .get(target)
    ?.get(key)
    ?.forEach(_effect => _effect.run())
}
