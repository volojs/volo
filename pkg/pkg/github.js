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
        host = 'api.github.com',
        versionRegExp = /^(v)?(\d+\..+)/;

    function github(path, callback, errback) {
        var args = {
            host: host,
            path: '/' + path
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

    github.tags = function (ownerPlusRepo, callback, errback) {
        github('repos/' + ownerPlusRepo + '/tags', function (data) {
            data = data.map(function (data) {
                return data.name;
            });

            callback(data);
        }, errback);
    };


    github.versionTags = function (ownerPlusRepo, callback, errback) {
        github('repos/' + ownerPlusRepo + '/tags', function (data) {

            var list = [];

            data.forEach(function (data) {
                var name = data.name;
                if ((match = versionRegExp(name))) {
                    version = match[2];
                    if (!latest) {
                        latest = version;
                    } else {
                        versionParts = version.split('.');
                        if
                    }
                }
            });

            if (latest) {
                callback(latest);
            }

        }, errback);
    };

    github.latestTag = function (ownerPlusRepo, callback, errback) {
        github.tags(ownerPlusRepo, function (tags) {
            callback(tags[0]);
        }, errback);
    };

    return github;
});
