/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

define(function (require) {
    'use strict';

    var qutil = require('../qutil'),
        lang = require('../lang'),
        github = require('../github'),
        defaultOptions = {
            max: 5
        };

    function searchGithub(query, options, callback, errback) {
        var d = qutil.convert(callback, errback),
            opts = options || {};

        lang.mixin(opts, defaultOptions);

        github.search(query).then(function (data) {
            var sanitized = [],
                repos = data && data.repositories;

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

            return sanitized.length ? sanitized : null;
        }).then(d.resolve, d.reject);

        return d.promise;
    }

    return searchGithub;
});
