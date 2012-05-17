/*jslint node: true */
/*global doh, voloLib */
'use strict';

var q = require('q'),
    main = require(voloLib + '/../volo'),
    start = q.defer(),
    fs = require('fs'),
    path = require('path'),
    tempDir = require(voloLib + '/volo/tempDir'),
    venv = require(voloLib + '/volo/v'),
    file = require(voloLib + '/volo/file'),
    cwd = process.cwd(),
    dir = __dirname,
    end, v, tempDir;

//Clean up old test output, create a fresh directory for it.
end = start.promise.then(function () {
    return tempDir.create('volo-full-output');
})
.then(function (dir) {
    tempDir = dir;
    v = venv(tempDir).env;
    process.chdir(tempDir);
})


//Do a simple create and run a volo command that uses a volo submodule.
.then(function () {
    return v.sequence([
        ['volo', 'create', 'simple', path.join(dir, 'support', 'simple')],
        [process, 'chdir', 'simple'],
        ['volo', 'foo']
        //['node', '/Users/jr/git/volo/volo.js', 'foo']
    ],{ useConsole: true });
})
.then(function () {
    doh.register("fullSimple",
        [
            function fullSimple(t) {
                var comparePath = path.join('compareType.txt');
                t.is(true, path.existsSync(comparePath));
                t.is('function', fs.readFileSync(comparePath, 'utf8'));
            }
        ]
    );
    doh.run();

    process.chdir('..');
})


.then(function () {
    process.chdir(cwd);

    file.rm(tempDir);
});

module.exports = {
    start: start,
    end: end
};
