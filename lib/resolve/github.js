/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
'use strict';

var archive = require('../archive'),
    github = require('../github'),
    net = require('../net'),
    search = require('../../commands/search'),
    q = require('q'),
    qutil = require('../qutil'),
    jsSuffixRegExp = /\.js$/,
    versionRegExp = /\{version\}/g;

function resolveGithub(archiveName, fragment, options, callback, errback) {

    var parts = archiveName.split('/'),
        originalFragment = fragment,
        d = qutil.convert(callback, errback),
        isArchive = true,
        isSingleFile = false,
        possibleSingleFile = false,
        scheme = 'github',
        overrideFragmentIndex, url, tag, versionOnlyTag, ownerPlusRepo,
        version, localName, packageInfo, browserInfo;

    d.resolve(q.call(function () {
        if (parts.length === 1) {
            //Need to do a search for a repo.
            return search.api(archiveName, options).then(function (results) {
                var archive;
                if (results && results.length) {
                    archive = results[0].archive;
                    console.log('Using github repo "' + archive +
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

        //Fetch the latest version
        return github.latestTag(ownerPlusRepo + (version ? '/' + version : ''));
    }).then(function (tagResult) {
        tag = tagResult;

        //Some version tags have a 'v' prefix, remove that for token
        //replacements used below.
        versionOnlyTag = tag.replace(/^v/, '');

        //Check the repo for a package.json file that may have info on
        //an install url or something.
        var pkgUrl = github.rawUrl(ownerPlusRepo, tag, 'package.json'),
            dPkg = q.defer();

        net.getJson(pkgUrl).then(function (pkg) {
            if (pkg) {
                packageInfo = pkg;
                browserInfo = pkg.volo || pkg.browser;
            }
            dPkg.resolve(browserInfo);
        }, function (err) {
            //Do not care about errors, it will be common for projects
            //to not have a package.json.
            dPkg.resolve();
        });

        return dPkg.promise;
    })
    .then(function (voloInfo) {
        //If no voloInfo, see if there is something in the volojs/repos
        //repo.
        if (!voloInfo) {
            var pkgDeferred = q.defer(),
                pkgUrl = github.rawUrl('volojs/repos', 'master',
                                        ownerPlusRepo + '/package.json');

            net.getJson(pkgUrl).then(function (pkg) {
                if (pkg) {
                    if (!packageInfo) {
                        packageInfo = pkg;
                    }
                    if (pkg.volo) {
                        browserInfo = pkg.volo;
                        packageInfo.volo = browserInfo;
                    }
                    if (pkg.browser) {
                        browserInfo = pkg.browser;
                        packageInfo.browser = browserInfo;
                    }
                }
                pkgDeferred.resolve();
            }, function (err) {
                //Do not care about errors, it will be common for projects
                //to not have a package.json.
                pkgDeferred.resolve();
            });
            return pkgDeferred.promise;
        }
    })
    .then(function () {

        //If there is a specific url to finding the file,
        //for instance jQuery releases are put on a CDN and are not
        //committed to github, use the url.
        if (fragment || (browserInfo && browserInfo.url)) {
            //If a specific file in the repo, do not need the full
            //zipball, just use a raw github url to get it. However,
            //it may just be a directory, so check github first.
            possibleSingleFile = true;
            if (fragment) {
                url = github.rawUrl(ownerPlusRepo, tag, fragment);

                //Confirm it is for a single file. If get a 200, then
                //it is a real single file (probably .js file). Otherwise
                //the fragment is
                return net.head(url).then(function (response) {
                    var index;

                    //Remove any trailing slash for local name.
                    localName = fragment.replace(/\/$/, '');

                    //Adjust local name to be the last segment of a path.
                    index = localName.lastIndexOf('/');
                    if (index !== -1) {
                        localName = localName.substring(index + 1);
                    }

                    //Strip off extension name.
                    index = localName.lastIndexOf('.');
                    if (index !== -1) {
                        localName = localName.substring(0, index);
                    }

                    if (response.statusCode >= 200 &&
                        response.statusCode < 300) {

                        fragment = null;
                        isSingleFile = true;
                    } else {
                        //Not a single js file
                        possibleSingleFile = false;
                    }
                });
            } else {
                //An browserInfo.url situation.
                url = browserInfo.url.replace(versionRegExp, versionOnlyTag);

                //Change the localName to be the file name of the URL.
                localName = url.split('/').pop().replace(jsSuffixRegExp, '');

                fragment = null;
                isSingleFile = true;
            }
        }

    })
    .then(function () {

        if (possibleSingleFile) {
            isArchive = archive.isArchive(url);
        } else {
            if (browserInfo && browserInfo.archive) {
                url = browserInfo.archive.replace(versionRegExp, versionOnlyTag);
                overrideFragmentIndex = url.indexOf('#');

                //Remove any ".js" from the name since it can conflict
                //with AMD loading.
                localName = localName.replace(jsSuffixRegExp, '');

                if (overrideFragmentIndex !== -1) {
                    //If no explicit fragment specified, then use the one
                    //in this browserInfo.
                    if (!fragment) {
                        fragment = url.substring(overrideFragmentIndex + 1);
                    }
                    url = url.substring(0, overrideFragmentIndex);
                }
            } else {
                url = github.zipballUrl(ownerPlusRepo, tag);

                //Remove any ".js" from the name since it can conflict
                //with AMD loading.
                localName = localName.replace(jsSuffixRegExp, '');
            }
        }

        return {
            id: scheme + ':' + ownerPlusRepo + '/' + tag +
                     (originalFragment ? '#' + originalFragment : ''),
            scheme: scheme,
            url: url,
            isArchive: isArchive,
            isSingleFile: isSingleFile,
            fragment: fragment,
            localName: localName,
            packageInfo: packageInfo,
            ownerPlusRepo: ownerPlusRepo
        };
    }));

    return d.promise;
}

module.exports = resolveGithub;
