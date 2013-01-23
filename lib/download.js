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
    path = require('path'),
    urlLib = require('url'),
    qutil = require('./qutil'),
    file = require('./file'),
    lang = require('./lang'),
    localRegExp = /^local\:/;

function download(urlArgs, localPath, callback, errback) {
    var url, parts, protocol, writeStream, req,
        d = qutil.convert(callback, errback),
        dir = path.dirname(localPath);

    if (typeof urlArgs === 'string') {
        urlArgs = {
            url: urlArgs
        };
    }

    url = urlArgs.url;

    try {
        //Handle local URLs
        if (localRegExp.test(url)) {
            url = url.substring(url.indexOf(':') + 1);
            if (fs.statSync(url).isDirectory()) {
                file.copyDir(url, localPath);
            } else {
                file.copyFile(url, localPath);
            }
            d.resolve(localPath);
        } else {

            //Do the network fetch.
            parts = urlLib.parse(url);
            protocol = parts.protocol === 'https:' ? https : http;

            if (!file.exists(dir)) {
                file.mkdirs(dir);
            }
            writeStream = fs.createWriteStream(localPath);


            req = protocol.request(parts, function (response) {
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
                            d.resolve(localPath);
                        });
                    } else if (response.statusCode === 301 ||
                        response.statusCode === 302) {
                        //Redirect, try the new location
                        urlArgs.url = response.headers.location;
                        download(urlArgs, localPath)
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

            if (urlArgs.headers) {
                lang.eachProp(urlArgs.headers, function (value, headerName) {
                    req.setHeader(headerName, value);
                });
            }

            req.end();
        }
    } catch (e) {
        d.reject(e);
    }

    return d.promise;
}

module.exports = download;