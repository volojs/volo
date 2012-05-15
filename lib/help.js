/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global console, process */
'use strict';

var commands = require('./volo/commands'),
    help;

help = {
    summary: 'Gives more detailed help on a volo command.',

    doc: '##Usage\n\n    volo help commandName',

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

    run: function (deferred, v, namedArgs, commandName) {

        require([commandName], function (command) {
            var doc = command.doc || command.summary ||
                      commandName + ' does not have any documentation.';

            deferred.resolve(doc);
        });
    }
};

module.exports = require('volo/commands').register(module.id, help);
