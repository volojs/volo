'use strict';
/*jslint */
/*global define, console, process */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        github = require('pkg/github'),
        download = require('pkg/download'),
        packageJson = require('pkg/packageJson'),
        tar = require('pkg/tar'),
        fileUtil = require('pkg/fileUtil'),
        add;

    function remove(dirName) {
        fs.unlink(dirName);
    }

    function fetchGitHub(namedArgs, ownerPlusRepo, version, localName, deferred) {
        //First check if localName exists and its version.
        var pkg = packageJson('.'),
            baseUrl = pkg.data && pkg.data.amdBaseUrl || 'js',
            existingPath, tempDir;

        //If the baseUrl does not exist, create it.
        fileUtil.mkdirs(baseUrl);

        //Get the package JSON data for dependency, if it is already on disk.
        existingPath = path.join(baseUrl, localName);
        if (!path.existsSync(existingPath)) {
            existingPath += '.js';
            if (!path.existsSync(existingPath)) {
                existingPath = null;
            }
        }

        pkg = (existingPath && packageJson(existingPath)) || {};

        if (existingPath && !namedArgs.force) {
            deferred.resolve(new Error(existingPath + ' already exists. To ' +
                             'install anyway, pass -f'));
            return;
        }

        //Create a temporary directory to download the code.
        tempDir = download.createTempName(ownerPlusRepo + '/' + version);
        fs.mkdirSync(tempDir);

        download(github.tarballUrl(ownerPlusRepo, version), path.join(tempDir,
                 localName + '.tar.gz'), function (filePath) {

            //Unpack the zip file.
            process.chdir(tempDir);
            tar.untar(localName + '.tar.gz', function () {
                //Find the directory that was unpacked in tempDir
                var dirName;

                process.chdir('..');

                fs.readdirSync(tempDir).some(function (file) {
                    dirName = path.join(tempDir, file);
                    if (fs.statSync(dirName).isDirectory()) {
                        return true;
                    } else {
                        dirName = null;
                        return false;
                    }
                });

                if (dirName) {
                    //Found the unpacked directory, move it.
                    fs.renameSync(dirName, path.join(baseUrl, localName));

                    //Stamp the app's package.json with the dependency??

                    //Add in adapter module for AMD code??

                    //All done.
                    remove(tempDir);
                    deferred.resolve();
                } else {
                    //Clean up mess
                    remove(tempDir);
                    deferred.resolve(new Error('Unexpected tarball configuration'));
                }
            }, function (err) {
                process.chdir('..');
                remove(tempDir);
                deferred.resolve(err);
            });
        }, function (err) {
            //Clean up the tempdir area.
            remove(tempDir);

            //Signal the end of the action.
            deferred.resolve(err);
        });
    }

    add = {
        savePackage: function (url, packageName) {
        },

        doc: 'Add a third party package to your project.',
        validate: function (namedArgs, packageName, version) {
            if (!packageName) {
                return new Error('Please specify a package name or an URL.');
            }

            //Make sure we are in an app directory with a package.json file,
            //or a JS file with
            if (!packageJson('.').data) {
                return new Error('Please run the add command inside a directory ' +
                                 'with a package.json file, or a JS file ' +
                                 'with a /*package.json */ comment');
            }

            //Adjust any shorthand command flags to long name values.
            if (namedArgs.f) {
                namedArgs.force = true;
            }

            return undefined;
        },
        run: function (deferred, namedArgs, packageName, localName) {

            //Figure out what packageName is. Options are:
            //* file:local/file/path
            //* file:local/file/path/package.tar.gz
            //* file:local/file/path/lib.js
            //* owner/project/version (github)
            //* owner/project (github)
            //* scheme:something (github:, npm: http: etc)

            var index = packageName.indexOf(':'),
                scheme, parts, ownerPlusRepo, version;

            if (index === -1) {
                scheme = 'github';
            } else {
                scheme = packageName.substring(0, index);
                packageName = packageName.substring(index + 1);
            }

            if (scheme === 'github') {
                //A github location.
                parts = packageName.split('/');

                if (!localName) {
                    if (parts.length === 2) {
                        localName = parts[1];
                    }
                    if (parts.length === 3) {
                        localName = parts[2];
                    }
                }

                ownerPlusRepo = parts[0] + '/'  + parts[1];
                version = parts[2];

                if (!version) {
                    //Fetch the latest version
                    github.latestTag(ownerPlusRepo, function (tag) {
                        fetchGitHub(namedArgs, ownerPlusRepo, tag, localName, deferred);
                    });
                } else {
                    fetchGitHub(namedArgs, ownerPlusRepo, version, localName, deferred);
                }
            } else {
                throw new Error(packageName + ' format is not supported yet.');
            }


            //If no localName, find an appropriate value.

/*

pkg.js add jrburke/requirejs
pkg.js add jrburke/requirejs/1.0.2
pkg.js add some/local/path
pkg.js add http://www.some/package.tar.gz



Check for existing install.

check for local path, then assume a github:url





pkg.js add jrburke/requirejs
pkg.js add jrburke/requirejs/1.0.2

in package.json

dependencies: {
    requirejs: '1.0.2'
}

have a way to do format conversion?

pkg.js add requirejs: need directory listing? something in github? use github oauth stuff?
figure out a way to find the "master" fork. Bigger problem is no search API for github.




*/
/*
            download('https://github.com/jrburke/requirejs/tarball/1.0.2', '1.0.2.tar.gz', function (path) {
                console.log(path + ' is done downloading');
            });

            github.latestTag('jrburke/requirejs', function (tags) {
                console.log('requirejs: ' + JSON.stringify(tags, null, '  '));
            });
*/

//https:///repos/jrburke/requirejs/tags



/*
            //Package may just be an URL or absolute path ref
            if (packageName.indexOf(':') !== -1 || packageName.charAt(0) === '/') {
                url = packageName;
                packageName = version;
            }

            if (!url) {
                //Look up package in registry

            } else {
                add.savePackage(url, packageName);
            }

*/

        }
    };

    return add;
});
