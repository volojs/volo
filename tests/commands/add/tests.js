/*jslint node: true */
/*global doh, voloLib */
'use strict';

var q = require('q'),
    main = require(voloLib + '/../volo'),
    start = q.defer(),
    fs = require('fs'),
    path = require('path'),
    file = require(voloLib + '/file'),
    cwd = process.cwd(),
    dir = __dirname,
    testDir = path.join(dir, 'output'),
    end;

//Clean up old test output, create a fresh directory for it.
end = start.promise.then(function () {
    file.rm(testDir);
    fs.mkdirSync(testDir);
    process.chdir(testDir);
})
/*
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
*/
.then(function () {
    return main(['add', '-noprompt', '../support/addable'], function (result) {
        console.log(result);
        doh.register("addOnAdd",
            [
                function addOnAdd(t) {
                    var expected = fs.readFileSync('../support/addable/temp/a.js', 'utf8'),
                        output = fs.readFileSync('addable/a.js', 'utf8');

                    t.is(false, path.existsSync('addable/temp'));
                    t.is(expected, output);
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
debugger;
    //Test using volojs/repos-provided package.json override.
    return main(['add', 'three.js'], function (result) {
debugger;
        console.log(result);
        doh.register("addRepoPackageJsonOverride",
            [
                function addOnAdd(t) {
                    t.is(true, path.existsSync('three.js'));
                }
            ]
        );
        doh.run();
    });
})
.then(function () {
    return main(['create', 'voloBaseUrl', '../support/voloBaseUrl'], function (result) {
        console.log(result);
        doh.register("voloBaseUrl",
            [
                function voloBaseUrl(t) {
                    var expected = fs.readFileSync('../support/simple/simple.js', 'utf8'),
                        output = fs.readFileSync('voloBaseUrl/funkyBaseUrl/simple.js', 'utf8');

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
