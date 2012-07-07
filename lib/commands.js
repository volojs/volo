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
            return q.fcall(function () {
                var command = id && registry.hasOwnProperty(id) && registry[id];
                if (id && !command) {
                    return require('./volofile')('.')
                    .then(function (voloMod) {
                        return voloMod[id];
                    });
                }
                return command;
            })
            .then(function (command) {
                if (id && !command) {
                    //Attempt to load it.
                    try {
                        command = require(id);
                    } catch (e) {
                        //No command by that id, just eat the error.
                    }
                }
                return command;
            });
        },

        list: function () {
            return require('./volofile')('.')
            .then(function (voloMod) {
                var messages = [],
                    keys;

                if (voloMod) {
                    keys = Object.keys(voloMod);
                    keys.sort();

                    messages.push(['volofile commands:']);
                    messages.push(['']);
                    keys.forEach(function (key) {
                        messages.push(key + ': ' + (voloMod[key].summary || ''));
                    });
                }

                keys = Object.keys(registry);
                keys.sort();

                messages.push(['']);
                messages.push(['Standard volo commands:']);
                messages.push(['']);
                keys.forEach(function (key) {
                    messages.push(key + ': ' + (registry[key].summary || ''));
                });

                return messages.join('\n');
            });
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

                    try {
                        command.run.apply(command, [commandDeferred, venv].concat(args));
                    } catch (e) {
                        //Try to give more details on the error by giving the
                        //first two lines of the stack trace. If a volofile is
                        //in play, it should give a line number in the volofile.
                        commandDeferred.reject(e.stack.toString().split('\n').slice(0, 2).join('\n'));
                    }

                    return commandDeferred.promise;
                })
                .then(d.resolve, d.reject);
            }

            return d.promise;
        }
    };

    module.exports = commands;
