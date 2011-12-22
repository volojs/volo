'use strict';
/*jslint */
/*global define, console, process */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        q = require('q'),
        github = require('pkg/github'),
        download = require('pkg/download'),
        packageJson = require('pkg/packageJson'),
        tar = require('pkg/tar'),
        fileUtil = require('pkg/fileUtil'),
        add;

    function remove(dirName, callback, errback) {
        if (dirName && path.existsSync(dirName)) {
            fileUtil.rmdir(dirName, callback, errback);
        }
    }

    function createTempDir(ownerPlusRepo, version, callback, errback) {
        var tempDir = download.createTempName(ownerPlusRepo + '/' + version);
        if (path.existsSync(tempDir)) {
            remove(tempDir, function () {
                fs.mkdirSync(tempDir);
                callback(tempDir);
            }, errback);
        } else {
            fs.mkdirSync(tempDir);
            callback(tempDir);
        }
    }

    function fetchGitHub(namedArgs, ownerPlusRepo, version, localName, isExplicitLocalName) {
        //First check if localName exists and its version.
        var pkg = packageJson('.'),
            baseUrl = pkg.data && pkg.data.amdBaseUrl || 'js',
            inTempDir = false,
            d = q.defer(),
            existingPath, tempDir;

        //Function used to clean up in case of errors.
        function cleanUp(err) {
            if (inTempDir) {
                process.chdir('..');
            }
            remove(tempDir);
            d.reject(err);
        }

        try {
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
                d.reject(existingPath + ' already exists. To ' +
                                 'install anyway, pass -f to the command');
                return d.promise;
            }

        } catch (e) {
            cleanUp(e);
        }

        //Create a temporary directory to download the code.
        createTempDir(ownerPlusRepo, version, function (newTempDir) {
            tempDir = newTempDir;

            download(github.tarballUrl(ownerPlusRepo, version), path.join(tempDir,
                     localName + '.tar.gz'), function (filePath) {

                process.chdir(tempDir);
                inTempDir = true;

                //Unpack the zip file.
                tar.untar(localName + '.tar.gz', function () {
                    //Find the directory that was unpacked in tempDir
                    var dirName, info, targetName, contents, mainName;

                    process.chdir('..');
                    inTempDir = false;

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
                        //Figure out if this is a one file install.
                        info = packageJson(dirName);
                        if (info.singleFile) {
                            //Just move the single file into position.
                            if (isExplicitLocalName) {
                                targetName = path.join(baseUrl, localName + '.js');
                            } else {
                                targetName = path.join(baseUrl, path.basename(info.file));
                            }

                            //Check for the existence of the singleFileName, and if it
                            //already exists, bail out.
                            if (path.existsSync(targetName) && !namedArgs.force) {
                                cleanUp(targetName + ' already exists. To ' +
                                    'install anyway, pass -f to the command');
                                return;
                            }
                            fs.renameSync(info.file, targetName);
                        } else {
                            //A complete directory install.
                            targetName = path.join(baseUrl, localName);

                            //If directory, remove common directories not needed
                            //for install.

                            //Found the unpacked directory, move it.
                            fs.renameSync(dirName, targetName);

                            //Add in adapter module for AMD code
                            if (info.data.main) {
                                //Trim off any leading dot and file extension, if they exist.
                                mainName = info.data.main.replace(/^\.\//, '').replace(/\.js$/, '');
                                contents = "define(['" + localName + "/" +
                                    mainName + "'], function (main) {\n" +
                                    "    return main;\n" +
                                    "});";

                                fs.writeFileSync(targetName + '.js', contents, 'utf8');
                            }
                        }

                        //Stamp the app's package.json with the dependency??

                        //Trace nested dependencies in the package.json
                        //TODO

                        //All done.
                        remove(tempDir);
                        d.resolve('Installed ' + ownerPlusRepo + '/' + version + ' at ' + targetName);
                    } else {
                        cleanUp('Unexpected tarball configuration');
                    }
                }, cleanUp);
            }, cleanUp);
        }, cleanUp);

        return d.promise;
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
                isExplicitLocalName = !!localName,
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
                    localName = parts[1];
                }

                ownerPlusRepo = parts[0] + '/'  + parts[1];
                version = parts[2];

                if (!version) {
                    //Fetch the latest version
                    github.latestTag(ownerPlusRepo).then(function (tag) {
                        return fetchGitHub(namedArgs, ownerPlusRepo, tag, localName, isExplicitLocalName);
                    }).then(deferred.resolve, deferred.reject);
                } else {
                    fetchGitHub(namedArgs, ownerPlusRepo, version, localName, isExplicitLocalName)
                        .then(deferred.resolve, deferred.reject);
                }
            } else {
                deferred.reject(packageName + ' format is not supported yet.');
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
