/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true, plusplus: true */
/*global console */

'use strict';

var https = require('https'),
    http = require('http'),
    fs = require('fs'),
    urlLib = require('url'),
    qutil = require('./qutil'),
    file = require('./file'),
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

                        //Pipe will automatically call writeStream's
                        //end method.
                        response.pipe(writeStream);

                        response.on('error', function (err) {
                            d.reject(err);
                        });

                        //Write stream is done, so we can continue.
                        writeStream.on('close', function () {
                            d.resolve(path);
                        });
                    } else if (response.statusCode === 302) {
                        //Redirect, try the new location
                        download(response.headers.location, path)
                            .then(d.resolve, d.reject);
                    } else {
                        d.reject(new Error('Download failed, HTTP code: ' +
                                           response.statusCode + ': ' + url));
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

module.exports = download;