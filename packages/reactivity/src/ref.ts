import { isObject } from '@vue/shared'
import { addEffectFn, ReactiveEffect } from './effect'
import { reactive } from './reactive'

// 普通对象返回自身，对象转换成 reactive
const toReactive = (value: any) => {
  return isObject(value) ? reactive(value) : value
}

// Ref 实现类
class RefImpl {
  private _v_isRef = true // 固定值，判断是否是 RefImpl
  private dep = new Set<ReactiveEffect>() // 依赖保存到 Set 中
  private _value
  private _isShallow
  constructor(rawValue, isShallow) {
    this._isShallow = isShallow
    // 如果是浅层，则都不生成 reactive，可以减少性能消耗
    this._value = this._isShallow ? rawValue : toReactive(rawValue)
  }
  get value() {
    addEffectFn(this.dep) // 收集依赖
    return this._value
  }
  set value(newValue) {
    this._value = this._isShallow ? newValue : toReactive(newValue)
    this.dep.forEach(effect => effect.run()) // 触发依赖
  }
}

export const ref = (rawValue: any, isShallow = false) => {
  // 如果 ref 参数传入的是一个 RefImpl，则返回它本身
  if (rawValue?._v_isRef) {
    return rawValue
  }
  return new RefImpl(rawValue, isShallow)
}

export const shallowRef = (rawValue: any) => {
  return ref(rawValue, true)
}
