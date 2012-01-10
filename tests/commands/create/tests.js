/*jslint nomen: false */
/*global define, doh, process, console */
'use strict';

define(function (require, exports, module) {

    var q = require('q'),
        main = require('volo/main'),
        d = q.defer(),
        fs = require('fs'),
        path = require('path'),
        file = require('volo/file'),
        cwd = process.cwd(),
        expected = 1,
        actual = 0,
        dir = path.dirname(module.uri),
        testDir = path.join(dir, 'output');

    //Function used for test cleanup, test if expected number or tests
    //actually ran.
    function done(result) {
        process.chdir(cwd);

        doh.register("createExpected",
            [
                function createExpected(t) {

                    if (!(result instanceof Error)) {
                        actual += 1;
                    }

                    t.is(expected, actual);
                    d.resolve(result);
                }
            ]
        );
        doh.run();
    }

    //Clean up old test output, create a fresh directory for it.
    q.call(function () {
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
        return main(['create', 'output', '../support/simple'], function (result) {
            console.log(result);
            doh.register("createSimple",
                [
                    function createSimple(t) {
                        t.is(true, path.existsSync(path.join('output', 'simple.js')));
                    }
                ]
            );
            doh.run();
        });
    })
    /*
    .then(function () {

    })
    */
    .then(done, done);

    return d.promise;
});

