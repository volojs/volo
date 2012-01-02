/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var path = require('path'),
        config = require('../config'),
        archive = require('../archive'),
        github = require('../github');

    function resolveGithub(archiveName, fragment, callback, errback) {

        var parts = archiveName.split('/'),
            ownerPlusRepo, version, localName, override;

        localName = parts[1];

        ownerPlusRepo = parts[0] + '/'  + parts[1];
        version = parts[2];

        override = config.github.overrides[ownerPlusRepo];

        //Fetch the latest version
        github.latestTag(ownerPlusRepo + (version ? '/' + version : ''))
            .then(function (tag) {
                var isArchive = true,
                    url;

                //If there is a specific override to finding the file,
                //for instance jQuery releases are put on a CDN and are not
                //committed to github, use the override.
                if (fragment || (override && override.pattern)) {
                    //If a specific file in the repo. Do not need the full
                    //tarball, just use a raw github url to get it.
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

                    isArchive = archive.isArchive(url);
                } else {
                    url = github.tarballUrl(ownerPlusRepo, tag);
                }

                return {
                    url: url,
                    isArchive: isArchive,
                    fragment: fragment,
                    localName: localName
                };
            })
            .then(callback, errback);
    }

    return resolveGithub;
});
