export type EffectScheduler = (...arg: any[]) => any

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
  public isComputed = false
  constructor(public fn: () => void, public scheduler: EffectScheduler | null = null) {}
  run() {
    // new 执行时，this 会指向实例
    activeEffect = this
    return this.fn()
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
  const effects = targetWeakMap.get(target)?.get(key)
  effects && triggerEffects(effects)
}

export function triggerEffects(effects: Set<ReactiveEffect>) {
  effects.forEach(effect => effect.isComputed && triggerEffect(effect)) // 先执行 computed 的 effect，防止死循环（_dirty 为 true 无效执行；为什么不能直接使用 filter？）
  effects.forEach(effect => !effect.isComputed && triggerEffect(effect))
}

export function triggerEffect(effect: ReactiveEffect) {
  /**
   * 1、存在调度器就执行调试函数（computed；watch)
   * 2、调度器的本质，就是不去执行 run 函数，而是转去触发 computed 或者 watch 收集在 dep 中的依赖，即 effectCallback
   * 3、computed 执行逻辑：
   *  （1）执行 computed 函数，创建 computedRefImpl 实例
   *  （2）实例中通过 ReactiveEffect 初始化了自己的 effect，初始化时传入的两个参数分别为 computedCallback 和 scheduler
   *  （3）实例中维护了 _dirty，初始值为 true，另外，还维护了 _value 和 dep，分别用于保存计算值和收集到的依赖
   *  （4）执行 effect 函数，通过 .value 读取 computed 的值，此时依赖为 effectCallback
   *  （5）触发 computed 的 getValue 函数，将 effectCallback 收集到 computedRefImpl 实例的 dep 中，dep 为一个 Set
   *  （6）判断 _dirty 为 true，然后将 _dirty 设置为 false，然后执行自己的 effect，即 this.effect.run()
   *  （7）在 run 方法中，会将依赖重新指向 computedEffectCallback，并返回计算值
   *  （8）即 ref 或 reactive 绑定的依赖是 computedEffectCallback
   *  （9）修改 ref 或 reactive 时，会先触发 computedEffectCallback，再通过 scheduler 去执行 effectCallback，从而实现响应式
   *  （10）再次调用 computedGetter 时，由于 _dirty 为 false，所以里面的逻辑不会再执行，直接返回 _value
   *   (11) 注意事项：computedRefImpl 通过 _dirty 去实现 computed 的缓存功能，即如果在同一时间，同时读取两次 computedRef.value，那么，由于第二次 _dirty 为 false，所以，就只会计算一次，第二次直接返回计算值。但是这里面有一个问题，就是，computedRefImpl 第一次收集到的依赖是 effectCallback，第二次，由于执行了 this.effect.run()，收集到的依赖会变成 computedCallback。这里面就存在一个死循环的问题，在 effectCallback-computedCallback-effectCallback 会反复执行。解决方法是，在执行 computedRefImpl 中的依赖时，如果存在 computedCallback 就先执行，后面再执行 effectCallback。虽然说会导致 computedCallback 执行两次甚至多次，但性能影响应该不大，因为 computedCallback 的目的，只是为了通过 scheduler 去执行 effectCallback，同时，由于 _dirty 在第二次就为 true 了，所以也不会重新执行 effectCallback
   */
  if (effect.scheduler) {
    effect.scheduler()
  }
  // ref 和 reactive
  else {
    effect.run()
  }
}
