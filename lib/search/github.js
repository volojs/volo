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
        var repos = data && data.items,
            damd = q.defer();

        if (repos && repos.length) {
            repos.some(function(entry, i) {
                if (i === opts.max) {
                    return true;
                }
                sanitized.push({
                    archive: entry.full_name,
                    fork: entry.fork,
                    watchers: entry.watchers,
                    pushed: entry.pushed_at,
                    description: entry.description
                });
            });
        }
    }).then(function () {
        return sanitized.length ? sanitized : null;
    }).then(d.resolve, d.reject);

    return d.promise;
}

module.exports = searchGithub;
