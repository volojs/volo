'use strict';
/*jslint plusplus: false */
/*global requirejs, process, console */

requirejs(['require', 'q'], function (require, q) {
    var allowedActions = {
            'createApp': true,
            'createWeb': true,
            'add': true
        },
        args = process.argv,
        deferred = q.defer(),
        namedArgs = {}, aryArgs = [],
        action, result, combinedArgs;

    function usageError(callback) {
        var message = '\npkg.js, a package tool for RequireJS. Allowed commands:\n\n',
            actions = [], actionModules = [], prop;

        //Cycle through all allowed actions to get their docs.
        for (prop in allowedActions) {
            if (allowedActions.hasOwnProperty(prop)) {
                actions.push(prop);
                actionModules.push('./' + prop);
            }
        }

        require(actionModules, function () {
            for (var i = 0; i < actions.length; i++) {
                message += actions[i] + ': ' + arguments[i].doc + '\n\n';
            }
            deferred.resolve(message);
        });
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
        usageError();
    } else {
        combinedArgs = [namedArgs].concat(aryArgs);

        require(['./' + action], function (action) {
            result = action.validate.apply(action, combinedArgs);
            if (result instanceof Error) {
                deferred.reject(result);
            } else {
                action.run.apply(action, [deferred].concat(combinedArgs));
            }
        });
    }

    q.when(deferred.promise, function (message) {
        console.log(message);
    }, function (err) {
        console.log('ERROR: ' + err);
    });
});
