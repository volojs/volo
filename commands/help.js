/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var commands = require('../lib/commands'),
    colors = require('colors'),
    boldRegExp = /\*\*([^\*]+)\*\*/g,
    codeRegExp = /`([^\`]+)`/g,
    help;

colors.mode = 'console';

function colorize(text) {
    var raw = text.split('\n');

    //Originally inspired by Gord Tanner's markdown-to color
    //approach:
    // https://git-wip-us.apache.org/repos/asf?p=incubator-ripple.git;a=blob_plain;f=lib/cli/help.js;hb=HEAD
    return raw.map(function (line) {
        if (line.match(/^# /)) {
            return line.replace(/^# /, '').inverse;
        }
        else if (line.match(/^## /)) {
            return line.replace(/^## /, '').inverse;
        }
        else if (line.match(/^ {4}/)) {
            return line.green;
        } else {
            line = line.replace(boldRegExp, function (match, text) {
                return text.bold;
            });

            line = line.replace(codeRegExp, function (match, text) {
                return text.green;
            });
        }
        return '    ' + line;
    }).join("\n");
}

help = {
    summary: 'Gives more detailed help on a volo command.',

    doc: '## Usage\n\n    volo help commandName',

    run: function (d, v, namedArgs, commandName) {
        commands.get(commandName).then(function (command) {
            var doc;
            if (command) {
                doc = command.summary || '';
                doc += (doc && command.doc ? '\n\n' : '') + (command.doc || '');

                if (!doc) {
                    doc = commandName + ' does not have any documentation.';
                }

                d.resolve(colorize(doc));
            } else {
                d.reject('Unknown command: ' + commandName);
            }
        }).fail(d.reject);
    }
};

module.exports = help;
