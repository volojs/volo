/*jslint node: true */
/*global doh, voloLib */

'use strict';

var q = require('q'),
    main = require(voloLib + '/../volo'),
    start = q.defer(),
    fs = require('fs'),
    path = require('path'),
    file = require(voloLib + '/volo/file'),
    amdifyConvert = require(voloLib + '/amdify').api.convert,
    cwd = process.cwd(),
    dir = __dirname,
    supportDir = path.join(dir, 'support'),
    testDir = path.join(dir, 'output'),
    end;

//Clean up old test output, create a fresh directory for it.
end = start.promise.then(function () {
    return file.rm(testDir);
})
.then(function () {
    file.copyDir(supportDir, testDir);
    process.chdir(testDir);
})
.then(function () {
    return main(['amdify', '-noprompt', 'plain.js'], function (result) {
        console.log(result);
        doh.register("amdifyPlain",
            [
                function amdifyPlain(t) {
                    var output = fs.readFileSync('plain.js', 'utf8'),
                        expected = fs.readFileSync('../expected/plain.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['amdify', 'plainExports.js', 'exports=baz'], function (result) {
        console.log(result);
        doh.register("amdifyPlainExports",
            [
                function amdifyPlainExports(t) {
                    var output = fs.readFileSync('plainExports.js', 'utf8'),
                        expected = fs.readFileSync('../expected/plainExports.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['amdify', 'lib.js', 'depends=alpha,beta'], function (result) {
        console.log(result);
        doh.register("amdifyLib",
            [
                function amdifyLib(t) {
                    var output = fs.readFileSync('lib.js', 'utf8'),
                        expected = fs.readFileSync('../expected/lib.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['amdify', 'varnames.js', 'depends=jquery=$,underscore='], function (result) {
        console.log(result);
        doh.register("amdifyVarnames",
            [
                function amdifyLib(t) {
                    var output = fs.readFileSync('varnames.js', 'utf8'),
                        expected = fs.readFileSync('../expected/varnames.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['amdify', '-noConflict', 'libExports.js', 'depends=gamma', 'exports=window.libExports'], function (result) {
        console.log(result);
        doh.register("amdifyLibExports",
            [
                function amdifyLibExports(t) {
                    var output = fs.readFileSync('libExports.js', 'utf8'),
                        expected = fs.readFileSync('../expected/libExports.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return amdifyConvert('thisExports.js', null, null, null, {
        commonJs: true
    }).then(function (result) {
        console.log(result);
        doh.register("thisExports",
            [
                function thisExports(t) {
                    var output = fs.readFileSync('thisExports.js', 'utf8'),
                        expected = fs.readFileSync('../expected/thisExports.js', 'utf8');

                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function (result) {
    process.chdir(cwd);
});

module.exports = {
    start: start,
    end: end
};
