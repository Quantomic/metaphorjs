
var isFunction = require("./isFunction.js");

/**
 * @param {*} any
 * @returns {boolean}
 */
module.exports = function isInjectable(any) {
    return any && ((any.length && isFunction(any[any.length - 1])) ||
                    any.inject);
};