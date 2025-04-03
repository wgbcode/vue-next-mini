import { isFunction } from '@vue/shared'
import { addEffectFn, ReactiveEffect, triggerEffects } from './effect'

class ComputedRefImpl {
  public _value
  public _dirty = true
  public readonly _v_isComp = true
  public dep = new Set<ReactiveEffect>() // EffectCallback
  public readonly effect
  constructor(callback) {
    this.effect = new ReactiveEffect(callback, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerEffects(this.dep) // 触发依赖
      }
    })
    this.effect.isComputed = true
  }
  get value() {
    addEffectFn(this.dep) // 收集依赖
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run() // 给 ref 或 reactive 添加依赖 ComputedEffectCallback
    }
    return this._value
  }
}

export const computed = options => {
  let getter
  if (isFunction(options)) {
    getter = options
  }
  return new ComputedRefImpl(getter)
}
