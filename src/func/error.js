
var async = require("./async.js"),
    strUndef = require("../var/strUndef.js");

module.exports = (function(){

    var listeners = [];

    var error = function error(e) {

        var i, l;

        for (i = 0, l = listeners.length; i < l; i++) {
            listeners[i][0].call(listeners[i][1], e);
        }

        var stack = e.stack || (new Error).stack;

        if (typeof console != strUndef && console.log) {
            async(function(){
                console.log(e);
                if (stack) {
                    console.log(stack);
                }
            });
        }
        else {
            throw e;
        }
    };

    error.on = function(fn, context) {
        error.un(fn, context);
        listeners.push([fn, context]);
    };

    error.un = function(fn, context) {
        var i, l;
        for (i = 0, l = listeners.length; i < l; i++) {
            if (listeners[i][0] === fn && listeners[i][1] === context) {
                listeners.splice(i, 1);
                break;
            }
        }
    };

    return error;
}());

