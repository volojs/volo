/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

'use strict';
/*jslint */
/*global define */

define(function (require, exports, module) {
    var fs = require('fs'),
        path = require('path'),
        parse = require('volo/parse'),
        file = require('volo/file'),
        template = require('text!./amdify/template.js'),
        exportsTemplate = require('text!./amdify/exportsTemplate.js'),
        exportsNoConflictTemplate = require('text!./amdify/exportsNoConflictTemplate.js'),
        dependsRegExp = /\/\*DEPENDENCIES\*\//g,
        contentsComment = '/*CONTENTS*/',
        exportsRegExp = /\/\*EXPORTS\*\//g,
        main;

    main = {
        //Text summary used when listing commands.
        summary: 'Does a simple AMD wrapping for JS libraries that use ' +
                 'browser globals',

        doc: require('text!./amdify/doc.md'),

        flags: {
            'noConflict': 'noConflict'
        },

        //Validate any arguments here.
        validate: function (namedArgs, target) {
            if (!target) {
                return new Error('A target file needs to be specified');
            }

            if (!path.existsSync(target)) {
                return new Error(target + ' does not exist!');
            }

            return undefined;
        },

        run: function (deferred, v, namedArgs, target) {
            var depends = namedArgs.depends,
                exports = namedArgs.exports || '',
                noConflict = namedArgs.noConflict,
                completeMessage = '',
                jsFiles;

            if (depends) {
                depends = depends.split(',').map(function (value) {
                    return "'" + value + "'";
                });
            } else {
                depends = [];
            }

            //Convert the depends to a string.
            depends = depends.join(',');

            if (fs.statSync(target).isDirectory()) {
                //Find all the .js files in the directory and convert them.
                jsFiles = file.getFilteredFileList(target, /\.js$/);
                jsFiles.forEach(function (file) {
                    var msg = main.util.convert(file, depends, exports, noConflict);
                    if (msg) {
                        completeMessage += (completeMessage ? '\n' : '') +  msg;
                    }
                });
                return deferred.resolve(completeMessage);
            } else {
                return deferred.resolve(main.util.convert(target, depends, exports, noConflict));
            }
        },

        util: {
            makeMainAmdAdapter: function (mainValue, localName, targetFileName) {
                //Trim off any leading dot and file
                //extension, if they exist.
                var mainName = mainValue
                               .replace(/^\.\//, '')
                               .replace(/\.js$/, ''),
                contents;

                //Add in adapter module for AMD code
                contents = "define(['" + localName + "/" + mainName +
                           "'], function (main) {\n" +
                            "    return main;\n" +
                            "});";

                fs.writeFileSync(targetFileName, contents, 'utf8');
            },

            convert: function (target, depends, exports, noConflict) {
                var contents = fs.readFileSync(target, 'utf8'),
                    prelude = '',
                    temp, commentIndex, cjsProps, amdProps;

                if (contents.charAt(0) === '#') {
                    //This is probably an executable file for node, skip it.
                    return 'SKIP: ' + target + ': node executable script.';
                }

                amdProps = parse.usesAmdOrRequireJs(target, contents);
                if (amdProps && (!amdProps.declaresDefine ||
                                (amdProps.declaresDefine && amdProps.defineAmd))) {
                    //AMD in use, and it is not a file that declares a define()
                    //or if it does, does not declare define.amd.
                    return 'SKIP: ' + target + ': already uses AMD.';
                } else {
                    cjsProps = parse.usesCommonJs(target, contents);
                    //If no exports or depends and it looks like a cjs module convert
                    if (!exports && !depends && cjsProps) {
                        if (cjsProps.filename || cjsProps.dirname) {
                            prelude = "var __filename = module.uri, " +
                                      "__dirname = __filename.substring(0, __filename.lastIndexOf('/');";
                        }
                        //Just do a simple wrapper.
                        contents = 'define(function (require, exports, module) {' + prelude + '\n' +
                                    contents +
                                    '\n});';
                        fs.writeFileSync(target, contents, 'utf8');
                        return 'CONVERTED: ' + target + ': wrapped define().';
                    } else {
                        //Get the export boilerplate ready.
                        if (exports) {
                            exports = noConflict ?
                                        exportsNoConflictTemplate.replace(exportsRegExp, exports) :
                                        exportsTemplate.replace(exportsRegExp, exports);
                        }

                        //Create the main wrapping. Do depends and exports replacement
                        //before inserting the main contents, to avoid problems with
                        //a possibly undesirable regexp replacement.
                        temp = template
                                .replace(dependsRegExp, depends)
                                .replace(exportsRegExp, exports);

                        //Cannot use a regexp replacement for comment, because if
                        //the contents contain funky regexp associated markers, like
                        //a `$`, then get double content insertion.
                        commentIndex = temp.indexOf(contentsComment);
                        contents = temp.substring(0, commentIndex) +
                                   contents +
                                   temp.substring(commentIndex + contentsComment.length, temp.length);

                        fs.writeFileSync(target, contents, 'utf8');

                        return 'CONVERTED: ' + target + ': depends: ' + depends +
                               '; exports: ' + exports + '.';
                    }
                }
            }
        }
    };

    return require('volo/commands').register(module.id, main);
});
