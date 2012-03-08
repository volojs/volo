/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

define(function (require, exports, module) {
    'use strict';

    var qutil = require('volo/qutil'),
        path = require('path'),
        search;

    search = {
        summary: 'Searches for a repo name.',

        doc: require('text!./search/doc.md'),

        flags: {
            'amd': 'amd'
        },

        validate: function (namedArgs, query) {
            if (!query) {
                return new Error('Please pass a query.');
            }
        },

        run: function (d, v, namedArgs, query) {
            d.resolve(search.api(query, namedArgs).then(function (results) {
                return results ? JSON.stringify(results, null, '  ') :
                                 'No results. Trying searching with a web ' +
                                 'browser at https://github.com,\nthen once you ' +
                                 'find the owner/repo combination, use it in volo.';
            }));
        },

        api: function(query, options, callback, errback) {
            var index = query.indexOf(':'),
                scheme = 'github',
                d = qutil.convert(callback, errback),
                searchId;

            //Figure out the scheme.
            if (index !== -1) {
                scheme = query.substring(0, index);
                query = query.substring(index + 1);
            }

            //Figure out if there is a resolver for the given scheme.
            searchId = 'volo/search/' + scheme;

            if (require.defined(searchId) ||
                path.existsSync(require.toUrl(searchId + '.js'))) {
                require([searchId], function (search) {
                    d.resolve(search(query, options));
                });
            } else {
                d.reject('Do not have a volo search provider for scheme: ' + scheme);
            }

            return d.promise;
        }
    };

    return require('volo/commands').register(module.id, search);
});