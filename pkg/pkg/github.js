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
        host = 'api.github.com';

    function github(path, callback, errback) {
        var args = {
            host: host,
            path: '/repos/jrburke/requirejs/tags'
        };

        https.get(args, function (response) {
            //console.log("statusCode: ", response.statusCode);
            //console.log("headers: ", response.headers);
            var body = '';

            response.on('data', function (data) {
                body += data;
            });

            response.on('end', function () {
                //Convert the response into an object
                callback(JSON.parse(body));
            });
        }).on('error', function (e) {
            if (errback) {
                errback(e);
            } else {
                console.error(e);
            }
        });

    }

    return github;
});
