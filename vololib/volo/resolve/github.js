/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*global console */

define(function (require) {
    'use strict';

    var path = require('path'),
        config = require('../config'),
        archive = require('../archive'),
        github = require('../github'),
        search = require('search'),
        q = require('q'),
        qutil = require('../qutil');

    function resolveGithub(archiveName, fragment, options, callback, errback) {

        var parts = archiveName.split('/'),
            originalFragment = fragment,
            d = qutil.convert(callback, errback),
            ownerPlusRepo, version, localName, override;

        d.resolve(q.call(function () {
            if (parts.length === 1) {
                //Need to do a search for a repo.
                return search.api(archiveName, options).then(function (results) {
                    var archive;
                    if (results && results.length) {
                        archive = results[0].archive;
                        console.log('Using search result "' + archive +
                                    '" for "' + archiveName + '"...');
                        return archive;
                    } else {
                        throw new Error('No search results for: ' + archiveName);
                    }
                });
            }
            return archiveName;
        }).then(function (archiveName) {
            parts = archiveName.split('/');

            localName = parts[1];

            ownerPlusRepo = parts[0] + '/'  + parts[1];
            version = parts[2];

            override = config.github.overrides[ownerPlusRepo];

            //Fetch the latest version
            return github.latestTag(ownerPlusRepo + (version ? '/' + version : ''));
        }).then(function (tag) {
            var isArchive = true,
                isSingleFile = false,
                scheme = 'github',
                url;

            //If there is a specific override to finding the file,
            //for instance jQuery releases are put on a CDN and are not
            //committed to github, use the override.
            if (fragment || (override && override.pattern)) {
                //If a specific file in the repo. Do not need the full
                //zipball, just use a raw github url to get it.
                if (fragment) {
                    url = github.rawUrl(ownerPlusRepo, tag, fragment);
                    //Adjust local name to be the fragment name.
                    localName = path.basename(fragment);
                    //Strip off extension name.
                    localName = localName.substring(0, localName.lastIndexOf('.'));
                } else {
                    //An override situation.
                    url = override.pattern.replace(/\{version\}/, tag);
                }

                //Set fragment to null since it has already been processed.
                fragment = null;
                isSingleFile = true;

                isArchive = archive.isArchive(url);
            } else {
                url = github.zipballUrl(ownerPlusRepo, tag);
            }

            return {
                id: scheme + ':' + ownerPlusRepo + '/' + tag +
                         (originalFragment ? '#' + originalFragment : ''),
                scheme: scheme,
                url: url,
                isArchive: isArchive,
                isSingleFile: isSingleFile,
                fragment: fragment,
                localName: localName
            };
        }));

        return d.promise;
    }

    return resolveGithub;
});
