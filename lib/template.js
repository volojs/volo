/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

/**
 * Reads a volofile from a target directory, and exports the data as a
 * set of modules.
 */
var tokenRegExp = /\{(\w+)\}/g;

function template(contents, data) {
    return contents.replace(tokenRegExp, function (match, token) {
        var result = data[token];

        //Just use empty string for null or undefined
        if (result === null || result === undefined) {
            result = '';
        }

        return result;
    });
}

module.exports = template;
