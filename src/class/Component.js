

var defineClass = require("metaphorjs-class/src/func/defineClass.js"),
    emptyFn = require("../func/emptyFn.js"),
    nextUid = require("../func/nextUid.js"),
    getAttr = require("../func/dom/getAttr.js"),
    setAttr = require("../func/dom/setAttr.js"),
    removeAttr = require("../func/dom/removeAttr.js"),
    isAttached = require("../func/dom/isAttached.js"),
    extend = require("../func/extend.js"),
    Template = require("./Template.js"),
    Scope = require("../lib/Scope.js"),
    addClass = require("../func/dom/addClass.js"),
    removeClass = require("../func/dom/removeClass.js");

require("metaphorjs-observable/src/mixin/Observable.js");

/**
 * @namespace MetaphorJs
 * @class Component
 */
module.exports = defineClass({

    $class: "Component",
    $mixins: ["mixin.Observable"],

    /**
     * @access protected
     * @var string
     */
    id:             null,

    originalId:     false,

    /**
     * @var Element
     * @access protected
     */
    node:           null,

    /**
     * @var string
     */
    cls:            null,

    /**
     * @var string|Element
     * @access protected
     */
    renderTo:       null,

    /**
     * @var {boolean}
     */
    autoRender:     true,

    /**
     * @var bool
     * @access protected
     */
    rendered:       false,

    /**
     * @var bool
     * @access protected
     */
    hidden:         false,

    /**
     * @var bool
     * @access protected
     */
    destroyEl:      true,


    /**
     * @var {bool}
     */
    destroyScope:   false,

    /**
     * @var {Scope}
     */
    scope:          null,

    /**
     * @var {Template}
     */
    template:       null,

    /**
     * @var string
     */
    templateUrl:    null,

    /**
     * @var string
     */
    tag:            null,

    /**
     * @var string
     */
    as:             null,


    /**
     * @constructor
     * @param {object} cfg {
     *      @type string id Element id
     *      @type string|Element el
     *      @type string|Element renderTo
     *      @type bool hidden
     *      @type bool destroyEl
     * }
     */
    $init: function(cfg) {

        var self    = this;

        cfg = cfg || {};

        self.$super(cfg);

        extend(self, cfg, true, false);

        if (!self.scope) {
            self.scope = new Scope;
        }

        if (self.as) {
            self.scope[self.as] = self;
        }

        if (self.node) {
            var nodeId = getAttr(self.node, "id");
            if (nodeId) {
                self.originalId = true;
                if (!self.id) {
                    self.id = nodeId;
                }
            }
        }

        self.id = self.id || "cmp-" + nextUid();

        if (!self.node && self.node !== false) {
            self._createNode();
        }


        self.initComponent.apply(self, arguments);

        if (self.scope.$app){
            self.scope.$app.registerCmp(self, self.scope, "id");
        }

        var tpl = self.template,
            url = self.templateUrl;

        if (!tpl || !(tpl instanceof Template)) {
            self.template = tpl = new Template({
                scope: self.scope,
                node: self.node,
                deferRendering: !tpl,
                ownRenderer: true,
                tpl: tpl,
                url: url,
                shadow: self.constructor.$shadow,
                animationEnabled: !self.hidden
            });
        }
        else if (tpl instanceof Template) {
            // it may have just been created
            self.template.node = self.node;
        }

        self.template.on("rendered", self.onRenderingFinished, self);

        if (self.parentRenderer) {
            self.parentRenderer.on("destroy", self.onParentRendererDestroy, self);
        }

        if (self.node) {
            self._initElement();
        }

        if (self.autoRender) {

            if (tpl.initPromise) {
                tpl.initPromise.done(self.render, self);
            }
            else {
                self.render();
            }
        }
    },

    _createNode: function() {

        var self    = this;
        self.node   = window.document.createElement(self.tag || 'div');
    },

    _initElement: function() {

        var self    = this,
            node    = self.node;

        if (!self.originalId) {
            setAttr(node, "id", self.id);
        }

        self.initNode();
    },

    releaseNode: function() {

        var self = this,
            node = self.node;

        removeAttr(node, "cmp-id");

        if (self.cls) {
            removeClass(node, self.cls);
        }
    },

    initNode: function() {

        var self = this,
            node = self.node;

        setAttr(node, "cmp-id", self.id);

        if (self.cls) {
            addClass(node, self.cls);
        }

        if (self.hidden) {
            node.style.display = "none";
        }
    },

    render: function() {

        var self        = this;

        if (self.rendered) {
            return;
        }

        self.trigger('render', self);
        self.template.startRendering();
    },

    onRenderingFinished: function() {
        var self = this;

        if (!self.node) {
            self.node = self.template.node;
            if (self.node.nodeType == 11) { // document fragment
                var ch = self.node.childNodes,
                    i, l;
                for (i = 0, l = ch.length; i < l; i++) {
                    if (ch[i].nodeType == 1) {
                        self.node = ch[i];
                        break;
                    }
                }
            }

            self._initElement();
        }

        if (self.renderTo) {
            self.renderTo.appendChild(self.node);
        }
        else if (!isAttached(self.node)) {
            window.document.body.appendChild(self.node);
        }

        self.rendered   = true;
        self.afterRender();
        self.trigger('after-render', self);
    },


    /**
     * @access public
     * @method
     */
    show: function() {
        var self    = this;
        if (!self.hidden) {
            return;
        }
        if (self.trigger('before-show', self) === false) {
            return false;
        }

        if (!self.rendered) {
            self.render();
        }

        self.template.setAnimation(true);
        self.showApply();

        self.hidden = false;
        self.onShow();
        self.trigger("show", self);
    },

    showApply: function() {
        var self = this;
        if (self.node) {
            self.node.style.display = "block";
        }

    },

    /**
     * @access public
     * @method
     */
    hide: function() {
        var self    = this;
        if (self.hidden) {
            return;
        }
        if (self.trigger('before-hide', self) === false) {
            return false;
        }

        self.template.setAnimation(false);
        self.hideApply();

        self.hidden = true;
        self.onHide();
        self.trigger("hide", self);
    },

    hideApply: function() {
        var self = this;
        if (self.node) {
            self.node.style.display = "none";
        }
    },

    freezeByView: function(view) {
        var self = this;
        self.releaseNode();
        self.scope.$freeze();
        self.trigger("view-freeze", self, view);

    },

    unfreezeByView: function(view) {
        var self = this;
        self.initNode();
        self.scope.$unfreeze();
        self.trigger("view-unfreeze", self, view);
        self.scope.$check();
    },

    /**
     * @access public
     * @return bool
     */
    isHidden: function() {
        return this.hidden;
    },

    /**
     * @access public
     * @return bool
     */
    isRendered: function() {
        return this.rendered;
    },

    /**
     * @access public
     * @return bool
     */
    isDestroyed: function() {
        return this.destroyed;
    },

    /**
     * @access public
     * @return Element
     */
    getEl: function() {
        return this.node;
    },

    /**
     * @method
     * @access protected
     */
    initComponent:  emptyFn,

    /**
     * @method
     * @access protected
     */
    afterRender:    emptyFn,

    /**
     * @method
     * @access protected
     */
    onShow:         emptyFn,

    /**
     * @method
     * @access protected
     */
    onHide:         emptyFn,

    onParentRendererDestroy: function() {
        this.$destroy();
    },

    destroy:      function() {

        var self    = this;

        if (self.template) {
            self.template.$destroy();
        }

        if (self.destroyEl) {
            if (self.node && isAttached(self.node)) {
                self.node.parentNode.removeChild(self.node);
            }
        }
        else if (self.node) {

            if (!self.originalId) {
                removeAttr(self.node, "id");
            }

            self.releaseNode();
        }

        if (self.destroyScope && self.scope) {
            self.scope.$destroy();
        }

        self.$super();
    }

});

/**
 * @md-end-class
 */

