var Vue = (function (exports) {
    'use strict';

    var isObject = function (val) { return val !== null && typeof val === 'object'; };

    // 当前的副作用函数实例，用于在 Getter 时保存起来，而且始终唯一
    var activeEffect = null;
    // 保存依赖的变量。WeakMap {target:Map} => Map {key:Set} => Set effect[]
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
    // fn 就是依赖
    var effect = function (fn) {
        var _effect = new ReactiveEffect(fn);
        // 初始化时就执行一次，触发 Getter 收集依赖
        _effect.run();
    };
    // 收集依赖
    var track = function (target, key) {
        if (!activeEffect)
            return;
        if (!targetWeakMap.get(target)) {
            targetWeakMap.set(target, new Map([[key, new Set()]]));
        }
        // 每个响应式数据，可能存在多个 effect
        targetWeakMap.get(target).get(key).add(activeEffect);
    };
    // 触发依赖
    var trigger = function (target, key) {
        var _a, _b;
        (_b = (_a = targetWeakMap
            .get(target)) === null || _a === void 0 ? void 0 : _a.get(key)) === null || _b === void 0 ? void 0 : _b.forEach(function (effect) { return effect.run(); });
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

    exports.effect = effect;
    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
