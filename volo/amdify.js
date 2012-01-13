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
        template = require('text!./amdify/template.js'),
        exportsTemplate = require('text!./amdify/exportsTemplate.js'),
        dependRegExp = /\/\*DEPENDENCIES\*\//,
        contentsRegExp = /\/\*CONTENTS\*\//,
        exportsRegExp = /\/\*EXPORTS\*\//,
        amdifyRegExp = /volo amdify/,
        main;

    main = {
        //Text summary used when listing commands.
        summary: 'Does a simple AMD wrapping for JS libraries that use ' +
                 'browser globals',

        doc: require('text!./amdify/doc.md'),

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

        run: function (deferred, namedArgs, target) {
            var depend = namedArgs.depend,
                exports = namedArgs.exports || '',
                contents = fs.readFileSync(target, 'utf8');

            if (depend) {
                depend = depend.split(',').map(function (value) {
                    return "'" + value + "'";
                });
            } else {
                depend = [];
            }

            //Convert the depend to a string.
            depend = depend.join(',');

            if (amdifyRegExp.test(contents)) {
                return deferred.reject('Looks like amdify has already been ' +
                                       'applied to ' + target);
            } else {
                //Get the export boilerplate ready.
                if (exports) {
                    exports = exportsTemplate.replace(exportsRegExp, exports);
                }

                //Create the main wrapping. Do depend and exports replacement
                //before inserting the main contents, to avoid problems with
                //a possibly undesirable regexp replacement.
                contents = template
                            .replace(dependRegExp, depend)
                            .replace(exportsRegExp, exports)
                            .replace(contentsRegExp, contents);

                fs.writeFileSync(target, contents, 'utf8');

                return deferred.resolve('amdify has modified ' + target);
            }
        }
    };

    return require('volo/commands').register(module.id, main);
});
