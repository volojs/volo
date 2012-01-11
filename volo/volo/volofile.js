/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define, process */

/**
 * Reads a volofile from a target directory, and exports the data as a
 * set of modules.
 */
define(function (require) {
    var path = require('path'),
        q = require('q'),
        v = require('volo/v'),
        qutil = require('volo/qutil');

    function volofile(basePath, callback, errback) {
        var d = qutil.convert(callback, errback),
            volofilePath = path.resolve(path.join(basePath, 'volofile'));

        if (path.existsSync(volofilePath)) {
            require([volofilePath], function (value) {
                d.resolve(value);
            });
        } else {
            d.resolve();
        }

        return d.promise;
    }

    /**
     * Loads the volofile inside basePath, and if there, and if it
     * supports the command, then runs it, running dependencies for
     * the command if specified.
     * @returns {Promise} that resolves to false exactly, otherwise it has the
     * commmand output, if any.
     */
    volofile.run = function (basePath, commandName, namedArgs /*other args can be passed*/) {
        var args = [].slice.call(arguments, 2),
            cwd = process.cwd(),
            venv;

        process.chdir(basePath);

        venv = v('.').env;

        return volofile('.').then(function (vfMod) {
            var command = vfMod && vfMod[commandName];

            if (command) {
                if (typeof command === 'function') {
                    //Just normalize to advanced structure.
                    command = {
                        before: [],
                        run: command
                    };
                }
                return volofile.runCommand.apply(volofile, [command, venv].concat(args));
            } else {
                return false;
            }
        })
        .then(function (result) {
            process.chdir(cwd);
            return result;
        });
    };

    volofile.runCommand = function (command, venv, namedArgs /*other args can be passed*/) {
        var d = q.defer(),
            args;

        if (!command) {
            d.resolve();
        } else {
            args = [].slice.call(arguments, 1);

            q.call(function () {
                if (command.before.length) {
                    return command.before.reduce(function (done, command) {
                        return q.wait(done,
                                      volofile.runCommand.apply(volofile,
                                                    [command].concat(args)));
                    });
                }
                return undefined;
            })
            .then(function () {
                var commandDeferred = q.defer(),
                    err;

                //Call validate if it is on the command.
                if (command.validate) {
                    err = command.validate(args);
                    if (err) {
                        commandDeferred.reject(err);
                        return commandDeferred.promise;
                    }
                }

                command.run.apply(command, [commandDeferred].concat(args));
                return commandDeferred.promise;
            })
            .then(d.resolve, d.reject);
        }

        return d.promise;
    };

    return volofile;
});
