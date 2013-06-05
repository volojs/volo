/**
 * @license Copyright (c) 2011-2013, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */

'use strict';

var path = require('path'),
    glob = require('glob'),
    packageJson = require('../lib/packageJson'),
    file = require('../lib/file');

module.exports = {

    summary: 'Removes a dependency listed in project\'s package.json from the project.',

    doc: file.readFile(path.join(__dirname + '/remove/doc.md')),

    validate: function (namedArgs, depName) {
        if (!depName) {
            return new Error('Please specify a name to use for the created project.');
        }

        var errMsg,
            pkg = packageJson('.'),
            deps = pkg.data && pkg.data.volo && pkg.data.volo.dependencies;

        if (!pkg.file) {
            return new Error('No package.json found in: ' + path.resolve('.'));
        }
        if (!deps) {
            return new Error('No volo.dependencies found in package.json');
        }
        if (!deps[depName]) {
            errMsg = '"' + depName + '" not found in volo.dependencies. Choices are:';
            Object.keys(deps).forEach(function (key) {
                errMsg += '\n' + key;
            });
            return new Error(errMsg);
        }

        namedArgs._privateRemove = {
            pkg: pkg
        };
    },

    run: function (deferred, v, namedArgs, depName) {
        var pkg = namedArgs._privateRemove.pkg,
            baseDir = pkg.getBaseDir(),
            files = glob.sync(depName + '*', {
                cwd: baseDir
            });

        //Remove associated files
        if (files) {
            files.forEach(function (fileName) {
                file.rm(path.join(baseDir, fileName));
            });
        }

        //Update the package.json to not have the value
        delete pkg.data.volo.dependencies[depName];
        pkg.save();
        deferred.resolve();
    }
};
