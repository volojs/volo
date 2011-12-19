/**
 * @license Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/pkg for details
 */

/*jslint nomen: false, evil: true */
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

function load(path) {
    var contents = fs.readFileSync(path, 'utf8');

    return requirejs.exec(contents, {
        doh: doh
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
    baseUrl: path.join(__dirname, '..', 'pkg')
});

//Tests
load('lib/pkg/packageJson/tests.js');

//Print out test results
doh.run();
