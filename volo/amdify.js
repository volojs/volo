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
        depsRegExp = /\/\*DEPENDENCIES\*\//,
        contentsRegExp = /\/\*CONTENTS\*\//,
        amdifyRegExp = /volo amdify/,
        main;

    main = {
        //Text summary used when listing commands.
        summary: 'Does a simple AMD wrapping for JS libraries that use ' +
                 'browser globals',

        doc: require('text!./amdify/doc.md'),

        //Validate any arguments here.
        validate: function (namedArgs, target, deps) {
            if (!target) {
                return new Error('A target file needs to be specified');
            }

            if (!deps) {
                return new Error('Please pass dependencies. Scripts that do ' +
                                 'not need dependencies do not need to be ' +
                                 'converted by amdify.');
            }

            if (!path.existsSync(target)) {
                return new Error(target + ' does not exist!');
            }

            return undefined;
        },

        run: function (deferred, namedArgs, target, deps) {
            deps = deps.split(',').map(function (value) {
                return "'" + value + "'";
            });

            //Convert the deps to a string.
            deps = deps.join(',');

            var contents = fs.readFileSync(target, 'utf8');

            if (amdifyRegExp.test(contents)) {
                return deferred.reject('Looks like amdify has already been ' +
                                       'applied to ' + target);
            } else {
                contents = template
                            .replace(depsRegExp, deps)
                            .replace(contentsRegExp, contents);

                fs.writeFileSync(target, contents, 'utf8');

                return deferred.resolve('amdify has modified ' + target);
            }
        }
    };

    return require('volo/commands').register(module.id, main);
});
