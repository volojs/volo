/*jslint nomen: false */
/*global require, doh, process, __dirname, console */
'use strict';

require(['q', 'volo/main'], function (q, main) {

    var d = q.defer(),
        fs = require('fs'),
        path = require('path'),
        file = require('volo/file'),
        cwd = process.cwd,
        expected = 1,
        actual = 0,
        testDir = path.join(__dirname, 'output');

    //Function used for test cleanup, test if expected number or tests
    //actually ran.
    function done(result) {
        process.chdir(cwd);

        actual += 1;
        doh.register("createExpected",
            [
                function createExpected(t) {
                    t.is(expected, actual);
                }
            ]
        );
        doh.run();

        d.resolve();
    }

    //Clean up old test output, create a fresh directory for it.
    q.call(function () {
        if (path.existsSync(testDir)) {
            return file.rmdir(testDir);
        }
        return undefined;
    })
    .then(function () {
        fs.mkdir(testDir);
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

    return d;
});

