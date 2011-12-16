/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint */
/*global define */

define(function (require) {
    var baseUrl = require('./baseUrl'),
        fs = require('fs'),
        jsExtRegExp = /\.js$/,
        commands;

    commands = {
        list: function () {

            var files = fs.readdirSync(baseUrl);
            files = files.filter(function (filePath) {
                return filePath.charAt(0) !== '.' && jsExtRegExp.test(filePath);
            }).map(function (filePath) {
                return filePath.substring(0, filePath.length - 3);
            });

            return files;
        }
    };

    return commands;
});
