
/*jslint node: true */
'use strict';

var path = require('path'),
    fs = require('fs'),
    semver = require('../../node_modules/semver'),
    config = require('../config').get();

if (!config.fs) {
  throw new Error('No root folder specified - set "fs":"/path/to/modules" in .voloconfig');
}

if (!path.existsSync(config.fs)) {
  throw new Error('Invalid root folder specified in .voloconfig');
}

var root = config.fs;

function resolve(archiveName, fragment, options, done, err) {

    // package format moduleName/semver_or_range
    var parts = archiveName.split('/'),
        module = parts[0],
        range = parts[1] || null,
        dir = path.join(root, module);

    if (!path.existsSync(dir)) {
        err('Module directory not found: ' + dir);
    }

    // module dir will probably contain semver subdirs
    var versions = fs.readdirSync(dir).filter(semver.clean),
        max = semver.maxSatisfying(versions, range);

    // if at least one dir was semver and no max was found
    // the requested semver range could not be satisfied
    if (versions.length && !max) {
        err('No compatible version for ' + archiveName);
    }

    // if a max version was found, rebuild archiveName
    if (max) archiveName = module + '/' + max;

    // it's possible that the requested package is unversioned
    // in which case archiveName will just pass through here

    // resolve to local path
    done({
        id: 'fs:' + archiveName,
        localName: module,
        scheme: 'local',
        url: 'local:' + root +'/' + archiveName
    });

}

module.exports = resolve;
