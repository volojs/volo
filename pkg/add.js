'use strict';
/*jslint */
/*global define */

define(function (require) {
    var fs = require('fs'),
        path = require('path'),
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
            var url;

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

            deferred.resolve();
        }
    };

    return add;
});
