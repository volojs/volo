/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint plusplus: false */
/*global define, console */

define(function (require) {
    var https = require('https'),
        http = require('http'),
        fs = require('fs'),
        urlLib = require('url'),
        counter = 0;

    function download(url, path, callback, errback) {
        try {
            var parts = urlLib.parse(url),
                protocol = parts.protocol === 'https:' ? https : http,
                writeStream = fs.createWriteStream(path);

            console.log('Downloading: ' + url);

            protocol.get(parts, function (response) {

                //console.log("statusCode: ", response.statusCode);
                //console.log("headers: ", response.headers);
                try {
                    if (response.statusCode === 200) {
                        //Bingo, do the download.
                        response.on('data', function (data) {
                            writeStream.write(data);
                        });

                        response.on('end', function () {
                            writeStream.end();
                            callback(path);
                        });
                    } else if (response.statusCode === 302) {
                        //Redirect, try the new location
                        download(response.headers.location, path, callback, errback);
                    } else {
                        if (errback) {
                            errback(response);
                        }
                    }
                } catch (e) {
                    if (errback) {
                        errback(e);
                    }
                }
            }).on('error', function (e) {
                if (errback) {
                    errback(e);
                } else {
                    console.error(e);
                }
            });
        } catch (e) {
            if (errback) {
                errback(e);
            }
        }

    }

    download.createTempName = function (seed) {
        return seed.replace(/\//g, '-') + '-' + (counter++);
    };

    return download;
});