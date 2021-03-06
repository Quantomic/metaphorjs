

var data = require("../func/dom/data.js"),
    toFragment = require("../func/dom/toFragment.js"),
    clone = require("../func/dom/clone.js"),
    toArray = require("../func/array/toArray.js"),
    animate = require("metaphorjs-animate/src/func/animate.js"),
    extend = require("../func/extend.js"),
    nextUid = require("../func/nextUid.js"),
    trim = require("../func/trim.js"),
    createGetter = require("metaphorjs-watchable/src/func/createGetter.js"),
    createWatchable = require("metaphorjs-watchable/src/func/createWatchable.js"),
    Renderer = require("./Renderer.js"),
    Cache = require("../lib/Cache.js"),
    Promise = require("metaphorjs-promise/src/lib/Promise.js"),
    Observable = require("metaphorjs-observable/src/lib/Observable.js"),
    ajax = require("metaphorjs-ajax/src/func/ajax.js"),
    ns = require("metaphorjs-namespace/src/var/ns.js"),
    removeAttr = require("../func/dom/removeAttr.js"),
    defineClass = require("metaphorjs-class/src/func/defineClass.js"),
    select = require("metaphorjs-select/src/func/select.js"),
    getAttr = require("../func/dom/getAttr.js"),
    setAttr = require("../func/dom/setAttr.js");




module.exports = function(){

    var observable      = new Observable,
        cache           = new Cache,
        options         = {},

        getFragmentContent  = function(frg) {
            var div = window.document.createElement("div");
            div.appendChild(clone(frg));
            return div.innerHTML;
        },

        resolveInclude  = function(cmt, tplId) {
            var frg = getTemplate(trim(tplId));
            if (!frg) {
                return "";
            }
            if (typeof frg == "string") {
                return frg;
            }
            return getFragmentContent(frg);
        },

        resolveIncludes = function(tpl) {
            return tpl.replace(/<!--\s*include (.+?)-->/ig, resolveInclude);
        },

        getTemplate     = function(tplId) {

            var tpl = cache.get(tplId),
                opt = options[tplId];

            if (typeof tpl == "function") {
                tpl = tpl(tplId);
            }
            if (typeof tpl == "string" && (!opt || !opt.text)) {
                tpl = toFragment(tpl);
                cache.add(tplId, tpl);
            }

            return tpl;
        },

        findTemplate = function(tplId) {

            var tplNode     = window.document.getElementById(tplId),
                tag;

            if (tplNode) {

                tag         = tplNode.tagName.toLowerCase();

                if (tag == "script") {
                    var tpl = tplNode.innerHTML;

                    tplNode.parentNode.removeChild(tplNode);

                    if (tpl.substr(0,5) == "<!--{") {
                        var inx = tpl.indexOf("-->"),
                            opt = createGetter(tpl.substr(4, inx-4))({});

                        options[tplId] = opt;

                        tpl = tpl.substr(inx + 3);

                        if (opt.includes) {
                            tpl = resolveIncludes(tpl);
                        }

                        if (opt.text) {
                            return tpl;
                        }
                    }

                    return toFragment(tpl);
                }
                else {
                    if ("content" in tplNode) {
                        return tplNode.content;
                    }
                    else {
                        return toFragment(tplNode.childNodes);
                    }
                }
            }
        },

        loadTemplate = function(tplUrl) {
            if (!cache.exists(tplUrl)) {
                return cache.add(tplUrl,
                    ajax(tplUrl, {dataType: 'fragment'})
                        .then(function(fragment){
                            return cache.add(tplUrl, fragment);
                        })
                );
            }
            return cache.get(tplUrl);
        },

        isExpression = function(str) {
            if (str.substr(0,1) == '.') {
                var second = str.substr(1,1);
                return !(second == '.' || second == '/');
            }
            return str.substr(0,1) == '{';
        };

    cache.addFinder(findTemplate);

    return defineClass({

        $class:             "Template",

        _watcher:           null,
        _tpl:               null,
        _renderer:          null,
        _initial:           true,
        _fragment:          null,
        _id:                null,
        _originalNode:      null,
        _intendedShadow:    false,

        scope:              null,
        node:               null,
        tpl:                null,
        url:                null,
        ownRenderer:        false,
        initPromise:        null,
        tplPromise:         null,
        parentRenderer:     null,
        deferRendering:     false,
        replace:            false,
        shadow:             false,
        animationEnabled:   true,

        $init: function(cfg) {

            var self    = this;

            extend(self, cfg, true, false);

            var shadowRootSupported = !!window.document.documentElement.createShadowRoot;

            if (!shadowRootSupported) {
                self._intendedShadow = self.shadow;
                self.shadow = false;
            }

            self.id     = nextUid();

            observable.createEvent("rendered-" + self.id, false, true);

            self.tpl && (self.tpl = trim(self.tpl));
            self.url && (self.url = trim(self.url));

            var node    = self.node,
                tpl     = self.tpl || self.url;

            node && removeAttr(node, "mjs-include");

            if (self.shadow) {
                self._originalNode = node;
                self.node = node = node.createShadowRoot();
            }

            if (!node) {
                self.deferRendering = true;
            }

            if (tpl) {

                if (node && node.firstChild && !self.shadow) {
                    data(node, "mjs-transclude", toFragment(node.childNodes));
                }

                if (isExpression(tpl)) {
                    self._watcher = createWatchable(self.scope, tpl, self.onChange, self, null, ns);
                    var val = self._watcher.getLastResult();
                    if (typeof val != "string") {
                        extend(self, val, true, false);
                    }
               }

                if (self._watcher && !self.replace) {
                    self.ownRenderer        = true;
                }
                else if (self.shadow) {
                    self.ownRenderer        = true;
                }
                else if (self.replace) {
                    self.ownRenderer        = false;
                }

                 self.resolveTemplate();

                if (self._watcher && self.replace) {
                    self._watcher.unsubscribeAndDestroy(self.onChange, self);
                    self._watcher = null;
                }

                if (!self.deferRendering || !self.ownRenderer) {
                    self.tplPromise.done(self.applyTemplate, self);
                }
                if (self.ownRenderer && self.parentRenderer) {
                    self.parentRenderer.on("destroy", self.onParentRendererDestroy, self);
                }
            }
            else {
                if (!self.deferRendering && self.ownRenderer) {
                    self.doRender();
                }
            }

            self.scope.$on("destroy", self.onScopeDestroy, self);
        },

        setAnimation: function(state) {
            this.animationEnabled = state;
        },

        doRender: function() {
            var self = this;
            if (!self._renderer) {
                self._renderer   = new Renderer(self.node, self.scope);
                self._renderer.on("rendered", self.onRendered, self);
                self._renderer.process();
            }
        },

        onRendered: function() {
            observable.trigger("rendered-" + this.id, this);
        },

        on: function(event, fn, context) {
            return observable.on(event + "-" + this.id, fn, context);
        },

        un: function(event, fn, context) {
            return observable.un(event + "-" + this.id, fn, context);
        },

        startRendering: function() {

            var self    = this,
                tpl     = self.tpl || self.url;

            if (self.deferRendering && (self.node || self.node === false)) {

                self.deferRendering = false;
                if (self.tplPromise) {
                    self.tplPromise.done(tpl ? self.applyTemplate : self.doRender, self);
                    return self.initPromise;
                }
                else {
                    tpl ? self.applyTemplate() : self.doRender();
                }
            }

            return null;
        },

        resolveTemplate: function() {

            var self    = this,
                url     = self.url,
                tpl     = self._watcher ?
                          self._watcher.getLastResult() :
                          (self.tpl || url);

            if (self._watcher && !tpl) {
                url     = null;
            }

            if (tpl && typeof tpl != "string") {
                tpl     = tpl.tpl || tpl.url;
                url     = null;
            }

            self.initPromise    = new Promise;
            self.tplPromise     = new Promise;

            if (self.ownRenderer) {
                self.initPromise.resolve(false);
            }

            return new Promise(function(resolve, reject){
                if (tpl || url) {

                    if (url) {
                        resolve(getTemplate(tpl) || loadTemplate(url));
                    }
                    else {
                        resolve(getTemplate(tpl) || toFragment(tpl));
                    }
                }
                else {
                    reject();
                }

            })
                .done(function(fragment){
                    self._fragment = fragment;
                    self.tplPromise.resolve();
                })
                .fail(self.initPromise.reject, self.initPromise)
                .fail(self.tplPromise.reject, self.tplPromise);
        },

        onChange: function() {

            var self    = this,
                el      = self.node;

            if (self._renderer) {
                self._renderer.$destroy();
                self._renderer = null;
            }

            var tplVal = self._watcher.getLastResult();

            if (tplVal) {
                self.resolveTemplate()
                    .done(self.applyTemplate, self);
            }
            else if (el) {
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            }
        },

        doApplyTemplate: function() {

            var self    = this,
                el      = self.node,
                frg,
                children;

            if (el) {
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            }

            if (self._intendedShadow) {
                self.makeTranscludes();
            }

            if (self.replace) {

                var transclude = el ? data(el, "mjs-transclude") : null;

                frg = clone(self._fragment);

                children = toArray(frg.childNodes);

                if (transclude) {
                    var tr = select("[mjs-transclude], mjs-transclude", frg);
                    if (tr.length) {
                        data(tr[0], "mjs-transclude", transclude);
                    }
                }

                if (el) {
                    //el.parentNode.insertBefore(frg, el);
                    //el.parentNode.removeChild(el);
                    el.parentNode.replaceChild(frg, el);
                }

                self.node = children;
                self.initPromise.resolve(children);
            }
            else {


                if (el) {
                    el.appendChild(clone(self._fragment));
                }
                else {
                    self.node = el = clone(self._fragment);
                }
                self.initPromise.resolve(el);
            }

            observable.trigger("before-render-" + self.id, self);

            if (self.ownRenderer) {
                self.doRender();
            }
        },

        applyTemplate: function() {

            var self        = this,
                el          = self.node,
                deferred    = new Promise;

            if (!self._initial && self.animationEnabled) {
                animate(el, "leave", null, true)
                    .done(self.doApplyTemplate, self)
                    .done(deferred.resolve, deferred);
                animate(el, "enter", null, true);
            }
            else {
                self.doApplyTemplate();
                deferred.resolve();
            }

            self._initial = false;

            return deferred;
        },

        makeTranscludes: function() {

            var self    = this,
                fr      = self._fragment,
                cnts    = select("content", fr),
                el, next,
                tr, sel,
                i, l;

            for (i = 0, l = cnts.length; i < l;  i++) {

                tr      = window.document.createElement("mjs-transclude");
                el      = cnts[i];
                next    = el.nextSibling;
                sel     = getAttr(el, "select");

                sel && setAttr(tr, "select", sel);

                fr.removeChild(el);
                fr.insertBefore(tr, next);
            }
        },

        onParentRendererDestroy: function() {
            var self = this;

            if (!self.$destroyed && self._renderer && !self._renderer.$destroyed) {
                self._renderer.$destroy();
            }
            self.$destroy();
        },

        onScopeDestroy: function() {
            this.$destroy();
        },

        destroy: function() {

            var self = this;

            if (self.shadow) {
                self._originalNode.createShadowRoot();
            }

            if (self._watcher) {
                self._watcher.unsubscribeAndDestroy(self.onChange, self);
            }
        }

    }, {
        cache: cache
    });
}();

