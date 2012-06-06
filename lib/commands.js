/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true, plusplus: true */
/*global define */
'use strict';

    var fs = require('fs'),
        path = require('path'),
        q = require('q'),
        v = require('./v'),
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

        get: function (id) {
            return registry[id];
        },

        have: function (name) {
            var hasCommand = name && registry.hasOwnProperty(name),
                command;

            if (!hasCommand) {
                //Attempt to load it.
                try {
                    command = require(name);
                } catch (e) {
                    //No command by that name, just eat the error.
                }
            }

            return hasCommand;
        },

        list: function (callback) {
            var ids = Object.keys(registry),
                message = '',
                i;

            ids.sort();

            for (i = 0; i < ids.length; i++) {
                message += ids[i] + ': ' + commands.get(ids[i]).summary + '\n';
            }

            callback(message);
        },

        run: function (command, venv, namedArgs /*other args can be passed*/) {
            var d = q.defer(),
                shellCommand, args;

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
                } else if (typeof command === 'string' ||
                           Array.isArray(command)) {
                    command = {
                        run: command
                    };
                }

                //Now convert run to a function if it is not.
                //This allows a command to have depends and
                //a run property that is just a shell string or array
                //of shell strings
                if (typeof command.run === 'string') {
                    shellCommand = command.run;
                    command.run = function (d, v, namedArgs) {
                        d.resolve(v.shell(shellCommand, {
                            useConsole: true
                        }));
                    };
                } else if (Array.isArray(command.run)) {
                    shellCommand = command.run;
                    command.run = function (d, v, namedArgs) {
                        d.resolve(v.sequence(shellCommand, {
                            useConsole: true
                        }));
                    };
                }

                args = [].slice.call(arguments, 2);

                q.call(function () {
                    if (command.depends && command.depends.length) {
                        var result = q.resolve();
                        command.depends.forEach(function (commandName) {
                            result = result.then(function () {
                                return venv.command(commandName);
                            });
                        });
                        return result;
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

    module.exports = commands;
