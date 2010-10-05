require.def(['./hostenv/args'], function (args) {
    var namedArgs = {}, aryArgs = [], empty = {},
        action, result, combinedArgs,
        allowedActions = {
            'createApp': true,
            'add': true
        };

    function usageError() {
        var message = '\npkg.js, a package tool for RequireJS. Allowed commands:\n',
            actions = [], prop;

        //Cycle through all allowed actions to get their docs.
        for (param in allowedActions) {
            if (!(param in empty)) {
                actions.push(param);
            }
        }
        //require call is synchronous.
        require(actions, function () {
            var i, name;
            for (i = 0; i < actions.length; i++) {
                message += actions[i] + ': ' + arguments[i].doc + '\n';
            }
        });

        return new Error(message);
    }

    //Cycle through args, pulling off name=value pairs into an object.    
    args.forEach(function (arg) {
        if (arg.indexOf('=') === -1) {
            aryArgs.push(arg);
        } else {
            pair = arg.split('=');
            namedArgs[pair[0]] = pair[1];
        }
    });

    //The action will be the first arg.
    if (aryArgs.length) {
        action = aryArgs.shift();
    }

    if (!action || !allowedActions[action]) {
        return usageError();
    } else {
        combinedArgs = [namedArgs].concat(aryArgs);
        //require call is synchronous.
        require(['./' + action], function (action) {
            result = action.validate.apply(action, combinedArgs);
            if (!result) {
                result = action.run.apply(action, combinedArgs);
            }
        });
        return result;
    }
});
