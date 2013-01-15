/**
 * @license Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global */

'use strict';

var fs = require('fs'),
    path = require('path'),
    q = require('q'),
    parse = require('../lib/parse'),
    file = require('../lib/file'),
    net = require('../lib/net'),
    packageJson = require('../lib/packageJson'),
    github = require('../lib/github'),
    templatePath = path.join(__dirname, 'amdify'),
    template = fs.readFileSync(path.join(templatePath, 'template.js'), 'utf8'),
    exportsTemplate = fs.readFileSync(path.join(templatePath, 'exportsTemplate.js'), 'utf8'),
    exportsNoConflictTemplate = fs.readFileSync(path.join(templatePath, 'exportsNoConflictTemplate.js'), 'utf8'),
    dependsRegExp = /\/\*DEPENDENCIES\*\//g,
    varNamesRegExp = /\/\*VARNAMES\*\//g,
    contentsComment = '/*CONTENTS*/',
    exportsRegExp = /\/\*EXPORTS\*\//g,
    jsSuffixRegExp = /\.js$/,
    main;

function parseDepends(depends) {
    var varNames = [];

    if (depends) {
        depends = depends.split(',').map(function (value) {
            var varSeparator = value.indexOf('='),
                varName;

            //If the dependency is id>localvar, split it apart,
            //and track the localvar separately.
            if (varSeparator !== -1) {
                varName = value.substring(varSeparator + 1);
                value = value.substring(0, varSeparator);
            }

            if (varName) {
                varNames.push(varName);
            }
            return "'" + value + "'";
        });
    } else {
        depends = [];
    }

    //Convert the depends and varNames to a string.
    return {
        depends: depends.join(','),
        varNames: varNames.join(',')
    };
}

main = {
    //Text summary used when listing commands.
    summary: 'Does a simple AMD wrapping for JS libraries that use ' +
             'browser globals',

    doc: file.readFile(path.join(__dirname, '/amdify/doc.md')),

    flags: {
        'noConflict': 'noConflict',
        'noprompt': 'noprompt',
        'commonJs': 'commonJs'
    },

    //Validate any arguments here.
    validate: function (namedArgs, target) {
        if (!target) {
            return new Error('A target file needs to be specified');
        }

        if (!file.exists(target)) {
            return new Error(target + ' does not exist!');
        }

        return undefined;
    },

    run: function (deferred, v, namedArgs, target) {
        var depends = namedArgs.depends,
            exports = namedArgs.exports || '',
            noConflict = namedArgs.noConflict,
            completeMessage = '',
            varNames, jsFiles;

        deferred.resolve(q.call(function () {
            var parsed = parseDepends(depends),
                promise = q.call(function () {});

            depends = parsed.depends;
            varNames = parsed.varNames;

            if (fs.statSync(target).isDirectory()) {
                //Find all the .js files in the directory and convert them.
                jsFiles = file.getFilteredFileList(target, /\.js$/);
                jsFiles.forEach(function (file) {
                    promise = promise.then(function (msg) {
                        if (msg) {
                            completeMessage += (completeMessage ? '\n' : '') +  msg;
                        }
                        return main.api.convert(file, depends, varNames, exports, {
                            v: v,
                            noConflict: noConflict,
                            noprompt: namedArgs.noprompt,
                            commonJs: namedArgs.commonJs,
                            github: namedArgs.github
                        });
                    });
                });

                //Catch the final conversion message
                return promise.then(function (msg) {
                    if (msg) {
                        completeMessage += (completeMessage ? '\n' : '') +  msg;
                    }
                    return completeMessage;
                });
            } else {
                return main.api.convert(target, depends, varNames, exports, {
                    v: v,
                    noConflict: noConflict,
                    noprompt: namedArgs.noprompt,
                    github: namedArgs.github
                });
            }
        }));
    },

    api: {
        makeMainAmdAdapter: function (mainValue, localName, targetFileName) {
            var mainName = mainValue
                   .replace(/^\.\//, '')
                   .replace(jsSuffixRegExp, ''),
                mainPath, contents;

            //Make sure the main file exists.
            mainPath = packageJson.resolveMainPath(targetFileName.replace(jsSuffixRegExp, ''),
                                                   mainValue);

            if (file.exists(mainPath)) {
                //Add in adapter module for AMD code
                contents = "define(['" + localName + "/" + mainName +
                           "'], function (main) {\n" +
                            "    return main;\n" +
                            "});";

                fs.writeFileSync(targetFileName, contents, 'utf8');
            }
        },

        //Returns a promise, since it can prompt the user for info
        convert: function (target, depends, varNames, exports, options) {
            options = options || {};
            depends = depends || '';
            varNames = varNames || '';
            exports = exports || '';

            var contents = fs.readFileSync(target, 'utf8'),
                prelude = '',
                d = q.defer(),
                v = options.v,
                dependPrompted = false,
                suggestions = [
                    {
                        re: /jquery/i,
                        suggest: 'jquery',
                        fullSuggest: 'jquery=jQuery'
                    },
                    {
                        re: /backbone/i,
                        suggest: 'backbone',
                        fullSuggest: 'backbone=Backbone'
                    }
                ],
                temp, commentIndex, cjsProps, amdProps, dependSuggestion,
                dependFullSuggestion;

            if (contents.charAt(0) === '#') {
                //This is probably an executable file for node, skip it.
                d.resolve('SKIP: ' + target + ': node executable script.');
                return;
            }

            try {
                amdProps = parse.usesAmdOrRequireJs(target, contents);
            } catch (e) {
                //Some JS files are just malformed, parts. Just ignore
                //errors.
                d.resolve('SKIP: ' + target + ': Parse error for AMD check: ' + e);
                return;
            }

            if (amdProps && (!amdProps.declaresDefine ||
                            (amdProps.declaresDefine && amdProps.defineAmd))) {
                //AMD in use, and it is not a file that declares a define().
                //If it does declare define(), also declares define.amd,
                //so does not need transformation as it is likely an AMD loader.
                d.resolve('SKIP: ' + target + ': already uses AMD.');
                return;
            }

            q.call(function () {
                if (options.github) {
                    return net.getJson(github.rawUrl('volojs/repos',
                                                     'master',
                                                     options.github +
                                                     '/amd.json'),
                        { ignore404: true }
                    );
                }
            }).then(function (override) {
                if (override) {
                    if (override.deps && override.deps.length) {
                        var overrideParsed = parseDepends(override.deps.join(','));
                        depends = overrideParsed.depends;
                        varNames = overrideParsed.varNames;
                    }
                    if (override.exports) {
                        exports = override.exports;
                    }
                }

                //Not already AMD, try for override file.
                try {
                    cjsProps = parse.usesCommonJs(target, contents);
                } catch (e2) {
                    //Some JS files are just malformed, parts. Just ignore
                    //errors.
                    d.resolve('SKIP: ' + target + ': Parse error for CommonJS check: ' + e2);
                    return;
                }

                if (!cjsProps && options.commonJs) {
                    cjsProps = {};
                }

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
                    d.resolve('CONVERTED: ' + target + ': wrapped define().');
                } else {
                    //May need to prompt the user for input so use promises.
                    d.resolve(q.call(function () {
                        var message;

                        //If no explicit depends passed in, ask, but only if no exports
                        //either and noprompt is not in play.
                        if (v && !depends && !exports && !options.noprompt) {
                            dependPrompted = true;

                            //Suggest a dependency for common things.
                            suggestions.some(function (suggestion) {
                                //If a match, but he match is not [suggest].js, which
                                //indicates the actual suggestion is being installed,
                                //not something that depends on it.
                                if (suggestion.re.test(target) &&
                                    target.lastIndexOf(suggestion.suggest + '.js') !==
                                    target.length - suggestion.suggest.length - 3) {
                                    dependSuggestion = suggestion.suggest;
                                    dependFullSuggestion = suggestion.fullSuggest;
                                    return true;
                                }
                            });

                            message = 'No AMD/CommonJS dependencies ' +
                                      'detected for: ' + target + '\n' +
                                      'List any dependencies, ' +
                                      'comma separated, no spaces' +
                                      (dependSuggestion ? ' [' + dependSuggestion + ']' : '') +
                                      ': ';
                            return v.prompt(message);
                        }
                    }).then(function (promptDepends) {
                        //If no value, but there was a suggestion, the suggestion is wanted.
                        if (!promptDepends && dependFullSuggestion) {
                            promptDepends = dependFullSuggestion;
                        }

                        if (promptDepends) {
                            depends = promptDepends;
                        }

                        //If no explicit depends passed in, ask, but only if no depends
                        //either and noprompt is not in play.
                        if (v && !exports && dependPrompted && !options.noprompt) {
                            return v.prompt('What global to use for exported value []: ');
                        }
                    }).then(function (promptExports) {
                        var parsed;

                        if (promptExports) {
                            exports = promptExports;
                        }

                        if (dependPrompted) {
                            parsed = parseDepends(depends);
                            depends = parsed.depends;
                            varNames = parsed.varNames;
                        }

                        //Get the export boilerplate ready.
                        if (exports) {
                            exports = options.noConflict ?
                                        exportsNoConflictTemplate.replace(exportsRegExp, exports) :
                                        exportsTemplate.replace(exportsRegExp, exports);
                        }

                        //Create the main wrapping. Do depends and exports replacement
                        //before inserting the main contents, to avoid problems with
                        //a possibly undesirable regexp replacement.
                        temp = template
                                .replace(dependsRegExp, depends)
                                .replace(varNamesRegExp, varNames)
                                .replace(exportsRegExp, exports);

                        //Cannot use a regexp replacement for comment, because if
                        //the contents contain funky regexp associated markers, like
                        //a `$`, then get double content insertion.
                        commentIndex = temp.indexOf(contentsComment);
                        contents = temp.substring(0, commentIndex) +
                                   contents +
                                   temp.substring(commentIndex + contentsComment.length, temp.length);

                        fs.writeFileSync(target, contents, 'utf8');

                        return 'CONVERTED: ' + target +
                               (depends ? ': depends: ' + depends.trim() : '') +
                               (varNames ? ': localvars: ' + varNames : '') +
                               (exports ? ': exports: ' + exports.trim() : '');
                    }));
                }
            })
            .fail(d.reject);

            return d.promise;
        }
    }
};

module.exports = main;
