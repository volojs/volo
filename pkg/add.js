'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
        github = require('pkg/github'),
        download = require('pkg/download'),
        add;

    add = {
        savePackage: function (url, packageName) {
        },

        doc: 'Add a third party package to your project.',
        validate: function (namedArgs, packageName, version) {
            if (!packageName) {
                return new Error('Please specify a package name or an URL.');
            }

            //Make sure we are in an app directory with a package.json file.
            if (!path.existsSync('package.json')) {
                return new Error('Please run the add command inside a directory ' +
                                 'with a package.json application file.');
            }
            return undefined;
        },
        run: function (deferred, namedArgs, packageName, version) {


            download('https://github.com/jrburke/requirejs/tarball/1.0.2', '1.0.2.tar.gz', function (path) {
                console.log(path + ' is done downloading');
            });
/*
            github('/repos/jrburke/requirejs/tags', function (tags) {
                console.log('TAGS:\n:' + JSON.stringify(tags, null, '  '));
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

            deferred.resolve();
        }
    };

    return add;
});
