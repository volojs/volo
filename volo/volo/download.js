/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint plusplus: false */
/*global define, console */

define(function (require) {
    var https = require('https'),
        http = require('http'),
        fs = require('fs'),
        urlLib = require('url'),
        qutil = require('volo/qutil'),
        file = require('volo/file'),
        localRegExp = /^local\:/;

    function download(url, path, callback, errback) {
        var d = qutil.convert(callback, errback),
            parts, protocol, writeStream;

        try {
            //Handle local URLs
            if (localRegExp.test(url)) {
                url = url.substring(url.indexOf(':') + 1);
                file.copyDir(url, path);
                d.resolve(path);
            } else {

                //Do the network fetch.
                parts = urlLib.parse(url);
                protocol = parts.protocol === 'https:' ? https : http;
                writeStream = fs.createWriteStream(path);

                protocol.get(parts, function (response) {

                    //console.log("statusCode: ", response.statusCode);
                    //console.log("headers: ", response.headers);
                    try {
                        if (response.statusCode === 200) {

                            console.log('Downloading: ' + url);

                            //Bingo, do the download.
                            response.on('data', function (data) {
                                writeStream.write(data);
                            });

                            response.on('end', function () {
                                writeStream.end();
                                d.resolve(path);
                            });
                        } else if (response.statusCode === 302) {
                            //Redirect, try the new location
                            d.resolve(download(response.headers.location, path));
                        } else {
                            d.resolve(response);
                        }
                    } catch (e) {
                        d.reject(e);
                    }
                }).on('error', function (e) {
                    d.reject(e);
                });
            }
        } catch (e) {
            d.reject(e);
        }

        return d.promise;
    }

    return download;
});