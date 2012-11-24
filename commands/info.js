/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */


/*jslint node: true, nomen: true, regexp: true */
/*global console, process */


'use strict';

var path = require('path'),
    q = require('q'),
    archive = require('../lib/archive'),
    github = require('../lib/github'),
    file = require('../lib/file'),
    info;

info = {
    summary: 'Get info on a repo',

    doc: file.readFile(path.join(__dirname + '/info/doc.md')),

    //Validate any arguments here.
    validate: function (namedArgs, archiveName) {
        if (!archiveName) {
            return new Error('An archiveName/query needs to be specified: volo info [query]');
        }
    },

    run: function (deferred, v, namedArgs, archiveName) {
        deferred.resolve(info.api.get(archiveName, namedArgs.volo.resolve)
            .then(function (results) {
                return results ? JSON.stringify(results, null, '  ') :
                             'Not able to find info on ' + archiveName + '.';
            }));
    },
    api: {
        get: function (archiveName, resolve) {
            var archiveInfo;
            return archive.resolve(archiveName, resolve)
                .then(function (info) {
                    archiveInfo = info;

                    if (archiveInfo && archiveInfo.scheme === 'github') {
                        //Get all the versions for this repo
                        return github.versionTags(archiveInfo.ownerPlusRepo);
                    }
                })
                .then(function (tags) {
                    archiveInfo.versionTags = tags;
                    return archiveInfo;
                });
        }
    }
};

module.exports = info;
