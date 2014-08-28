

var nsAdd = require("../../../metaphorjs-namespace/src/func/nsAdd.js"),
    getRegExp = require("../func/getRegExp.js");

nsAdd("filter.toList", function(input, scope, sep, limit) {

    limit       = limit || undefined;
    sep         = sep || "/\\n|,/";

    if (!input) {
        return [];
    }

    input       = "" + input;

    if (sep.substr(0,1) == '/' && sep.substr(sep.length - 1) == "/") {
        sep = getRegExp(sep.substring(1, sep.length-1));
    }

    var list = input.split(sep, limit),
        i, l;

    for (i = -1, l = list.length; ++i < l; list[i] = trim(list[i])){}

    return list;
});