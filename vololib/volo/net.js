/**
 * @license Copyright (c) 2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint regexp: true */
/*global define, console */

define(function (require) {
    'use strict';
    var q = require('q'),
        urlLib = require('url'),
        https = require('https'),
        http = require('http'),
        json = require('volo/json'),
        net;

    return (net = {
        getJson: function (url, options) {
            options = options || {};

            var d = q.defer(),
                args = urlLib.parse(url),
                lib = args.protocol === 'https:' ? https : http;

            lib.get(args, function (response) {
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
                    } else {
                        d.reject(args.host + args.path + ' returned status: ' +
                                 response.statusCode + '. ' + body);
                    }
                });
            }).on('error', function (e) {
                d.reject(e);
            });

            return d.promise;
        }
    });
});
