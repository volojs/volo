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
        process.chdir(cwd);
    });

    return {
        start: start,
        end: end
    };
});
