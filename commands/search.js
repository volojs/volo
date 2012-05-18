/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var qutil = require('../lib/qutil'),
    fs = require('fs'),
    path = require('path'),
    baseDir = __dirname,
    search;

search = {
    summary: 'Searches for a repo name.',

    doc: fs.readFileSync(path.join(__dirname, '/search/doc.md'), 'utf8'),

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
            searchId, searchMod;

        //Figure out the scheme.
        if (index !== -1) {
            scheme = query.substring(0, index);
            query = query.substring(index + 1);
        }

        //Figure out if there is a resolver for the given scheme.
        searchId = path.join(baseDir, '..', 'lib', 'search', scheme + '.js');

        try {
            searchMod = require(searchId);
            d.resolve(searchMod(query, options));
        } catch (e) {
            d.reject('Do not have a volo search provider for scheme: ' + scheme + ': ' + e);
        }

        return d.promise;
    }
};

module.exports = search;