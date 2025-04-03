var Vue = (function (exports) {
    'use strict';

    var isObject = function (val) { return val !== null && typeof val === 'object'; };
    var isFunction = function (val) { return typeof val === 'function'; };

    // 当前的副作用函数实例，用于在 Getter 时保存起来，而且始终唯一
    var activeEffect = null;
    // 保存依赖的变量。WeakMap {target:Map} => Map {key:Set} => Set _effect[]
    // 使用 WeakMap 的原因：弱引用，不使用时可被垃圾回收
    // 使用 Map 的原因：键集对的集合
    // 使用 Set 的原因：去重
    var targetWeakMap = new WeakMap();
    // 声明类的同时，也声明了类型
    var ReactiveEffect = /** @class */ (function () {
        function ReactiveEffect(fn, scheduler) {
            if (scheduler === void 0) { scheduler = null; }
            this.fn = fn;
            this.scheduler = scheduler;
            // fn 是 new 时传入的参数，会自动转换成类的公共属性
            this.isComputed = false;
        }
        ReactiveEffect.prototype.run = function () {
            // new 执行时，this 会指向实例
            activeEffect = this;
            return this.fn();
        };
        return ReactiveEffect;
    }());
    // fn 就是依赖(核心)
    var effect = function (fn) {
        var _effect = new ReactiveEffect(fn);
        // 初始化时就执行一次，触发 Getter 收集依赖
        _effect.run();
    };
    // 添加副作用函数进 Set
    // 无论是 reactive，还是 ref，activeEffect 都是保存进 Set
    // reactive 的 Set 在 WeakMap 中，ref 的 Set 在 RefImpl 的 def 中
    var addEffectFn = function (set) {
        activeEffect && set.add(activeEffect);
    };
    // 收集依赖
    var track = function (target, key) {
        if (!activeEffect)
            return;
        if (!targetWeakMap.get(target)) {
            targetWeakMap.set(target, new Map([[key, new Set()]]));
        }
        // 每个响应式数据，可能存在多个 _effect
        addEffectFn(targetWeakMap.get(target).get(key));
    };
    // 触发依赖
    var trigger = function (target, key) {
        var _a;
        var effects = (_a = targetWeakMap.get(target)) === null || _a === void 0 ? void 0 : _a.get(key);
        effects && triggerEffects(effects);
    };
    function triggerEffects(effects) {
        effects.forEach(function (effect) { return effect.isComputed && triggerEffect(effect); }); // 先执行 computed 的 effect，防止死循环（_dirty 为 true 无效执行；为什么不能直接使用 filter？）
        effects.forEach(function (effect) { return !effect.isComputed && triggerEffect(effect); });
    }
    function triggerEffect(effect) {
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
            effect.scheduler();
        }
        // ref 和 reactive
        else {
            effect.run();
        }
    }

    var mutableHandlers = {
        // getter 在读取【响应式数据】时才会执行（初始化 => template 模板 => effect 函数 => Getter）
        get: function (target, key, receiver) {
            var res = Reflect.get(target, key, receiver);
            if (isObject(res)) {
                reactive(res); // 递归遍历
            }
            track(target, key); // 收集依赖
            return res;
        },
        // setter 在修改【响应式数据】时才会执行(JS 修改 => Setter)
        set: function (target, key, value, receiver) {
            var result = Reflect.set(target, key, value, receiver);
            trigger(target, key); // 触发依赖
            return result;
        }
    };

    var proxyMap = new WeakMap();
    var reactive = function (target) {
        if (proxyMap.has(target)) {
            return proxyMap.get(target);
        }
        else {
            var proxy = new Proxy(target, mutableHandlers);
            proxyMap.set(target, proxy);
            return proxy;
        }
    };

    // 普通对象返回自身，对象转换成 reactive
    var toReactive = function (value) {
        return isObject(value) ? reactive(value) : value;
    };
    // Ref 实现类
    var RefImpl = /** @class */ (function () {
        function RefImpl(rawValue, isShallow) {
            this._v_isRef = true; // 固定值，判断是否是 RefImpl
            this.dep = new Set(); // 依赖保存到 Set 中
            this._isShallow = isShallow;
            // 如果是浅层，则都不生成 reactive，可以减少性能消耗
            this._value = this._isShallow ? rawValue : toReactive(rawValue);
        }
        Object.defineProperty(RefImpl.prototype, "value", {
            get: function () {
                addEffectFn(this.dep); // 收集依赖
                return this._value;
            },
            set: function (newValue) {
                this._value = this._isShallow ? newValue : toReactive(newValue);
                this.dep.forEach(function (effect) { return triggerEffect(effect); }); // 触发依赖
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    var ref = function (rawValue, isShallow) {
        if (isShallow === void 0) { isShallow = false; }
        // 如果 ref 参数传入的是一个 RefImpl，则返回它本身
        if (rawValue === null || rawValue === void 0 ? void 0 : rawValue._v_isRef) {
            return rawValue;
        }
        return new RefImpl(rawValue, isShallow);
    };

    var ComputedRefImpl = /** @class */ (function () {
        function ComputedRefImpl(callback) {
            var _this = this;
            this._dirty = true;
            this._v_isComp = true;
            this.dep = new Set(); // EffectCallback
            this.effect = new ReactiveEffect(callback, function () {
                if (!_this._dirty) {
                    _this._dirty = true;
                    triggerEffects(_this.dep); // 触发依赖
                }
            });
            this.effect.isComputed = true;
        }
        Object.defineProperty(ComputedRefImpl.prototype, "value", {
            get: function () {
                addEffectFn(this.dep); // 收集依赖
                if (this._dirty) {
                    this._dirty = false;
                    this._value = this.effect.run(); // 给 ref 或 reactive 添加依赖 ComputedEffectCallback
                }
                return this._value;
            },
            enumerable: false,
            configurable: true
        });
        return ComputedRefImpl;
    }());
    var computed = function (options) {
        var getter;
        if (isFunction(options)) {
            getter = options;
        }
        return new ComputedRefImpl(getter);
    };

    exports.computed = computed;
    exports.effect = effect;
    exports.reactive = reactive;
    exports.ref = ref;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
