/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint regexp: true */
/*global define, console */

define(function (require) {
    'use strict';
    var q = require('q'),
        https = require('https'),
        config = require('volo/config').github,
        scheme = config.scheme,
        version = require('volo/version'),
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
                if (response.statusCode === 404) {
                    d.reject(args.host + args.path + ' does not exist');
                } else if (response.statusCode === 200) {
                    //Convert the response into an object
                    d.resolve(JSON.parse(body));
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

    github.url = function (path) {
        return scheme + '://' + host + '/' + path;
    };

    github.apiUrl = function (path) {
        return scheme + '://' + apiHost + '/' + path;
    };

    github.rawUrl = function (ownerPlusRepo, version, specificFile) {
        var parts = ownerPlusRepo.split('/'),
            owner = parts[0],
            repo = parts[1];

        return config.rawUrlPattern
                     .replace(/\{owner\}/g, owner)
                     .replace(/\{repo\}/g, repo)
                     .replace(/\{version\}/g, version)
                     .replace(/\{file\}/g, specificFile);
    };

    github.tarballUrl = function (ownerPlusRepo, version) {
        return github.url(ownerPlusRepo) + '/tarball/' + version;
    };

    github.zipballUrl = function (ownerPlusRepo, version) {
        return github.url(ownerPlusRepo) + '/zipball/' + version;
    };

    github.tags = function (ownerPlusRepo) {
        return github('repos/' + ownerPlusRepo + '/tags').then(function (data) {
            data = data.map(function (data) {
                return data.name;
            });

            return data;
        });
    };

    github.repo = function (ownerPlusRepo) {
        return github('repos/' + ownerPlusRepo);
    };

    github.versionTags = function (ownerPlusRepo) {
        return github.tags(ownerPlusRepo).then(function (tagNames) {
            //Only collect tags that are version tags.
            tagNames = tagNames.filter(function (tag) {
                return versionRegExp.test(tag);
            });

            //Now order the tags in tag order.
            tagNames.sort(version.compare);

            //Default to master if no version tags available.
            if (!tagNames.length) {
                tagNames = ['master'];
            }

            return tagNames;
        });
    };

    github.latestTag = function (ownerPlusRepo) {
        //If ownerPlusRepo includes the version, just use that.
        var parts = ownerPlusRepo.split('/'),
            d;
        if (parts.length === 3) {
            d = q.defer();
            d.resolve(parts[2]);
            return d.promise;
        } else {
            return github.versionTags(ownerPlusRepo).then(function (tagNames) {
                return tagNames[0];
            });
        }
    };


    github.search = function (query) {

        var args = {
            host: config.searchHost,
            path: config.searchPath.replace(/\{query\}/, query)
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
                if (response.statusCode === 404) {
                    d.reject(args.host + args.path + ' does not exist');
                } else if (response.statusCode === 200) {
                    //Convert the response into an object
                    d.resolve(JSON.parse(body));
                } else {
                    d.reject(args.host + args.path + ' returned status: ' +
                             response.statusCode + '. ' + body);
                }
            });
        }).on('error', function (e) {
            d.reject(e);
        });

        return d.promise;
    };

    return github;
});
