/*jslint node: true, nomen: true */
/*global doh, voloLib */
'use strict';

var q = require('q'),
    main = require(voloLib + '/../volo'),
    start = q.defer(),
    fs = require('fs'),
    path = require('path'),
    file = require(voloLib + '/file'),
    packageJson = require(voloLib + '/packageJson'),
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

//Set up test area first
.then(function () {
    return main(['add', '../../add/support/localModules/a']);
})
.then(function () {
    return main(['add', '../../add/support/addable']);
})
.then(function () {
    return main(['remove', 'a']);
})
.then(function () {
    return main(['remove', 'addable']);
})
.then(function () {
    var pkg = packageJson('.');

    doh.register("remove",
        [
            function remove(t) {
                t.is(false, !!pkg.data.volo.dependencies.addable);
                t.is(false, !!pkg.data.volo.dependencies.a);

                t.is(false, file.exists('addable'));
                t.is(false, file.exists('addable.js'));
                t.is(false, file.exists('a.js'));

            }
        ]
    );
    doh.run();
})

.then(function () {
    process.chdir(cwd);
});

module.exports = {
    start: start,
    end: end
};