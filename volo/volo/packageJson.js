/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/volo for details
 */

'use strict';
/*jslint */
/*global define, console */

define(function (require) {
    var path = require('path'),
        fs = require('fs'),
        commentRegExp = /\/\*package\.json([\s\S]*?)\*\//,
        endsInJsRegExp = /\.js$/;

    function extractCommentData(file) {
        var match = commentRegExp.exec(fs.readFileSync(file, 'utf8'));
        if (match) {
            return JSON.parse(match[1]);
        } else {
            return null;
        }
    }

    function packageJson(fileOrDir) {
        var result = {
            file: null,
            data: null,
            singleFile: false
        },
        packagePath = path.join(fileOrDir, 'package.json'),
        jsFiles, filePath, packageData;

        if (fs.statSync(fileOrDir).isFile()) {
            //A .js file that may have a package.json content
            result.data = extractCommentData(fileOrDir);
            result.file = fileOrDir;
            result.singleFile = true;
        } else {
            //Check for /*package.json */ in a .js file if it is the
            //only .js file in the dir.
            jsFiles = fs.readdirSync(fileOrDir).filter(function (item) {
                return endsInJsRegExp.test(item);
            });

            if (jsFiles.length === 1) {
                filePath = path.join(fileOrDir, jsFiles[0]);
                packageData = extractCommentData(filePath);
            }

            if (packageData || !path.existsSync(packagePath)) {
                result.data = packageData;
                result.file = filePath;
                result.singleFile = true;
            } else if (path.existsSync(packagePath)) {
                //Plain package.json case
                packagePath = path.join(fileOrDir, 'package.json');
                result.file = packagePath;
                result.data = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            }
        }

        return result;
    }


    return packageJson;
});
