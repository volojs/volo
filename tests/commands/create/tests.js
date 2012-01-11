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
        return main(['create', 'simple', '../support/simple'], function (result) {
            console.log(result);
            doh.register("createSimple",
                [
                    function createSimple(t) {
                        t.is(true, path.existsSync(path.join('simple', 'simple.js')));
                    }
                ]
            );
            doh.run();
        });
    })
    .then(function () {
        return main(['create', 'dude', '../support/hasOnCreate', 'name=fred', 'code=blue'],
            function (result) {
            console.log(result);
            doh.register("createHasOnCreate",
                [
                    function createHasOnCreate(t) {
                        var outputPath = path.join('dude', 'output.txt');
                        t.is(true, path.existsSync(outputPath));
                        t.is(false, path.existsSync(path.join('dude', 'volofile')));
                        t.is(false, path.existsSync(path.join('dude', 'sample.template')));
                        t.is('Hello fred. Your code is blue', fs.readFileSync(outputPath, 'utf8'));
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

