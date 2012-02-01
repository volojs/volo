/*jslint nomen: false */
/*global define, doh, process, console */
'use strict';

define(function (require, exports, module) {

    var q = require('q'),
        main = require('volo/main'),
        start = q.defer(),
        fs = require('fs'),
        path = require('path'),
        file = require('volo/file'),
        cwd = process.cwd(),
        dir = path.dirname(module.uri),
        testDir = path.join(dir, 'output'),
        end;

    //Clean up old test output, create a fresh directory for it.
    end = start.promise.then(function () {
        if (path.existsSync(testDir)) {
            return file.rmdir(testDir);
        }
        return undefined;
    })
    .then(function () {
        fs.mkdirSync(testDir);
        process.chdir(testDir);
    })
    .then(function () {
        return main(['add', '../support/simple'], function (result) {
            console.log(result);
            doh.register("addSimple",
                [
                    function addSimple(t) {
                        var expected = fs.readFileSync('../support/simple/simple.js', 'utf8'),
                            output = fs.readFileSync('simple.js', 'utf8');

                        t.is(true, path.existsSync('simple.js'));
                        t.is(expected, output);
                    }
                ]
            );
            doh.run();
        });
    })
    .then(function () {
        return main(['add', '-amd', '../support/simple', 'simpleAmd', 'depends=foo'], function (result) {
            console.log(result);
            doh.register("addSimpleAmd",
                [
                    function addSimpleAmd(t) {
                        var expected = fs.readFileSync('../expected/simpleAmd.js', 'utf8'),
                            output = fs.readFileSync('simpleAmd.js', 'utf8');

                        t.is(true, path.existsSync('simpleAmd.js'));
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

    return {
        start: start,
        end: end
    };
});
