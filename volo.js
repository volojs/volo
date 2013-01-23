/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var commands = require('./lib/commands'),
    config = require('./lib/config').get(),
    volofile = require('./lib/volofile'),
    path = require('path'),
    exists = require('./lib/exists'),
    q = require('q');

function main(args, callback, errback) {
    var commandName, combinedArgs, commandOverride, firstArg,
        deferred = q.defer(),
        cwd = process.cwd(),
        namedArgs = {
            volo: {
                resolve: function (relativePath) {
                    if (relativePath.indexOf('/') !== 0 &&
                            relativePath.indexOf(':') === -1) {
                        return path.resolve(cwd, relativePath);
                    }
                    return relativePath;
                }
            }
        },
        aryArgs = [],
        flags = [];

    //Cycle through args, pulling off name=value pairs into an object.
    args.forEach(function (arg) {
        var name, value,
            eqIndex = arg.indexOf('=');
        if (eqIndex === -1) {
            //If passed a flag like -f, convert to named
            //argument based on the command's configuration.
            if (arg.indexOf('-') === 0) {
                //Allow --flags too, just trim off both dashes
                flags.push(arg.substring(arg.charAt(1) === '-' ? 2 : 1));
            } else {
                //Regular array arg.
                aryArgs.push(arg);
            }
        } else {
            name = arg.substring(0, eqIndex);
            value = arg.substring(eqIndex + 1);
            namedArgs[name] = value;
        }
    });

    //The commandName will be the first arg.
    if (aryArgs.length) {
        //If first arg is a -flag or a name=value command skip it,
        //means a default volofile action should be run.
        firstArg = aryArgs[0];
        if (firstArg.indexOf('-') !== 0 && firstArg.indexOf('=') === -1) {
            commandName = aryArgs.shift();

            //If this is a specific override to bypase a volofile,
            //the next arg is the real command.
            if (commandName === 'command') {
                commandOverride = true;
                commandName = aryArgs.shift();
            }
        }
    }

    combinedArgs = [namedArgs].concat(aryArgs);

    //Global flag override for help
    if (flags.indexOf('h') !== -1 || flags.indexOf('help') !== -1) {
        if (commandName) {
            combinedArgs = [namedArgs].concat([commandName]);
            commandName = 'help';
        }
    }

    //Function to run after the command object has been loaded, either
    //by a volofile or by installed volo actions.
    function runCommand(command) {
        flags.forEach(function (flag) {
            if (command.flags && command.flags[flag]) {
                namedArgs[command.flags[flag]] = true;
            }
        });

        commands.run.apply(commands, [command, null].concat(combinedArgs))
            .then(deferred.resolve, deferred.reject);
    }

    //Tries to run the command from the top, not from a local volofile.
    function runTopCommand() {
        commands.get(commandName).then(function (command) {
            if (command) {
                runCommand(command);
            } else {
                //Show usage info.
                commands.list().then(function (message) {
                    deferred.resolve(path.basename(process.argv[1]) +
                                    ' v' + config.volo.version +
                                    ', a JavaScript tool to make ' +
                                    'JavaScript projects. Allowed commands:\n\n' +
                                    message);
                }).fail(deferred.reject);
            }
        }).fail(deferred.reject);
    }

    if (!commandOverride && exists(path.resolve(cwd, 'volofile'))) {
        volofile(cwd).then(function (voloMod) {
            //Set up default command name if none specified.
            commandName = commandName || 'run';

            if (voloMod.hasOwnProperty(commandName)) {
                runCommand(voloMod[commandName]);
            } else {
                runTopCommand();
            }
        })
            .fail(deferred.reject);
    } else {
        runTopCommand();
    }

    return q.when(deferred.promise, callback, errback);
}

//Export the require used by volo, so that volofiles can take advantage
//of modules in volo itself.
main.require = require;

//Load up the commands we know about.
commands.register('add', require('./commands/add'));
commands.register('install', require('./commands/install'));
commands.register('amdify', require('./commands/amdify'));
commands.register('create', require('./commands/create'));
commands.register('help', require('./commands/help'));
commands.register('npmrel', require('./commands/npmrel'));
commands.register('search', require('./commands/search'));
commands.register('info', require('./commands/info'));

module.exports = main;
