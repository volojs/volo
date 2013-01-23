/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global */
'use strict';

var commands = require('../lib/commands'),
    help;

help = {
    summary: 'Gives more detailed help on a volo command.',

    doc: '##Usage\n\n    volo help commandName',

    run: function (d, v, namedArgs, commandName) {
        commands.get(commandName).then(function (command) {
            var doc;
            if (command) {
                doc = command.summary || '';
                doc += (doc && command.doc ? '\n\n' : '') + (command.doc || '');

                if (!doc) {
                    doc = commandName + ' does not have any documentation.';
                }

                d.resolve(doc);
            } else {
                d.reject('Unknown command: ' + commandName);
            }
        }).fail(d.reject);
    }
};

module.exports = help;
