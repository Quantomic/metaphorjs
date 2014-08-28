

var bind = require("../func/bind.js"),
    isThenable = require("../func/isThenable.js"),
    slice = require("../func/array/slice.js"),
    Promise = require("../../../metaphorjs-promise/src/metaphorjs.promise.js"),
    isObject = require("../func/isObject.js"),
    isFunction = require("../func/isFunction.js"),
    isUndefined = require("../func/isUndefined.js"),
    isBool = require("../func/isBool.js");


module.exports = function(){

    var VALUE       = 1,
        CONSTANT    = 2,
        FACTORY     = 3,
        SERVICE     = 4,
        PROVIDER    = 5,
        globalProvider;

    var Provider = function() {
        this.store  = {};
    };

    Provider.prototype = {

        store: null,

        getApi: function() {

            var self = this;

            return {
                value: bind(self.value, self),
                constant: bind(self.constant, self),
                factory: bind(self.factory, self),
                service: bind(self.service, self),
                provider: bind(self.provider, self),
                resolve: bind(self.resolve, self),
                inject: bind(self.inject, self)
            };
        },

        instantiate: function(fn, args) {
            var Temp = function(){},
                inst, ret;

            Temp.prototype  = fn.prototype;
            inst            = new Temp;
            ret             = fn.prototype.constructor.apply(inst, args);

            // If an object has been returned then return it otherwise
            // return the original instance.
            // (consistent with behaviour of the new operator)
            return isObject(ret) ? ret : inst;
        },

        inject: function(injectable, context, returnInstance, currentValues, callArgs) {

            currentValues   = currentValues || {};
            callArgs        = callArgs || [];

            if (isFunction(injectable)) {

                if (injectable.inject) {
                    var tmp = slice.call(injectable.inject);
                    tmp.push(injectable);
                    injectable = tmp;
                }
                else {
                    return returnInstance || injectable.__isMetaphorClass ?
                        this.instantiate(injectable, callArgs) :
                        injectable.apply(context, callArgs);
                }
            }

            injectable  = slice.call(injectable);

            var self    = this,
                values  = [],
                fn      = injectable.pop(),
                i, l;

            for (i = -1, l = injectable.length; ++i < l;
                 values.push(self.resolve(injectable[i], currentValues))) {}

            return Promise.all(values).then(function(values){
                return returnInstance || fn.__isMetaphorClass ?
                    self.instantiate(fn, values) :
                    fn.apply(context, values);
            });
        },

        value: function(name, value) {
            this.store[name] = {
                type: VALUE,
                value: value
            };
        },

        constant: function(name, value) {
            var store = this.store;
            if (!store[name]) {
                store[name] = {
                    type: CONSTANT,
                    value: value
                };
            }
        },

        factory: function(name, fn, context, singleton) {

            if (isBool(context)) {
                singleton = context;
                context = null;
            }

            this.store[name] = {
                type: FACTORY,
                singleton: singleton,
                fn: fn,
                context: context
            };
        },

        service: function(name, constr, singleton) {
            this.store[name] = {
                type: SERVICE,
                singleton: singleton,
                fn: constr
            };
        },

        provider: function(name, constr) {

            this.store[name + "Provider"] = {
                name: name,
                type: PROVIDER,
                fn: constr,
                instance: null
            };
        },


        resolve: function(name, currentValues) {

            var self    = this,
                store   = self.store,
                type,
                item,
                res;

            if (!isUndefined(currentValues[name])) {
                return currentValues[name];
            }

            if (item = store[name]) {

                type    = item.type;

                if (type == VALUE || type == CONSTANT) {
                    return item.value;
                }
                else if (type == FACTORY) {
                    res = self.inject(item.fn, item.context, false, currentValues);
                }
                else if (type == SERVICE) {
                    res = self.inject(item.fn, null, true, currentValues);
                }
                else if (type == PROVIDER) {

                    if (!item.instance) {

                        item.instance = Promise.resolve(
                                self.inject(item.fn, null, true, currentValues)
                            )
                            .done(function(instance){
                                item.instance = instance;
                                store[item.name] = {
                                    type: FACTORY,
                                    fn: instance.$get,
                                    context: instance
                                };
                            });
                    }

                    return item.instance;
                }

                if (item.singleton) {
                    item.type = VALUE;
                    item.value = res;

                    if (type == FACTORY && isThenable(res)) {
                        res.done(function(value){
                            item.value = value;
                        });
                    }
                }

                return currentValues[name] = res;
            }
            else {

                if (store[name + "Provider"]) {
                    self.resolve(name + "Provider", currentValues);
                    return self.resolve(name, currentValues);
                }

                if (self === globalProvider) {
                    throw "Could not provide value for " + name;
                }
                else {
                    return globalProvider.resolve(name);
                }
            }
        },

        destroy: function() {
            delete this.store;
            delete this.scope;
        }

    };

    Provider.global = function() {
        return globalProvider;
    };

    globalProvider = new Provider;

    MetaphorJs.lib.Provider = Provider;

    return Provider;
}();

