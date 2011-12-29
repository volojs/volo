/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint plusplus: false */
/*global define, process, console */

define(function (require) {
    var config = require('./config'),
        commands = require('./commands'),
        q = require('q');

    function main(callback, errback) {
        var deferred = q.defer(),
            //First two args are 'node' and 'volo.js'
            args = process.argv.slice(2),
            actions = commands.list(),
            namedArgs = {}, aryArgs = [],
            action, combinedArgs;

        function usageError(callback) {
            var message = '\nvolo.js, a JavaScript tool to make JavaScript projects. Allowed commands:\n\n';

            require(actions, function () {
                var mod, i;

                for (i = 0; i < actions.length; i++) {
                    mod = arguments[i];
                    if (mod.run) {
                        message += actions[i] + ': ' + mod.doc + '\n\n';
                    }
                }
                deferred.resolve(message);
            });
        }

        //Cycle through args, pulling off name=value pairs into an object.
        args.forEach(function (arg) {
            if (arg.indexOf('=') === -1) {
                //If passed a flag like -f, convert to named
                //arg .f = true
                if (arg.indexOf('-') === 0) {
                    namedArgs[arg.substring(1)] = true;
                } else {
                    //Regular array arg.
                    aryArgs.push(arg);
                }
            } else {
                var pair = arg.split('=');
                namedArgs[pair[0]] = pair[1];
            }
        });

        //The action will be the first arg.
        if (aryArgs.length) {
            action = aryArgs.shift();
        }

        if (!action || !actions.some(function (item) {
            return item === action;
        })) {
            usageError();
        } else {
            combinedArgs = [namedArgs].concat(aryArgs);

            require([action], function (action) {
                var result = action.validate.apply(action, combinedArgs);
                if (result) {
                    //Any result from a validate is considered an error result.
                    deferred.reject(result);
                } else {
                    action.run.apply(action, [deferred].concat(combinedArgs));
                }
            });
        }

        q.when(deferred.promise, function (message) {
            if (callback) {
                callback(message);
            }
        }, function (err) {
            if (errback) {
                errback(err);
            }
        });
    }

    return main;
});
