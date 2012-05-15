/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var q = require('q'),
    qutil = require('../qutil'),
    lang = require('../lang'),
    github = require('../github'),
    config = require('../config').get().github,
    defaultOptions = {
        amd: false,
        max: 5
    };

function searchGithub(query, options, callback, errback) {
    var d = qutil.convert(callback, errback),
        opts = options || {},
        sanitized = [];

    lang.mixin(opts, defaultOptions);

    github.search(query).then(function (data) {
        var repos = data && data.repositories,
            damd = q.defer(),
            amdOverride;

        if (repos && repos.length) {
            repos.some(function(entry, i) {
                if (i === opts.max) {
                    return true;
                }
                sanitized.push({
                    archive: entry.owner + '/' + entry.name,
                    fork: entry.fork,
                    watchers: entry.watchers,
                    pushed: entry.pushed,
                    description: entry.description
                });
            });
        }

        amdOverride = opts.amd && config.searchOverrides &&
            config.searchOverrides.amd && config.searchOverrides.amd[query];

        if (amdOverride) {
            //Look up info on the AMD override
            //This uses V3 of the GitHub API, so the repo results are
            //slightly different from the above V2 search API results.
            github.repo(amdOverride).then(function (entry) {
                var item;

                if (entry.owner) {
                    item = {
                        archive: entry.owner.login + '/' + entry.name,
                        fork: entry.fork,
                        watchers: entry.watchers,
                        pushed: entry.pushed_at,
                        description: entry.description
                    };

                    if (item.fork) {
                        item.parent = entry.parent.owner.login + '/' +
                                      entry.parent.name;
                    }

                    sanitized.unshift(item);

                    //If sanitized is over its max, prune it. It should
                    //only be over by one.
                    if (sanitized.length > opts.max) {
                        sanitized.splice(sanitized.length - 1, 1);
                    }

                    damd.resolve();
                }
            }, function (err) {
                console.log('Could not fetch repo info for ' +
                            amdOverride + '. Skipping it.');
                damd.resolve();
            });

            return damd.promise;
        }
    }).then(function () {
        return sanitized.length ? sanitized : null;
    }).then(d.resolve, d.reject);

    return d.promise;
}

module.exports = searchGithub;
