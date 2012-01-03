/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint plusplus: false */
/*global define, process, console */

define(function (require) {
    var commands = require('./commands'),
        q = require('q');

    function main(callback, errback) {
        var deferred = q.defer(),
            //First two args are 'node' and 'volo.js'
            args = process.argv.slice(2),
            namedArgs = {},
            aryArgs = [],
            flags = [],
            commandName, combinedArgs;

        //Cycle through args, pulling off name=value pairs into an object.
        args.forEach(function (arg) {
            if (arg.indexOf('=') === -1) {
                //If passed a flag like -f, convert to named
                //argument based on the command's configuration.
                if (arg.indexOf('-') === 0) {
                    flags.push(arg.substring(1));
                } else {
                    //Regular array arg.
                    aryArgs.push(arg);
                }
            } else {
                var pair = arg.split('=');
                namedArgs[pair[0]] = pair[1];
            }
        });

        //The commandName will be the first arg.
        if (aryArgs.length) {
            commandName = aryArgs.shift();
        }

        if (commands.have(commandName)) {
            combinedArgs = [namedArgs].concat(aryArgs);

            require([commandName], function (command) {

                //Really have the command. Now convert the flags into
                //named arguments.
                var hasFlagError = false,
                    validationError;

                flags.some(function (flag) {
                    if (command.flags && command.flags[flag]) {
                        namedArgs[command.flags[flag]] = true;
                    } else {
                        hasFlagError = true;
                        deferred.reject('Invalid flag for ' + commandName + ': -' + flag);
                    }

                    return hasFlagError;
                });

                if (!hasFlagError) {
                    if (command.validate) {
                        validationError = command.validate.apply(command, combinedArgs);
                    }
                    if (validationError) {
                        //Any result from a validate is considered an error result.
                        deferred.reject(validationError);
                    } else {
                        command.run.apply(command, [deferred].concat(combinedArgs));
                    }
                }
            });
        } else {
            //Show usage info.
            commands.list(function (message) {
                //voloVersion set in tools/wrap.start
                deferred.resolve('volo.js v' + voloVersion +
                                ', a JavaScript tool to make ' +
                                'JavaScript projects. Allowed commands:\n\n' +
                                message);
            });
        }

        q.when(deferred.promise, callback, errback);
    }

    return main;
});
