/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';
var q = require('q'),
    urlLib = require('url'),
    https = require('https'),
    http = require('http'),
    json = require('./json'),
    lang = require('./lang'),
    net;

module.exports = (net = {
    getJson: function (url, options) {
        options = options || {};

        var req,
            d = q.defer(),
            args = urlLib.parse(url),
            lib = args.protocol === 'https:' ? https : http;

        args.method = 'GET';

        req = lib.request(args, function (response) {
            var body = '';

            response.setEncoding('utf8');

            response.on('data', function (data) {
                body += data;
            });

            response.on('end', function () {
                var data;
                if (response.statusCode === 404) {
                    if (options.ignore404) {
                        d.resolve(null);
                    } else {
                        d.reject(args.host + args.path + ' does not exist');
                    }
                } else if (response.statusCode === 200) {
                    //Convert the response into an object
                    try {
                        data = json.parse(body);
                    } catch (e) {
                        d.reject('Malformed JSON in : ' + url + ': ' + e);
                        return;
                    }

                    d.resolve(data);
            } else if (response.statusCode === 301 ||
                        response.statusCode === 302) {
                //Redirect, try the new location
                net.getJson(response.headers.location, options).then(d.resolve, d.reject);
                } else {
                    d.reject(args.host + args.path + ' returned status: ' +
                             response.statusCode + '. ' + body);
                }
            });
        }).on('error', function (e) {
            d.reject(e);
        });

        if (options.headers) {
            lang.eachProp(options.headers, function (value, headerName) {
                req.setHeader(headerName, value);
            });
        }

        req.end();

        return d.promise;
    },
    head: function (url, options) {
        options = options || {};

        var req,
            d = q.defer(),
            args = urlLib.parse(url),
            lib = args.protocol === 'https:' ? https : http;

        // AWS links that are part of a redirect that are signed apparently do
        // not like HEAD requests. Using GET works, but may be a bit more wasteful
        // as far as data transfer. Bug 194.
        args.method = args.host === 's3.amazonaws.com' &&
                      args.query &&
                      args.query.indexOf('Signature') !== -1 ? 'GET' : 'HEAD';

        req = lib.request(args, function (response) {
            var statusCode = response.statusCode;

            // Purposely skips 400 errors, since some use of head are speculative
            // URL guesses at data.
            if ((statusCode === 301 || statusCode === 302) &&
                 options.followRedirects) {
                d.resolve(net.head(response.headers.location, options));
            } else {
                response.setEncoding('utf8');

                response.on('end', function () {
                    d.resolve(response);
                });
            }

            //console.log("statusCode: ", response.statusCode);
            //console.log("headers: ", response.headers);
            var body = '';

            response.on('data', function (data) {
                body += data;
            });

            response.on('end', function () {

            });
        }).on('error', function (e) {
            d.reject(e);
        });

        if (options.headers) {
            lang.eachProp(options.headers, function (value, headerName) {
                req.setHeader(headerName, value);
            });
        }

        req.end();

        return d.promise;
    }
});
