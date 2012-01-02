/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define, console, process */

define(function (require, exports, module) {
    var commands = require('volo/commands'),
        help;

    help = {
        summary: 'Gives more detailed help on a volo command.',

        doc: '##Usage\n\n    volo.js help commandName',

        validate: function (namedArgs, commandName) {
            if (!commandName) {
                return new Error('Please specify a command name to use help.');
            }

            if (!commands.have(commandName)) {
                return new Error(commandName + ' command does not exist. Do ' +
                                 'you need to *acquire* it?');
            }
            return undefined;
        },

        run: function (deferred, namedArgs, commandName) {

            require([commandName], function (command) {
                var doc = command.doc || command.summary ||
                          commandName + ' does not have any documentation.';

                deferred.resolve(doc);
            });
        }
    };

    return require('volo/commands').register(module.id, help);
});
