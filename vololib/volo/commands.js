/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint plusplus: false */
/*global define */

define(function (require) {
    'use strict';

    var baseUrl = require('./baseUrl'),
        nodeRequire = require('./nodeRequire');
        fs = require('fs'),
        path = require('path'),
        q = require('q'),
        qutil = require('volo/qutil'),
        v = require('volo/v'),
        jsExtRegExp = /\.js$/,
        registry = {},
        defaultCategory = 'global',
        categoryList = [
            'local',
            'global',
            'admin'
        ],
        commands;

    commands = {
        register: function (id, value, category) {
            category = category || defaultCategory;

            var categoryRegistry = registry[category];
            if (!categoryRegistry) {
                categoryRegistry = registry[category] = {};
            }

            categoryRegistry[id] = value;
            return value;
        },

        get: function (id, category) {
            var i, result;

            if (category) {
                return registry[category][id];
            } else {
                for (i = 0; i < categoryList.length; i += 1) {
                    result = registry[category][id];
                    if (result) {
                        break;
                    }
                }
                return result;
            }
        },

        list: function (callback) {
            var ids = [];

            if (path.existsSync(baseUrl)) {
                ids = fs.readdirSync(baseUrl);
                ids = ids.filter(function (filePath) {
                    return filePath.charAt(0) !== '.' && jsExtRegExp.test(filePath);
                }).map(function (filePath) {
                    return filePath.substring(0, filePath.length - 3);
                });
            }

            require(ids, function () {
                //All commands are loaded, list them out.
                var message = '',
                    ids = Object.keys(registry);

                ids.sort();

                ids.forEach(function (id) {
                    message += id + ': ' + require(id).summary + '\n';
                });

                callback(message);
            });
        },

        run: function (command, venv, namedArgs /*other args can be passed*/) {
            var d = q.defer(),
                args;

            if (!venv) {
                venv = v(path.resolve('.')).env;
            }

            if (!command) {
                d.resolve();
            } else {
                if (typeof command === 'function') {
                    //Just normalize to advanced structure.
                    command = {
                        run: command
                    };
                }

                args = [].slice.call(arguments, 2);

                q.call(function () {
                    if (command.depends && command.depends.length) {

                        var execFuncs = command.depends.map(function (commandName) {
                            return function () {
                                var cmdDeferred = q.defer();
                                if (commands.have(commandName)) {
                                    //a volo command is available, run it.
                                    require([commandName], function (cmd) {
                                        cmdDeferred.resolve(commands.run.apply(commands,
                                                        [cmd, venv].concat(args)));
                                    });
                                } else {
                                    cmdDeferred.reject('Unknown command: ' + commandName);
                                }
                                return cmdDeferred.promise;
                            };
                        });
                        return qutil.sequence(execFuncs);
                    }
                })
                .then(function () {
                    var commandDeferred = q.defer(),
                        err;

                    //Call validate if it is on the command.
                    if (command.validate) {
                        err = command.validate.apply(command, args);
                        if (err) {
                            commandDeferred.reject(err);
                            return commandDeferred.promise;
                        }
                    }

                    command.run.apply(command, [commandDeferred, venv].concat(args));
                    return commandDeferred.promise;
                })
                .then(d.resolve, d.reject);
            }

            return d.promise;
        }
    };

    //Set up list of commands. the volo built file will have some included
    //So check the global area, and then load the volofile commands.
    //Global area:
    if (path.existsSync(baseUrl)) {
        fs.readdirSync(baseUrl).forEach(function (name) {
            var fullPath = path.join(baseUrl, name),
                mod;
            if (fs.statSync(fullPath).isFile() && jsExtRegExp.test(name)) {
                mod = nodeRequire(fullPath);
                commands.register(name, mod, 'global');
            }
        });
    }

    return commands;
});
