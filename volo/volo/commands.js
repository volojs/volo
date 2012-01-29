/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint plusplus: false */
/*global define */

define(function (require) {
    var baseUrl = require('./baseUrl'),
        fs = require('fs'),
        path = require('path'),
        q = require('q'),
        v = require('volo/v'),
        jsExtRegExp = /\.js$/,
        registry = {},
        commands;

    commands = {
        register: function (id, value) {
            //Only take the first part of the ID
            id = id.split('/')[0];

            registry[id] = value;
            return value;
        },

        have: function (name) {
            var hasCommand = name && registry.hasOwnProperty(name);
            if (!hasCommand) {
                //See if it is available on disk
                hasCommand = path.existsSync(path.join(baseUrl, name + '.js'));
            }

            return hasCommand;
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
                    ids, i;

                ids = Object.keys(registry);
                ids.sort();

                for (i = 0; i < ids.length; i++) {
                    message += ids[i] + ': ' + require(ids[i]).summary + '\n';
                }

                callback(message);
            });
        },

        run: function (command, venv, namedArgs /*other args can be passed*/) {
            var d = q.defer(),
                args;

            if (!venv) {
                venv = v('.').env;
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
                        return command.depends.reduce(function (done, command) {
                            return q.wait(done,
                                          commands.run.apply(commands,
                                                        [command, venv].concat(args)));
                        });
                    }
                    return undefined;
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

    return commands;
});
