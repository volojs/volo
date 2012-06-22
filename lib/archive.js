/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global console */

'use strict';

var q = require('q'),
    fs = require('fs'),
    path = require('path'),
    exists = require('./exists'),
    net = require('./net'),
    mime = require('./mime'),
    baseDir = __dirname,
    endSlashIndexRegExp = /[\/\\]$/,
    zipRegExp = /\.zip$/,
    //Regexp used to strip off file extension
    fileExtRegExp = /\.tar\.gz$|\.\w+$/,
    handledSchemes = {
        http: true,
        https: true,
        local: true,
        symlink: true
    },
    archiveLib;

module.exports = (archiveLib = {
    /**
     * Resolves an archive value to a .tar.gz http/https URL.
     * Depends on specific resolver modules to do the work.
     * If no scheme is on the value, the default is assumed
     * to be a github resource.
     * @param {String} archive a string that can somehow resolved to
     * an http/https URL to a .tar.gz or individual file.
     *
     * @param {Function} [resolve] an optional resolve function to use
     * to resolve relative local file paths.
     *
     * @param {Object} [options] an optional object that contains options
     * for the resolution. An example is amd: true to indicate this is an
     * AMD-based project.
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
    resolve: function (archive, resolve, options) {

        var d = q.defer(),
            index = archive.indexOf(':'),
            fragIndex = archive.indexOf('#'),
            fragment = null,
            isSingleFile = false,
            localRefName, scheme,  resolverId, localName, resolveMod,
            isArchive;

        //If there is a specific file desired inside the archive, peel
        //that off.
        if (fragIndex !== -1) {
            fragment = archive.substring(fragIndex + 1);
            archive = archive.substring(0, fragIndex);
        }

        //Make sure the archive does not end in a slash, since slashes
        //are important, particularly for github urls.
        archive = archive.replace(endSlashIndexRegExp, '');

        //Figure out the scheme. Default is github, unless a local
        //path matches.
        if (index === -1) {
            if (archive.indexOf('.') === 0 || exists(archive)) {
                scheme = 'local';
            } else {
                scheme = 'github';
            }
        } else {
            scheme = archive.substring(0, index);
            archive = archive.substring(index + 1);
        }

        if (handledSchemes.hasOwnProperty(scheme)) {
            //localName is the file name without extension. If a .tar.gz
            //file, then a does not include .tar.gz
            if (fragment) {
                localRefName = fragment;
            } else {
                localRefName = archive;
            }
            localName = localRefName.substring(localRefName.lastIndexOf('/') + 1);
            localName = localName.replace(fileExtRegExp, '');

            //Resolve relative paths for this particular archive
            //resolve call.
            if ((scheme === 'symlink' || scheme === 'local') && resolve) {
                archive = resolve(archive);

                //If the archive source does not exist, bail.
                if (!exists(archive)) {
                    d.reject(new Error(archive + ' does not exist'));
                    return d.promise;
                } else {
                    if (fs.statSync(archive).isFile()) {
                        isSingleFile = true;
                    }
                    isArchive = archiveLib.isArchive(archive);
                }
            }

            q.fcall(function () {
                if ((scheme === 'http' || scheme === 'https')) {
                    return net.head(scheme + ':' + archive, {
                        followRedirects: true
                    }).then(function (response) {
                        var contentType = response.headers['content-type'];
                        if (mime.archiveTypes[contentType]) {
                            //A zip file
                            isArchive = true;
                        } else {
                            isArchive = false;
                            isSingleFile = true;
                        }
                    });
                }
            }).then(function () {
                d.resolve({
                    id: scheme + ':' + archive + (fragment ? '#' + fragment : ''),
                    scheme: scheme,
                    url: scheme + ':' + archive,
                    isArchive: isArchive,
                    isSingleFile: isSingleFile,
                    fragment: fragment,
                    localName: localName
                });

            }).fail(d.reject);
        } else {
            //Figure out if there is a resolver for the given scheme.
            resolverId = path.join(baseDir, 'resolve', scheme + '.js');

            try {
                resolveMod = require(resolverId);
                resolveMod(archive, fragment, options, d.resolve, d.reject);
            } catch (e) {
                d.reject('Do not have a volo resolver for scheme: ' + scheme + ': ' + e);
            }
        }

        return d.promise;
    },

    /**
     * Just tests if the given URL ends in .tar.gz
     */
    isArchive: function (url) {
        return zipRegExp.test(url);
    }
});
