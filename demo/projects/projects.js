
(function(){

    var projects;
    var getFirebase = function() {
        var firebase   = new Firebase("https://vivid-heat-3129.firebaseio.com");
        firebase.on("value", function(data){
            projects = data;
        });
        return firebase;
    };

    var getProjects = ['$firebase', function(firebase) {
        var promise    = new MetaphorJs.Promise;

        firebase.on("value", function(projects){
            promise.resolve(projects);
        });

        return promise;
    }];

    MetaphorJs.cs.define({

        $class: "My.App",
        $extends: "MetaphorJs.App",

        initApp: function() {
            this.factory("$firebase", getFirebase, true);
            this.factory("$projects", getProjects);
        }

    });

    MetaphorJs.cs.define({

        $class: "My.ProjectsView",
        $extends: "MetaphorJs.View",

        route: [
            {
                reg: new RegExp('/list'),
                cmp: "My.ProjectsList",
                default: true,
                as: "ctrl"
            },
            {
                reg: new RegExp('/new'),
                cmp: "My.NewProject",
                as: "ctrl"
            },
            {
                reg: new RegExp('/edit/([^/]+)'),
                params: ['projectId'],
                cmp: "My.EditProject",
                as: "ctrl"
            }
        ]

    });

    MetaphorJs.cs.define({

        $class: "My.ProjectsList",
        $extends: "MetaphorJs.Component",

        // instance properties and methods
        initComponent: function(cfg, fProjects) {

            var self    = this,
                projects    = [];

            fProjects.forEach(function(p){
                var record = p.val();
                record.$id = p.name();
                record.$ref = p;
                projects.push(record);
            });

            self.scope.projects = projects;
        }

    }, {
        templateUrl: "/metaphorjs/demo/projects/list.html",
        inject: ['$config', '$projects']
    });


    MetaphorJs.cs.define({

        $class: "My.NewProject",
        $extends: "MetaphorJs.Component",

        firebase: null,

        initComponent: function(cfg, firebase) {

            this.firebase = firebase;
            this.scope.project = {};
        },

        save: function() {
            this.firebase.push(this.scope.project, function(){
                MetaphorJs.history.pushUrl('/metaphorjs/demo/projects.html');
            });
            return false;
        }
    }, {
        templateUrl: '/metaphorjs/demo/projects/detail.html',
        inject: ['$config', '$firebase']
    });

    MetaphorJs.cs.define({

        $class: "My.EditProject",
        $extends: "MetaphorJs.Component",

        initComponent: function(cfg, projects, projectId) {

            var self = this;

            projects.forEach(function(p){
                if (p.name() == projectId) {
                    var record = p.val();
                    record.$id = projectId;
                    record.$ref = p;
                    self.scope.project = record;
                    return false;
                }
            });

            if (!self.scope.project) {
                MetaphorJs.history.pushUrl("/metaphorjs/demo/projects.html");
            }
        },

        save: function() {
            var p = this.scope.project;
            p.$ref.ref().set({
                name: p.name,
                site: p.site,
                description: p.description || ""
            }, function() {
                MetaphorJs.history.pushUrl("/metaphorjs/demo/projects.html");
            })
        },

        remove: function() {

            this.scope.project.$ref.ref().remove(function(){
                MetaphorJs.history.pushUrl("/metaphorjs/demo/projects.html");
            });
        }
    }, {
        templateUrl: '/metaphorjs/demo/projects/detail.html',
        inject: ['$config', '$projects', 'projectId']
    });

}());