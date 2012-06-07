/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true, regexp: true */
/*global console, process */
'use strict';

var fs = require('fs'),
    path = require('path'),
    q = require('q'),
    packageJson = require('../lib/packageJson'),
    file = require('../lib/file'),
    amdify = require('./amdify'),
    add = require('./add'),
    makeMainAmdAdapter = amdify.api.makeMainAmdAdapter,
    amdConvert = amdify.api.convert,
    requireRegExp = /require\s*\(\s*['"]([^"']+)["']\s*\)/g,
    npmrel;

function getNodePackages(dir, registry) {
    fs.readdirSync(dir).forEach(function (filePath) {
        var fullPath = path.resolve(dir, filePath),
            stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (filePath === 'node_modules') {
                fs.readdirSync(fullPath).forEach(function (pkgName) {
                    var pkgStat = fs.statSync(fullPath);
                    if (pkgStat.isDirectory()) {
                        registry[pkgName] = path
                                            .resolve(fullPath, pkgName)
                                            //Normalize on front slashes
                                            .replace(/\\/g, '/');
                    }
                });
            }

            try {
                getNodePackages(fullPath, registry);
            } catch (e) {
                //Just eat the errors. Probably a bad symlink.
            }
        }
    });
}

function relativize(pkgPath, filePath) {
    var pkgParts = pkgPath.split('/'),
        fileParts = filePath.split('/'),
        i;

    while (pkgParts[0] === fileParts[0]) {
        pkgParts.shift();
        fileParts.shift();
    }

    if (fileParts.length > 1) {
        //relative path is number of .. for fileParts, then adding pkgParts
        for (i = 1; i < fileParts.length; i += 1) {
            pkgParts.unshift('..');
        }
    } else {
        //A sibling file
        pkgParts.unshift('.');
    }

    return pkgParts.join('/');
}

npmrel = {
    summary: 'Converts npm-installed, nested node_modules to use relative IDs.',

    doc: file.readFile(path.join(__dirname, '/npmrel/doc.md')),

    validate: function (namedArgs, targetDir) {
        if (!targetDir || !file.exists(targetDir)) {
            return new Error('Please pass a target directory to convert.');
        }
        return undefined;
    },

    run: function (d, v, namedArgs, targetDir) {
        targetDir = path.resolve(targetDir).replace(/\\/g, '/');

        var registry = {},
            promise = q.call(function () {}),
            pkg, prop, pkgPath, targetId, lastSegment;

        //Include the targetDir in the registry.
        targetId = targetDir.split('/');
        targetId = targetId[targetId.length - 1];
        registry[targetId] = targetDir;

        //Find all the the packages in the node_modules
        getNodePackages(targetDir, registry);

        //For each package, make sure there is a top level adapter module
        //that bridges to the main module.
        for (prop in registry) {
            if (registry.hasOwnProperty(prop)) {
                //Clean directories/files not needed. Do this before
                //converting modules to reduce the amount of directories
                //and unnecessary work.
                add.api.discard(registry[prop]);
            }
        }

        //Now find all JS files to scan for dependencies and convert.
        file.getFilteredFileList(targetDir, /\.js$/).forEach(function (file) {
            var contents = v.read(file);

            //Convert dependencies to be relative ones.
            contents = contents.replace(requireRegExp, function (match, id) {
                //Remove any trailing ".js" on the ID because that does
                //not work for AMD.
                id = id.replace(/\.js$/, '');

                var parts = id.split('/'),
                    prefix = parts[0];

                if (registry[prefix]) {
                    parts[0] = relativize(registry[prefix], file);
                    return "require('" +
                            parts.join('/') +
                            "')";
                } else {
                    return "require('" + id + "')";
                }
            });

            v.write(file, contents);

            //Convert the module to AMD, but do not freak if it fails,
            //probably malformed JS anyway.

            promise = promise.then(function (msg) {
                var dconvert = q.defer();
                try {
                    amdConvert(file, null, null, null, {
                        commonJs: true
                    }).then(function () {
                        dconvert.resolve();
                    }, function (err) {
                        //Do not care if it errors out, probably
                        //malformed to start.
                        dconvert.resolve();
                    });
                } catch (e) {
                    dconvert.resolve();
                }
                return dconvert.promise;
            });
        });

        //For each package, make sure there is a top level adapter module
        //that bridges to the main module.
        for (prop in registry) {
            if (registry.hasOwnProperty(prop)) {
                pkgPath = registry[prop];
                pkg = packageJson(pkgPath);
                lastSegment = pkgPath.split('/');
                lastSegment = lastSegment[lastSegment.length - 1];
                if (pkg && pkg.data && pkg.data.main) {
                    makeMainAmdAdapter(pkg.data.main, './' + lastSegment, pkgPath + '.js');
                }
            }
        }

        d.resolve(promise);
    }
};

module.exports = npmrel;
