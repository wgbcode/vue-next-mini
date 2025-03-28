var Vue = (function (exports) {
    'use strict';

    var isObject = function (val) { return val !== null && typeof val === 'object'; };

    var mutableHandlers = {
        get: function (target, key, receiver) {
            var res = Reflect.get(target, key, receiver);
            if (isObject(res)) {
                reactive(res); // 递归遍历
            }
            return res;
        },
        set: function (target, key, value, receiver) {
            var result = Reflect.set(target, key, value, receiver);
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

    exports.reactive = reactive;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=vue.js.map
