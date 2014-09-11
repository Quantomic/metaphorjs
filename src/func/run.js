
var onReady = require("../func/dom/onReady.js"),
    initApp = require("../func/initApp.js"),
    select  = require("../../../metaphorjs-select/src/metaphorjs.select.js"),
    attr = require("../func/dom/attr.js");

module.exports = function() {

    onReady(function() {

        var appNodes    = select("[mjs-app]"),
            i, l, el,
            done        = function(app) {
                app.run();
            };

        for (i = -1, l = appNodes.length; ++i < l;){
            el      = appNodes[i];
            initApp(el, attr(el, "mjs-app")).done(done);
        }
    });

};