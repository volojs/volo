/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint regexp: false */
/*global define, console */

define(function (require) {
    var https = require('https'),
        scheme = 'https',
        host = 'github.com',
        apiHost = 'api.github.com',
        versionRegExp = /^(v)?(\d+\..+)/;

    function github(path, callback, errback) {
        var args = {
            host: apiHost,
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

    github.url = function (path) {
        return scheme + '://' + host + '/' + path;
    };

    github.apiUrl = function (path) {
        return scheme + '://' + apiHost + '/' + path;
    };

    github.tarballUrl = function (ownerPlusRepo, version) {
        return github.url(ownerPlusRepo) + '/tarball/' + version;
    };

    github.tags = function (ownerPlusRepo, callback, errback) {
        github('repos/' + ownerPlusRepo + '/tags', function (data) {
            data = data.map(function (data) {
                return data.name;
            });

            callback(data);
        }, errback);
    };


    github.versionTags = function (ownerPlusRepo, callback, errback) {
        github.tags(ownerPlusRepo, function (tagNames) {
            //Only collect tags that are version tags.
            tagNames = tagNames.filter(function (tag) {
                return versionRegExp.test(tag);
            });

            //Now order the tags in tag order.
            //TODO: Need to do this: compare the
            //semver values and order accordingly.

            callback(tagNames);
        }, errback);
    };

    github.latestTag = function (ownerPlusRepo, callback, errback) {
        github.versionTags(ownerPlusRepo, function (tagNames) {
            callback(tagNames[0]);
        }, errback);
    };

    return github;
});
