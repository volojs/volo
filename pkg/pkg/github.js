/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

'use strict';
/*jslint regexp: false */
/*global define, console */

define(function (require) {
    var q = require('q'),
        https = require('https'),
        config = require('pkg/config').github,
        scheme = config.scheme,
        host = config.host,
        apiHost = config.apiHost,
        versionRegExp = /^(v)?(\d+\..+)/;

    function github(path) {
        var args = {
            host: apiHost,
            path: '/' + path
        },
        d = q.defer();

        https.get(args, function (response) {
            //console.log("statusCode: ", response.statusCode);
            //console.log("headers: ", response.headers);
            var body = '';

            response.on('data', function (data) {
                body += data;
            });

            response.on('end', function () {
                //Convert the response into an object
                d.resolve(JSON.parse(body));
            });
        }).on('error', function (e) {
            d.reject(e);
        });

        return d.promise;
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

    github.tags = function (ownerPlusRepo) {
        return github('repos/' + ownerPlusRepo + '/tags').then(function (data) {
            data = data.map(function (data) {
                return data.name;
            });

            return data;
        });
    };


    github.versionTags = function (ownerPlusRepo) {
        return github.tags(ownerPlusRepo).then(function (tagNames) {
            //Only collect tags that are version tags.
            tagNames = tagNames.filter(function (tag) {
                return versionRegExp.test(tag);
            });

            //Now order the tags in tag order.
            //TODO: Need to do this: compare the
            //semver values and order accordingly.

            return tagNames;
        });
    };

    github.latestTag = function (ownerPlusRepo) {
        return github.versionTags(ownerPlusRepo).then(function (tagNames) {
            return tagNames[0];
        });
    };

    return github;
});
