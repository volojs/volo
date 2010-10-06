'use strict';
/*jslint plusplus: false */
/*global require */

require.def(['require', 'sys', './hostenv/args'], function (require, sys, args) {
    var namedArgs = {}, aryArgs = [], empty = {},
        action, result, combinedArgs,
        allowedActions = {
            'createApp': true,
            'add': true
        };

    function usageError(callback) {
        var message = '\npkg.js, a package tool for RequireJS. Allowed commands:\n\n',
            actions = [], actionModules = [], prop;

        //Cycle through all allowed actions to get their docs.
        for (prop in allowedActions) {
            if (!(prop in empty)) {
                actions.push(prop);
                actionModules.push('./' + prop);
            }
        }

        require(actionModules, function () {
            for (var i = 0; i < actions.length; i++) {
                message += actions[i] + ': ' + arguments[i].doc + '\n';
            }
            callback(message);
        });
    }

    return function (callback, argArray) {
        if (argArray) {
            args = argArray;
        }

        //Cycle through args, pulling off name=value pairs into an object.    
        args.forEach(function (arg) {
            if (arg.indexOf('=') === -1) {
                aryArgs.push(arg);
            } else {
                var pair = arg.split('=');
                namedArgs[pair[0]] = pair[1];
            }
        });

        //The action will be the first arg.
        if (aryArgs.length) {
            action = aryArgs.shift();
        }

        if (!action || !allowedActions[action]) {
            usageError(callback);
        } else {
            combinedArgs = [namedArgs].concat(aryArgs);

            require(['./' + action], function (action) {
                result = action.validate.apply(action, combinedArgs);
                if (!result) {
                    result = action.run.apply(action, combinedArgs);
                }
                callback(result);
            });
        }
    };
});
