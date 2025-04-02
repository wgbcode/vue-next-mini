var Vue = (function (exports) {
    'use strict';

    var isObject = function (val) { return val !== null && typeof val === 'object'; };

    // 当前的副作用函数实例，用于在 Getter 时保存起来，而且始终唯一
    var activeEffect = null;
    // 保存依赖的变量。WeakMap {target:Map} => Map {key:Set} => Set _effect[]
    // 使用 WeakMap 的原因：弱引用，不使用时可被垃圾回收
    // 使用 Map 的原因：键集对的集合
    // 使用 Set 的原因：去重
    var targetWeakMap = new WeakMap();
    // 声明类的同时，也声明了类型
    var ReactiveEffect = /** @class */ (function () {
        // fn 是 new 时传入的参数，会自动转换成类的公共属性
        function ReactiveEffect(fn) {
            this.fn = fn;
        }
        ReactiveEffect.prototype.run = function () {
            // new 执行时，this 会指向实例
            activeEffect = this;
            this.fn();
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
        var _a, _b;
        (_b = (_a = targetWeakMap
            .get(target)) === null || _a === void 0 ? void 0 : _a.get(key)) === null || _b === void 0 ? void 0 : _b.forEach(function (_effect) { return _effect.run(); });
    };

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
                this.dep.forEach(function (effect) { return effect.run(); }); // 触发依赖
            },
            enumerable: false,
            configurable: true
        });
        return RefImpl;
    }());
    var ref = function (rawValue) {
        // 如果 ref 参数传入的是一个 RefImpl，则返回它本身
        if (rawValue === null || rawValue === void 0 ? void 0 : rawValue._v_isRef) {
            return rawValue;
        }
        return new RefImpl(rawValue, false);
    };

    exports.effect = effect;
    exports.reactive = reactive;
    exports.ref = ref;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
