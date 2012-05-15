/*jslint nomen: false */
/*global define, doh, process, console */

define(function (require, exports, module) {
    'use strict';

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
        return file.rm(testDir);
    })
    .then(function () {
        fs.mkdirSync(testDir);
        process.chdir(testDir);
    })

    //Test basic volofile usage
    .then(function () {
        return main(['create', 'simple', '../support/simple']);
    })
    .then(function () {
        process.chdir('simple');

        return main(['foo', 'style=galactic', 'future=backlit'],
            function (result) {
            console.log(result);
            doh.register("volofileSimple",
                [
                    function volofileSimple(t) {
                        var universalPath = path.join('universal.txt');
                        t.is(true, path.existsSync(universalPath));
                        t.is('galacticModified is backlit', fs.readFileSync(universalPath, 'utf8'));
                    }
                ]
            );
            doh.run();
        });
    })
    .then(function (result) {
        process.chdir('..');
    })

    //Test usage of "depends" in volofile commands
    .then(function () {
        return main(['create', 'depends', '../support/depends']);
    })
    .then(function () {
        process.chdir('depends');

        return main(['four', 'name=depends', 'testcall'],
            function (result) {
            console.log(result);
            doh.register("volofileDepends",
                [
                    function volofileDepends(t) {
                        t.is(fs.readFileSync('../../expected/depends/depends.txt', 'utf8'),
                             fs.readFileSync('depends.txt', 'utf8'));
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
