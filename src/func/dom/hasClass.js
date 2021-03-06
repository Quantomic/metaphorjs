
var getClsReg = require("./getClsReg.js");

/**
 * @param {Element} el
 * @param {String} cls
 * @returns {boolean}
 */
module.exports = function hasClass(el, cls) {
    return cls ? getClsReg(cls).test(el.className) : false;
};