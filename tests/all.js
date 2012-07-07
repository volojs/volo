#!/usr/bin/env node

/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint node: true */
/*global doh, skipDohSetup: true, console */
'use strict';

var vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    doh = require('./doh/runner'),
    dohNode = require('./doh/_nodeRunner'),
    q = require('q'),
    //Set voloLib, used to set up volo/baseUrl and used in volo/config
    //If this is not set, then the all.js location is used, which is not
    //desirable.
    voloLib = path.resolve(path.join('..', 'lib')),
    nodeRequire = require,
    //Special global flag used by DOH.
    skipDohSetup = true,
    bootstrap, tests;

global.voloLib = voloLib;
global.doh = doh;

tests = [
    './lib/volo/packageJson/tests',
    './lib/volo/version',
    './commands/create/tests',
    './commands/add/tests',
    './commands/amdify/tests',
    './commands/volofile/tests',
    './full/tests'
];

//All the tests return a an object with the following properties:
//* start: a deferred to resolve to start the tests for that test module
//* end: a promise that resolves when the tests are done for that test module.
var promises = tests.map(function (name) {
        return require(name);
    }),
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
