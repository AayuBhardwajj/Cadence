"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports2) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports2.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports2.Component = E;
    exports2.Fragment = p;
    exports2.Profiler = r;
    exports2.PureComponent = G;
    exports2.StrictMode = q;
    exports2.Suspense = w;
    exports2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports2.act = X;
    exports2.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports2.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports2.createElement = M;
    exports2.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports2.createRef = function() {
      return { current: null };
    };
    exports2.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports2.isValidElement = O;
    exports2.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports2.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports2.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports2.unstable_act = X;
    exports2.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports2.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports2.useDebugValue = function() {
    };
    exports2.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports2.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports2.useId = function() {
      return U.current.useId();
    };
    exports2.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports2.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports2.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports2.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports2.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports2.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports2.useState = function(a) {
      return U.current.useState(a);
    };
    exports2.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports2.useTransition = function() {
      return U.current.useTransition();
    };
    exports2.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s2 = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s2 >= 1 && c >= 0 && sampleLines[s2] !== controlLines[c]) {
                c--;
              }
              for (; s2 >= 1 && c >= 0; s2--, c--) {
                if (sampleLines[s2] !== controlLines[c]) {
                  if (s2 !== 1 || c !== 1) {
                    do {
                      s2--;
                      c--;
                      if (c < 0 || sampleLines[s2] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s2].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s2 >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module2 && module2[requireString];
              enqueueTaskImpl = nodeRequire.call(module2, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports2.Children = Children;
        exports2.Component = Component;
        exports2.Fragment = REACT_FRAGMENT_TYPE;
        exports2.Profiler = REACT_PROFILER_TYPE;
        exports2.PureComponent = PureComponent;
        exports2.StrictMode = REACT_STRICT_MODE_TYPE;
        exports2.Suspense = REACT_SUSPENSE_TYPE;
        exports2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports2.act = act;
        exports2.cloneElement = cloneElement$1;
        exports2.createContext = createContext;
        exports2.createElement = createElement$1;
        exports2.createFactory = createFactory;
        exports2.createRef = createRef;
        exports2.forwardRef = forwardRef;
        exports2.isValidElement = isValidElement;
        exports2.lazy = lazy;
        exports2.memo = memo;
        exports2.startTransition = startTransition;
        exports2.unstable_act = act;
        exports2.useCallback = useCallback;
        exports2.useContext = useContext;
        exports2.useDebugValue = useDebugValue;
        exports2.useDeferredValue = useDeferredValue;
        exports2.useEffect = useEffect;
        exports2.useId = useId;
        exports2.useImperativeHandle = useImperativeHandle;
        exports2.useInsertionEffect = useInsertionEffect;
        exports2.useLayoutEffect = useLayoutEffect;
        exports2.useMemo = useMemo;
        exports2.useReducer = useReducer;
        exports2.useRef = useRef;
        exports2.useState = useState;
        exports2.useSyncExternalStore = useSyncExternalStore;
        exports2.useTransition = useTransition;
        exports2.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production_min();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.production.min.js
var require_react_jsx_runtime_production_min = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.min.js"(exports2) {
    "use strict";
    var f = require_react();
    var k = Symbol.for("react.element");
    var l = Symbol.for("react.fragment");
    var m = Object.prototype.hasOwnProperty;
    var n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
    var p = { key: true, ref: true, __self: true, __source: true };
    function q(c, a, g) {
      var b, d = {}, e = null, h = null;
      void 0 !== g && (e = "" + g);
      void 0 !== a.key && (e = "" + a.key);
      void 0 !== a.ref && (h = a.ref);
      for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
      if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
      return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
    }
    exports2.Fragment = l;
    exports2.jsx = q;
    exports2.jsxs = q;
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports2) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        var React = require_react();
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var assign = Object.assign;
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher.current;
            ReactCurrentDispatcher.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s2 = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s2 >= 1 && c >= 0 && sampleLines[s2] !== controlLines[c]) {
                c--;
              }
              for (; s2 >= 1 && c >= 0; s2--, c--) {
                if (sampleLines[s2] !== controlLines[c]) {
                  if (s2 !== 1 || c !== 1) {
                    do {
                      s2--;
                      c--;
                      if (c < 0 || sampleLines[s2] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s2].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s2 >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component) {
          var prototype = Component.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown;
        var specialPropRefWarningShown;
        var didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function warnIfStringRefCannotBeAutoConverted(config, self) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        function defineKeyPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingKey = function() {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingKey.isReactWarning = true;
            Object.defineProperty(props, "key", {
              get: warnAboutAccessingKey,
              configurable: true
            });
          }
        }
        function defineRefPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingRef = function() {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingRef.isReactWarning = true;
            Object.defineProperty(props, "ref", {
              get: warnAboutAccessingRef,
              configurable: true
            });
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function jsxDEV(type, config, maybeKey, source, self) {
          {
            var propName;
            var props = {};
            var key = null;
            var ref = null;
            if (maybeKey !== void 0) {
              {
                checkKeyStringCoercion(maybeKey);
              }
              key = "" + maybeKey;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            if (hasValidRef(config)) {
              ref = config.ref;
              warnIfStringRefCannotBeAutoConverted(config, self);
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
            if (type && type.defaultProps) {
              var defaultProps = type.defaultProps;
              for (propName in defaultProps) {
                if (props[propName] === void 0) {
                  props[propName] = defaultProps[propName];
                }
              }
            }
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
            return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
          }
        }
        var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function isValidElement(object) {
          {
            return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
          }
        }
        function getDeclarationErrorAddendum() {
          {
            if (ReactCurrentOwner$1.current) {
              var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);
              if (name) {
                return "\n\nCheck the render method of `" + name + "`.";
              }
            }
            return "";
          }
        }
        function getSourceInfoErrorAddendum(source) {
          {
            if (source !== void 0) {
              var fileName = source.fileName.replace(/^.*[\\\/]/, "");
              var lineNumber = source.lineNumber;
              return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
            }
            return "";
          }
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          {
            var info = getDeclarationErrorAddendum();
            if (!info) {
              var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
              if (parentName) {
                info = "\n\nCheck the top-level render call using <" + parentName + ">.";
              }
            }
            return info;
          }
        }
        function validateExplicitKey(element, parentType) {
          {
            if (!element._store || element._store.validated || element.key != null) {
              return;
            }
            element._store.validated = true;
            var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
            if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
              return;
            }
            ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
            var childOwner = "";
            if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
              childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
            }
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          {
            if (typeof node !== "object") {
              return;
            }
            if (isArray(node)) {
              for (var i = 0; i < node.length; i++) {
                var child = node[i];
                if (isValidElement(child)) {
                  validateExplicitKey(child, parentType);
                }
              }
            } else if (isValidElement(node)) {
              if (node._store) {
                node._store.validated = true;
              }
            } else if (node) {
              var iteratorFn = getIteratorFn(node);
              if (typeof iteratorFn === "function") {
                if (iteratorFn !== node.entries) {
                  var iterator = iteratorFn.call(node);
                  var step;
                  while (!(step = iterator.next()).done) {
                    if (isValidElement(step.value)) {
                      validateExplicitKey(step.value, parentType);
                    }
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        var didWarnAboutKeySpread = {};
        function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
          {
            var validType = isValidElementType(type);
            if (!validType) {
              var info = "";
              if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
                info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
              }
              var sourceInfo = getSourceInfoErrorAddendum(source);
              if (sourceInfo) {
                info += sourceInfo;
              } else {
                info += getDeclarationErrorAddendum();
              }
              var typeString;
              if (type === null) {
                typeString = "null";
              } else if (isArray(type)) {
                typeString = "array";
              } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
                typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
                info = " Did you accidentally export a JSX literal instead of a component?";
              } else {
                typeString = typeof type;
              }
              error("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
            var element = jsxDEV(type, props, key, source, self);
            if (element == null) {
              return element;
            }
            if (validType) {
              var children = props.children;
              if (children !== void 0) {
                if (isStaticChildren) {
                  if (isArray(children)) {
                    for (var i = 0; i < children.length; i++) {
                      validateChildKeys(children[i], type);
                    }
                    if (Object.freeze) {
                      Object.freeze(children);
                    }
                  } else {
                    error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
                  }
                } else {
                  validateChildKeys(children, type);
                }
              }
            }
            {
              if (hasOwnProperty.call(props, "key")) {
                var componentName = getComponentNameFromType(type);
                var keys = Object.keys(props).filter(function(k) {
                  return k !== "key";
                });
                var beforeExample = keys.length > 0 ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
                if (!didWarnAboutKeySpread[componentName + beforeExample]) {
                  var afterExample = keys.length > 0 ? "{" + keys.join(": ..., ") + ": ...}" : "{}";
                  error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);
                  didWarnAboutKeySpread[componentName + beforeExample] = true;
                }
              }
            }
            if (type === REACT_FRAGMENT_TYPE) {
              validateFragmentProps(element);
            } else {
              validatePropTypes(element);
            }
            return element;
          }
        }
        function jsxWithValidationStatic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, true);
          }
        }
        function jsxWithValidationDynamic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, false);
          }
        }
        var jsx2 = jsxWithValidationDynamic;
        var jsxs2 = jsxWithValidationStatic;
        exports2.Fragment = REACT_FRAGMENT_TYPE;
        exports2.jsx = jsx2;
        exports2.jsxs = jsxs2;
      })();
    }
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_jsx_runtime_production_min();
    } else {
      module2.exports = require_react_jsx_runtime_development();
    }
  }
});

// src/components/assessment/AssessmentReportPDF.tsx
var AssessmentReportPDF_exports = {};
__export(AssessmentReportPDF_exports, {
  AssessmentReportPDF: () => AssessmentReportPDF
});
module.exports = __toCommonJS(AssessmentReportPDF_exports);
var import_renderer = require("@react-pdf/renderer");
var import_jsx_runtime = __toESM(require_jsx_runtime());
var scoreColor = (score) => {
  if (score >= 70) return "#276749";
  if (score >= 30) return "#975A16";
  return "#9B2C2C";
};
var scoreDot = (score) => {
  if (score >= 70) return "\u25CF ";
  if (score >= 30) return "\u25CF ";
  return "\u25CF ";
};
var scoreDotColor = (score) => {
  if (score >= 70) return "#38A169";
  if (score >= 30) return "#D69E2E";
  return "#E53E3E";
};
var s = import_renderer.StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1A202C",
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF"
  },
  // Header
  reportHeader: {
    borderBottomWidth: 3,
    borderBottomColor: "#1A202C",
    paddingBottom: 8,
    marginBottom: 16
  },
  reportTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#1A202C"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  headerSub: { fontSize: 8, color: "#4A5568" },
  // Section heading
  sectionHeading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1A365D",
    borderBottomWidth: 2,
    borderBottomColor: "#1A202C",
    paddingBottom: 4,
    marginBottom: 12
  },
  subHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#2D3748",
    marginBottom: 6
  },
  // Grid helpers
  row: { flexDirection: "row" },
  col2: { flex: 1 },
  gap4: { marginRight: 8 },
  gap8: { marginRight: 16 },
  // Candidate info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    gap: 8
  },
  infoCell: { width: "48%", marginBottom: 6 },
  infoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2
  },
  infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1A202C" },
  // Score tiles
  tilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  tile: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#FFFFFF"
  },
  tileName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#4A5568", marginBottom: 6, minHeight: 22 },
  tileScore: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  tileScoreSuffix: { fontSize: 8, color: "#718096" },
  tileDot: { fontSize: 10, marginTop: 2 },
  // Sub-dimension bars
  dimSection: { marginBottom: 12 },
  dimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3
  },
  dimLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#2D3748" },
  dimScore: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  dimSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
    marginBottom: 2
  },
  dimSubLabel: { fontSize: 7.5, color: "#718096" },
  dimSubVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#4A5568" },
  // Progress bar
  barBg: { height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, marginTop: 2 },
  barFill: { height: 4, borderRadius: 2 },
  // Insight cards
  insightCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 10
  },
  insightHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  insightDim: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1A202C" },
  insightDef: { fontSize: 7.5, color: "#718096", fontStyle: "italic", marginBottom: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginVertical: 4 },
  insightFeedback: { fontSize: 8, color: "#2D3748", lineHeight: 1.5 },
  // MTI
  mtiAccentBox: {
    backgroundColor: "#FFF5F5",
    borderLeftWidth: 4,
    borderLeftColor: "#FC8181",
    padding: 8,
    marginBottom: 14
  },
  mtiAccentText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#742A2A" },
  mtiPattern: { borderBottomWidth: 1, borderBottomColor: "#EDF2F7", paddingBottom: 10, marginBottom: 10 },
  mtiPatternHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  mtiPatternName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#2D3748" },
  badge: { fontSize: 7, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  bulletText: { fontSize: 7.5, color: "#4A5568", marginBottom: 2, paddingLeft: 8 },
  // Transcript
  transcriptLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4
  },
  transcriptBox: {
    backgroundColor: "#F7FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 3,
    padding: 8,
    marginBottom: 10
  },
  transcriptText: { fontSize: 8, color: "#4A5568", lineHeight: 1.5, fontStyle: "italic" },
  transcriptUserText: { fontSize: 8, color: "#2D3748", lineHeight: 1.5 },
  // Error/stats sidebar tables
  darkTable: {
    backgroundColor: "#2D3748",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8
  },
  darkTableHeader: {
    backgroundColor: "#1A365D",
    padding: 6,
    alignItems: "center"
  },
  darkTableHeaderText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 0.5 },
  darkTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "5 8",
    borderBottomWidth: 1,
    borderBottomColor: "#4A5568"
  },
  darkTableLabel: { fontSize: 7.5, color: "#E2E8F0" },
  darkTableVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#FC8181" },
  lightTable: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden"
  },
  lightTableHeader: {
    backgroundColor: "#F7FAFC",
    padding: 6,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  lightTableHeaderText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#4A5568", textTransform: "uppercase", letterSpacing: 0.5 },
  lightTableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "5 8",
    borderBottomWidth: 1,
    borderBottomColor: "#F7FAFC"
  },
  lightTableLabel: { fontSize: 7, color: "#718096" },
  lightTableVal: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#2D3748" },
  // Error log table
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    padding: "5 4"
  },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#4A5568", flex: 1 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    padding: "4 4"
  },
  tableCell: { fontSize: 7, color: "#4A5568", flex: 1 },
  // Sentence breakdown
  sentenceCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4299E1",
    backgroundColor: "#F7FAFC",
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 2,
    marginBottom: 10
  },
  sentenceText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#1A202C", marginBottom: 6 },
  sentenceDetailRow: { flexDirection: "row", marginBottom: 2 },
  sentenceDetailLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#718096", width: 110 },
  sentenceDetailVal: { fontSize: 7.5, color: "#4A5568", flex: 1 },
  // Summary
  summaryScoreBox: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#BEE3F8",
    borderRadius: 4,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  summaryScoreLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#2B6CB0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryScoreVal: { fontSize: 26, fontFamily: "Helvetica-Bold", color: "#1A365D" },
  summaryScoreSuffix: { fontSize: 11, color: "#718096" },
  summaryDivider: { width: 2, height: 50, backgroundColor: "#BEE3F8", marginHorizontal: 30 },
  strengthsBox: {
    flex: 1,
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#C6F6D5",
    borderRadius: 4,
    padding: 10,
    marginRight: 8
  },
  improvementsBox: {
    flex: 1,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FED7D7",
    borderRadius: 4,
    padding: 10
  },
  strengthsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#276749", marginBottom: 6 },
  improvementsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#9B2C2C", marginBottom: 6 },
  bulletItem: { fontSize: 7.5, color: "#2D3748", marginBottom: 3, lineHeight: 1.4 },
  // Learning resources
  resourceArea: { marginBottom: 12 },
  resourceAreaTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#2D3748", marginBottom: 5 },
  resourceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 3,
    padding: "5 8",
    marginBottom: 3,
    backgroundColor: "#FFFFFF"
  },
  resourceTitle: { fontSize: 7.5, color: "#4A5568", flex: 1 },
  resourceBadge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: "#FEB2B2",
    color: "#742A2A"
  },
  // Plan
  weekCard: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "#BEE3F8",
    borderRadius: 4,
    padding: 12,
    marginBottom: 14
  },
  weekBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#4299E1",
    color: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginBottom: 6,
    letterSpacing: 0.5
  },
  weekFocus: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1A365D", marginBottom: 2 },
  weekMins: { fontSize: 7.5, color: "#2B6CB0", marginBottom: 6 },
  weekExerciseBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BEE3F8",
    borderRadius: 3,
    padding: 8
  },
  weekExerciseLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#718096", textTransform: "uppercase", marginBottom: 2 },
  weekExerciseText: { fontSize: 8, color: "#2D3748", lineHeight: 1.5 },
  // Practice exercises
  exerciseCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10
  },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  exerciseTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#2D3748", flex: 1 },
  exerciseDuration: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#C05621", backgroundColor: "#FEEBC8", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  exerciseDesc: { fontSize: 8, color: "#4A5568", lineHeight: 1.5 },
  nextTopicBox: {
    backgroundColor: "#2D3748",
    borderRadius: 4,
    padding: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center"
  },
  nextTopicLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#F6AD55", marginBottom: 2 },
  nextTopicText: { fontSize: 9, color: "#FFFFFF", fontStyle: "italic" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 6
  },
  footerText: { fontSize: 7, color: "#A0AEC0" },
  // CEFR badge inline
  cefrBadge: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2B6CB0",
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  // Interpretation cards
  interpCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8
  },
  interpDot: { fontSize: 14, marginRight: 10, marginTop: -2 },
  interpTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  interpDesc: { fontSize: 7.5, lineHeight: 1.5 }
});
var PageFooter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.footer, fixed: true, children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.footerText, children: "CADENCE SPEECH ASSESSMENT REPORT \u2014 CONFIDENTIAL" }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.footerText, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` })
] });
var SectionHeading = ({ children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.sectionHeading, children });
var DimBlock = ({ label, score, subs }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.dimSection, children: [
  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.dimHeader, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.dimLabel, children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.dimScore, { color: scoreColor(score) }], children: [
      score,
      "/100"
    ] })
  ] }),
  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: [s.barBg, { marginBottom: 4 }], children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: [s.barFill, { width: `${score}%`, backgroundColor: scoreColor(score) }] }) }),
  subs.map((sub, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.dimSubRow, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.dimSubLabel, children: sub.label }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.dimSubVal, children: [
      sub.val,
      "/100"
    ] })
  ] }, i))
] });
var AssessmentReportPDF = ({ userName, sessionId, result }) => {
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  const m = result.amcat_metrics || {
    pronunciation: { score: 0, consonant: 0, vowel: 0, stress: 0 },
    fluency: { score: 0, rate: 0, pause: 0, fillers: 0 },
    intonation: { score: 0, sentence: 0, rise_fall: 0, pitch: 0 },
    clarity: { score: 0, end_consonants: 0, enunciation: 0, pace: 0 },
    mti: { score: 0, l1_interference: 0, retroflex: 0, vowel_shift: 0 },
    relevancy: { score: 0, feedback: "" }
  };
  const insights = result.amcat_insights || [];
  const mti_deep_dive = result.amcat_mti_deep_dive || { detected_accent: "None detected", patterns: [] };
  const transcript = result.amcat_transcript || {
    reference_text: "",
    user_text: "",
    error_words: [],
    stats: { total_words: 0, speech_rate_wpm: 0, ideal_wpm_range: "130-150", total_sentences: 0, avg_sentence_duration: 0, longest_pause: 0, filler_count: 0 },
    error_summary: { mispronunciation: 0, stutters: 0, unnatural_pauses: 0, filler_words: 0, mti_substitutions: 0 }
  };
  const error_log = result.amcat_error_log || [];
  const sentences = result.amcat_sentences || [];
  const summary = result.amcat_summary || { top_strengths: [], top_improvements: [], learning_resources: [] };
  const improvement_plan = result.improvement_plan || {};
  const practice_exercises = result.practice_exercises || [];
  const tiles = [
    { name: "Topic Relevancy", score: m.relevancy?.score || 100 },
    { name: "Pronunciation Accuracy", score: m.pronunciation.score },
    { name: "MTI / Accent Neutrality", score: m.mti.score },
    { name: "Fluency & Rhythm", score: m.fluency.score },
    { name: "Intonation & Stress", score: m.intonation.score },
    { name: "Clarity & Articulation", score: m.clarity.score }
  ];
  const isMtiDetected = Boolean(
    mti_deep_dive.patterns && mti_deep_dive.patterns.length > 0
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Document, { title: `${userName} \u2014 Cadence Assessment Report`, author: "Cadence", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.reportHeader, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.reportTitle, children: "Cadence Speech Assessment Report" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.headerRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.headerSub, children: "Confidential Candidate Analysis" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.headerSub, children: [
            "Date: ",
            today
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.infoGrid, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.infoCell, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoLabel, children: "Candidate Name" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoValue, children: userName })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.infoCell, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoLabel, children: "Test ID" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoValue, children: sessionId.split("-")[0].toUpperCase() })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.infoCell, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoLabel, children: "Email" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.infoValue, { fontFamily: "Helvetica", fontSize: 9 }], children: "candidate@example.com" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.infoCell, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.infoLabel, children: "CEFR Level" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.cefrBadge, children: result.cefr_level || "B2" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "1 | Introduction" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.transcriptBox, { marginBottom: 12 }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.subHeading, children: "About This Report" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.8, color: "#4A5568", lineHeight: 1.45, marginBottom: 5 }, children: "Cadence operates on a diagnostic rather than purely evaluative philosophy. This report identifies what occurred during speech delivery, where specific patterns appeared in the recording, and what targeted drills to practice. The numeric scores are a byproduct of this diagnosis, not the primary output." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.8, color: "#4A5568", lineHeight: 1.45, marginBottom: 5 }, children: "Analysis evaluates five independent axes: Fluency & Rhythm, Pronunciation & MTI, Prosody & Intonation, Stutter & Disfluency, and Vocabulary & Grammar. These dimensions are scored separately on purpose\u2014an MTI pronunciation pattern and an unrelated stutter call for fundamentally different practice regimens, even though conventional evaluations often conflate them into a single score." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.8, color: "#4A5568", lineHeight: 1.45 }, children: "The six dashboard scores are computed deterministically from audio-derived metrics (precise millisecond word timing, acoustic pause analysis, and phonemic/WER alignment against the reference passage)\u2014never estimated or generated by an LLM. The AI's role is strictly confined to qualitative explanations, contextual insights, and coaching guidance." })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.subHeading, children: "Score Interpretation" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.5, color: "#718096", marginBottom: 6 }, children: "All scores are on a scale of 0\u2013100." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.interpCard, { backgroundColor: "#F0FFF4", borderColor: "#C6F6D5" }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDot, { color: "#38A169" }], children: "\u25CF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpTitle, { color: "#276749" }], children: "70\u2013100: Proficient" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDesc, { color: "#276749" }], children: "Candidate demonstrates clear, business-ready communication with minimal interference." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.interpCard, { backgroundColor: "#FFFFF0", borderColor: "#FAF089" }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDot, { color: "#D69E2E" }], children: "\u25CF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpTitle, { color: "#975A16" }], children: "30\u201369: Developing" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDesc, { color: "#975A16" }], children: "Candidate is intelligible but demonstrates noticeable issues requiring targeted practice." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.interpCard, { backgroundColor: "#FFF5F5", borderColor: "#FED7D7" }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDot, { color: "#E53E3E" }], children: "\u25CF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpTitle, { color: "#9B2C2C" }], children: "0\u201329: Needs Significant Work" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.interpDesc, { color: "#9B2C2C" }], children: "Candidate's speech frequently impedes comprehension; foundational training required." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "Score Dashboard" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.subHeading, children: "Core Competency Scores" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.tilesRow, children: tiles.map((tile) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.tile, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.tileName, children: tile.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.row, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.tileScore, { color: scoreColor(tile.score) }], children: tile.score }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.tileScoreSuffix, children: "/100" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.tileDot, { color: scoreDotColor(tile.score) }], children: scoreDot(tile.score) })
      ] }, tile.name)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.subHeading, children: "Detailed Sub-Dimensions" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.col2, s.gap8], children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DimBlock, { label: "Pronunciation Accuracy", score: m.pronunciation.score, subs: [
            { label: "Consonant Accuracy", val: m.pronunciation.consonant },
            { label: "Vowel Accuracy", val: m.pronunciation.vowel },
            { label: "Word Stress", val: m.pronunciation.stress }
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DimBlock, { label: "Fluency & Rhythm", score: m.fluency.score, subs: [
            { label: "Speech Rate (WPM)", val: m.fluency.rate },
            { label: "Pause Pattern", val: m.fluency.pause },
            { label: "Filler Word Control", val: m.fluency.fillers }
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DimBlock, { label: "MTI / Accent Neutrality", score: m.mti.score, subs: [
            { label: "L1 Phoneme Substitution", val: m.mti.l1_interference },
            { label: "Retroflex Influence", val: m.mti.retroflex },
            { label: "Vowel Shift Frequency", val: m.mti.vowel_shift }
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.col2, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DimBlock, { label: "Intonation & Stress", score: m.intonation.score, subs: [
            { label: "Sentence Stress", val: m.intonation.sentence },
            { label: "Rise/Fall Patterns", val: m.intonation.rise_fall },
            { label: "Pitch Variation", val: m.intonation.pitch }
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DimBlock, { label: "Clarity & Articulation", score: m.clarity.score, subs: [
            { label: "Consonant Endings", val: m.clarity.end_consonants },
            { label: "Vowel Enunciation", val: m.clarity.enunciation },
            { label: "Pace Control", val: m.clarity.pace }
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "2 | Insights" }),
      insights.length > 0 ? insights.map((insight, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.insightCard, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.insightHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.insightDim, children: insight.dimension }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.dimScore, { color: scoreColor(insight.score) }], children: [
            insight.score,
            "/100"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.insightDef, children: insight.definition }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.divider }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.insightFeedback, children: insight.feedback })
      ] }, idx)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8, color: "#A0AEC0", fontStyle: "italic" }, children: "Per-dimension insights are not available in this analysis mode." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    isMtiDetected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "MTI Deep Dive" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.mtiAccentBox, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.mtiAccentText, children: [
        "Detected L1 Influence: ",
        mti_deep_dive.detected_accent || "No obvious accent detected"
      ] }) }),
      mti_deep_dive.patterns.length > 0 ? mti_deep_dive.patterns.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.mtiPattern, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.mtiPatternHeader, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.mtiPatternName, children: item.pattern }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.badge, {
            backgroundColor: item.score > 60 ? "#FED7D7" : item.score > 30 ? "#FEFCBF" : "#C6F6D5",
            color: item.score > 60 ? "#742A2A" : item.score > 30 ? "#744210" : "#276749"
          }], children: [
            "Score: ",
            item.score
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.barBg, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: [s.barFill, { width: `${item.score}%`, backgroundColor: item.score > 60 ? "#FC8181" : item.score > 30 ? "#F6E05E" : "#68D391" }] }) }),
        item.behaviors?.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.bulletText, children: [
          "\u2022 ",
          b
        ] }, i))
      ] }, idx)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8, color: "#A0AEC0", fontStyle: "italic" }, children: "No specific MTI patterns detected." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "3 | Response" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.row, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.col2, s.gap8], children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.transcriptLabel, children: "Paragraph Displayed to Candidate:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.transcriptBox, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.transcriptText, children: [
            '"',
            transcript.reference_text || "Reference passage text is not available for this session.",
            '"'
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.transcriptLabel, children: "Candidate's Transcription (Auto-generated):" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: [s.transcriptBox, { backgroundColor: "#FFFFFF" }], children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.transcriptUserText, children: transcript.user_text || "Transcription unavailable." }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { width: 140 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.darkTable, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.darkTableHeader, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.darkTableHeaderText, children: "Error Summary" }) }),
            [
              { label: "Mispronunciation", val: transcript.error_summary?.mispronunciation || 0 },
              { label: "Vocabulary Errors", val: transcript.error_summary?.vocabulary_errors || 0 },
              { label: "Stutters/Repetitions", val: transcript.error_summary?.stutters || 0 },
              { label: "Unnatural Pauses", val: transcript.error_summary?.unnatural_pauses || 0 },
              { label: "Filler Words", val: transcript.error_summary?.filler_words || 0 },
              { label: "MTI Substitutions", val: transcript.error_summary?.mti_substitutions || 0 }
            ].map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.darkTableRow, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.darkTableLabel, children: row.label }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.darkTableVal, children: row.val })
            ] }, i))
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.lightTable, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.lightTableHeader, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.lightTableHeaderText, children: "Speech Statistics" }) }),
            [
              { label: "Total Words", val: String(transcript.stats?.total_words || "N/A") },
              { label: "Speech Rate", val: `${transcript.stats?.speech_rate_wpm || "N/A"} WPM` },
              { label: "Ideal Range", val: transcript.stats?.ideal_wpm_range || "130-150" },
              { label: "Total Sentences", val: String(transcript.stats?.total_sentences || "N/A") },
              { label: "Avg Sentence", val: `${transcript.stats?.avg_sentence_duration || "N/A"} sec` },
              { label: "Longest Pause", val: `${transcript.stats?.longest_pause || "N/A"} sec` }
            ].map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.lightTableRow, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.lightTableLabel, children: row.label }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.lightTableVal, children: row.val })
            ] }, i))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "Word-Level Error Log" }),
      (() => {
        const visibleErrors = (error_log || []).filter((err) => !err.excluded_from_scoring);
        const omissionEntry = (error_log || []).find((err) => err.error_type === "large_omission");
        const omittedCount = omissionEntry && omissionEntry.word ? omissionEntry.word.trim().split(/\s+/).length : 0;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
          omissionEntry && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { backgroundColor: "#FFFAF0", borderWidth: 1, borderColor: "#FBD38D", borderRadius: 4, padding: 8, marginBottom: 12 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#DD6B20", marginBottom: 2 }, children: "Passage Completion Notice" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 7.5, color: "#9C4221" }, children: [
              "Approximately ",
              omittedCount,
              " words of the reference passage were not read in this recording."
            ] })
          ] }),
          visibleErrors.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8, color: "#A0AEC0", fontStyle: "italic" }, children: "No specific word-level errors were heavily detected." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.tableHeaderRow, children: ["Timestamp", "Word", "Said As", "Correct IPA", "Error Type", "Severity"].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.tableHeaderCell, children: h }, h)) }),
            visibleErrors.map((err, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.tableRow, { backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#F7FAFC" }], children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.tableCell, { color: "#A0AEC0" }], children: err.timestamp }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.tableCell, { fontFamily: "Helvetica-Bold" }], children: [
                '"',
                err.word,
                '"'
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.tableCell, { color: "#E53E3E" }], children: [
                '"',
                err.said_as,
                '"'
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [s.tableCell, { color: "#38A169" }], children: [
                '"',
                err.correct_ipa,
                '"'
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.tableCell, children: [
                err.error_type,
                " (",
                err.category,
                ")"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.tableCell, {
                color: err.severity === "major" ? "#E53E3E" : err.severity === "moderate" ? "#D69E2E" : "#718096",
                fontFamily: "Helvetica-Bold"
              }], children: err.severity })
            ] }, i))
          ] })
        ] });
      })(),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "Sentence-by-Sentence Breakdown" }),
      sentences.length > 0 ? sentences.map((sentence, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.sentenceCard, wrap: false, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.sentenceText, children: [
          "Sentence ",
          idx + 1,
          ': "',
          sentence.text,
          '"'
        ] }),
        [
          { label: "Pronunciation Issues:", val: sentence.pronunciation_issues },
          { label: "Fluency:", val: sentence.fluency },
          { label: "MTI Detected:", val: sentence.mti_detected },
          { label: "Rhythm:", val: sentence.rhythm },
          { label: "Intonation:", val: sentence.intonation }
        ].map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.sentenceDetailRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.sentenceDetailLabel, children: row.label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.sentenceDetailVal, children: row.val })
        ] }, i))
      ] }, idx)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8, color: "#A0AEC0", fontStyle: "italic" }, children: "Sentence-level analysis is not available for this session." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", style: s.page, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHeading, { children: "4 | Learning Resources" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.summaryScoreBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { alignItems: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.summaryScoreLabel, children: "Overall Speech Score" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.row, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.summaryScoreVal, children: result.overall_score || 58 }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.summaryScoreSuffix, children: "/100" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: s.summaryDivider }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { alignItems: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.summaryScoreLabel, children: "CEFR Speaking Level" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.summaryScoreVal, children: result.cefr_level || "B1" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [s.row, { marginBottom: 14 }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.strengthsBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.strengthsTitle, children: "\u2713  Top Strengths" }),
          summary.top_strengths?.length > 0 ? summary.top_strengths.map((str, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.bulletItem, children: [
            "\u2022 ",
            str
          ] }, i)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.bulletItem, children: "No defined strengths collected." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.improvementsBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.improvementsTitle, children: "!  Priority Improvements" }),
          summary.top_improvements?.length > 0 ? summary.top_improvements.map((imp, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.bulletItem, children: [
            "\u2022 ",
            imp
          ] }, i)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.bulletItem, children: "No priority improvements derived." })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.subHeading, children: "Personalized Learning Resources" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.5, color: "#718096", marginBottom: 8 }, children: "Based on detected weaknesses, we recommend the following resources:" }),
      summary.learning_resources?.length > 0 ? summary.learning_resources.map((res, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.resourceArea, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: s.resourceAreaTitle, children: res.area }),
        res.items?.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: s.resourceItem, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: s.resourceTitle, children: [
            "\u25B6  ",
            item.title
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [s.resourceBadge, {
            backgroundColor: item.type === "YouTube" ? "#FEB2B2" : item.type === "Paid | App" ? "#BEE3F8" : "#E2E8F0",
            color: item.type === "YouTube" ? "#742A2A" : item.type === "Paid | App" ? "#1A365D" : "#4A5568"
          }], children: item.type })
        ] }, i))
      ] }, idx)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 8, color: "#A0AEC0", fontStyle: "italic" }, children: "No specific learning resources matched yet." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageFooter, {})
    ] })
  ] });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AssessmentReportPDF
});
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
