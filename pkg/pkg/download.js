/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var https = require('https'),
        http = require('http'),
        fs = require('fs'),
        urlLib = require('url');

    function download(url, path, callback, errback) {
        var parts = urlLib.parse(url),
            protocol = parts.protocol === 'https:' ? https : http,
            writeStream = fs.createWriteStream(path);

        protocol.get(parts, function (response) {

            response.on('data', function (data) {
                writeStream.write(data);
            });

            response.on('end', function () {
                writeStream.end();
                callback(path);
            });
        }).on('error', function (e) {
            if (errback) {
                errback(e);
            } else {
                console.error(e);
            }
        });

    }

    return download;
});