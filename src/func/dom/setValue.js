
var getValue    = require("./getValue.js"),
    toArray     = require("../array/toArray.js"),
    inArray     = require("../array/inArray.js"),
    isArray     = require("../isArray.js"),
    isNumber    = require("../isNumber.js"),
    isUndefined = require("../isUndefined.js"),
    isNull      = require("../isNull.js");

/**
 * @param {Element} el
 * @param {*} val
 */
module.exports = function() {

    var hooks = {
        select:  function(elem, value) {

            var optionSet, option,
                options     = elem.options,
                values      = toArray(value),
                i           = options.length,
                setIndex    = -1;

            while ( i-- ) {
                option = options[i];

                if ((option.selected = inArray(option.value, values))) {
                    optionSet = true;
                }
                else if (!isNull(option.getAttribute("mjs-default-option"))) {
                    setIndex = i;
                }
            }

            // Force browsers to behave consistently when non-matching value is set
            if ( !optionSet ) {

                elem.selectedIndex = setIndex;
            }
            return values;
        }
    };

    hooks["radio"] = hooks["checkbox"] = function(elem, value) {
        if (isArray(value) ) {
            return (elem.checked = inArray(getValue(elem), value));
        }
    };


    return function(el, val) {

        if (el.nodeType !== 1) {
            return;
        }

        // Treat null/undefined as ""; convert numbers to string
        if (isNull(val)) {
            val = "";
        }
        else if (isNumber(val)) {
            val += "";
        }

        var hook = hooks[el.type] || hooks[el.nodeName.toLowerCase()];

        // If set returns undefined, fall back to normal setting
        if (!hook || isUndefined(hook(el, val, "value"))) {
            el.value = val;
        }
    };
}();