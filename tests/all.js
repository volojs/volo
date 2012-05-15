#!/usr/bin/env node

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint nomen: false, strict: false evil: true */
/*global require, requirejs, doh, __dirname, skipDohSetup: true, console */
//'use strict';

var vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    //Set voloPath, used to set up volo/baseUrl and used in volo/config
    //If this is not set, then the all.js location is used, which is not
    //desirable.
    voloPath = path.resolve(path.join('..', 'volo')),
    nodeRequire = require,
    //Special global flag used by DOH.
    skipDohSetup = true,
    bootstrap;

bootstrap = [
    'doh/runner.js',
    'doh/_nodeRunner.js',
    '../tools/require.js',
    '../tools/requirejsVars.js',
    '../tools/node.js'
];

//Load the bootstrap files.
var contents = bootstrap.map(function (filePath) {
    return fs.readFileSync(filePath, 'utf8');
});

eval(contents.join('\n'));

requirejs._reset = function () {
    delete requirejs.s.contexts._;
};

//Ask for q first, to set the nocatch before any promises are generated.
requirejs(['q'], function (q) {

    //Tests
    requirejs([
        'q',
//        '../tests/lib/volo/packageJson/tests',
//        '../tests/lib/volo/version',
//        '../tests/commands/add/tests',
//        '../tests/commands/amdify/tests',
//        '../tests/commands/create/tests',
        '../tests/commands/volofile/tests'
    ], function (q) {

        //All the tests return a an object with the following properties:
        //* start: a deferred to resolve to start the tests for that test module
        //* end: a promise that resolves when the tests are done for that test module.
        var promises = [].slice.call(arguments, 1),
            master = q.defer(),
            last;

        last = promises.reduce(function (previous, current) {
            current.start.resolve(previous.end);
            return current;
        }, {
            start: master,
            end: master.promise
        });

        //Indicate this is the end of the promises, so we get errors
        //logged correctly.
        last.end.then(function () {
            //All promises are done, print out summary.
            doh.run();
        }).end();

        //Start the cascade
        master.resolve();
    });
});
