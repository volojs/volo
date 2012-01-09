/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/volojs/volo for details
 */

/*jslint nomen: false, strict: false evil: true */
/*global require, requirejs, doh, __dirname, skipDohSetup: true */
//'use strict';

var vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
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

function load(testPath) {
    var contents = fs.readFileSync(testPath, 'utf8');

    return requirejs.exec(contents, {
        doh: doh,
        __filename: testPath,
        __dirname: path.dirname(testPath),
        setTimeout: setTimeout
    });
}

//Test stuff
var contents = bootstrap.map(function (filePath) {
    return fs.readFileSync(filePath, 'utf8');
});

eval(contents.join('\n'));

requirejs._reset = function () {
    delete requirejs.s.contexts._;
};

requirejs.config({
    baseUrl: path.join(__dirname, '..', 'volo')
});

//Tests
load('lib/volo/packageJson/tests.js');
load('lib/volo/version.js');
load('commands/create/tests.js');

//Print out test results
doh.run();
