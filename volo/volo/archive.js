/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var q = require('q'),
        path = require('path'),
        tarGzRegExp = /\.tar\.gz$/,
        //Regexp used to strip off file extension
        fileExtRegExp = /\.tar\.gz$|\.\w+$/;

    return {
        /**
         * Resolves an archive value to a .tar.gz http/https URL.
         * Depends on specific resolver modules to do the work.
         * If no scheme is on the value, the default is assumed
         * to be a github resource.
         * @param {String} archive a string that can somehow resolved to
         * an http/https URL to a .tar.gz or individual file.
         *
         * Returns a promise with the properly resolved value being an
         * object with the following properties:
         *
         * * url: the http/https URL to fetch the archive or single file
         * * isArchive: true if the URL points to a .tar.gz file.
         * * fragment: if a fragment ID (# part) was specified on the original
         *             archive value, normally meaning a file withint an archive
         * * localName: a possible local name to use for the extracted archive
         *              value. Useful to use when an explicit one is not
         *              specified by the user.
         */
        resolve: function (archive) {

            var d = q.defer(),
                index = archive.indexOf(':'),
                fragIndex = archive.indexOf('#'),
                fragment = null,
                scheme,  resolverId, localName;

            //Figure out the scheme. Default is github.
            if (index === -1) {
                scheme = 'github';
            } else {
                scheme = archive.substring(0, index);
                archive = archive.substring(index + 1);
            }

            //If there is a specific file desired inside the archive, peel
            //that off.
            if (fragIndex !== -1) {
                fragment = archive.substring(fragIndex + 1);
                archive = archive.substring(0, fragIndex);
            }

            if (scheme === 'http' || scheme === 'https') {
                //localName is the file name without extension. If a .tar.gz
                //file, then a does not include .tar.gz
                localName = archive.substring(archive.lastIndexOf('/') + 1);
                localName = localName.replace(fileExtRegExp, '');

                d.resolve({
                    url: archive,
                    isArchive: tarGzRegExp.test(archive),
                    fragment: fragment,
                    localName: localName
                });
            } else {
                //Figure out if there is a resolver for the given scheme.
                resolverId = 'volo/resolve/' + scheme;

                if (require.defined(resolverId) ||
                    path.existsSync(require.toUrl(resolverId + '.js'))) {
                    require([resolverId], function (resolve) {
                        resolve(archive, fragment, d.resolve, d.reject);
                    });
                } else {
                    d.reject('Do not have a volo resolver for scheme: ' + scheme);
                }
            }

            return d.promise;
        },

        /**
         * Just tests if the given URL ends in .tar.gz
         */
        isArchive: function (url) {
            return tarGzRegExp.test(url);
        }
    };
});
