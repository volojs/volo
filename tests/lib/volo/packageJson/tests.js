
/*jslint node: true */
/*global doh, voloLib */
'use strict';

var packageJson = require(voloLib + '/volo/packageJson'),
    path = require('path'),
    q = require('q'),
    file = require(voloLib + '/volo/file'),
    start = q.defer(),
    cwd = process.cwd(),
    dir = __dirname,
    expectedDir = path.join(dir, 'expected'),
    outputDir = path.join(dir, 'output'),
    supportDir = path.join(dir, 'support'),
    end;

end = start.promise.then(function () {
    doh.register("packageJsonTests",
        [
            function packageJsonTests(t) {
                var dirs = [
                       'hasFile',
                       'hasJs',
                       'hasJsNoComment',
                       'hasJsonFile',
                       'tooManyJs'
                    ],
                    result;

                file.rm(outputDir);
                file.mkdirs(outputDir);

                //Copy the support directories into output, to allow
                //modification of the files.
                dirs.forEach(function (dir) {
                    file.copyDir(path.join(supportDir, dir),
                                 path.join(outputDir, dir));
                });

                process.chdir(dir);

                //Test favoring a single js file package.json comment
                //over a package.json file.

                result = packageJson(path.join(outputDir, 'hasFile'));
                t.is('empty', result.data.name);
                t.is('1.0', result.data.version);

                //Add a volo dep to the package.son, save, confirm the save.
                result.addVoloDep('dojo', 'dojo/dojo/1.7.2');
                result.save();
                result.refresh();
                t.is('dojo/dojo/1.7.2', result.data.volo.dependencies.dojo);
                t.is(file.readFile(path.join(expectedDir, 'hasFile', 'empty.js')),
                     file.readFile(path.join(outputDir, 'hasFile', 'empty.js')));

                result = packageJson(path.join(outputDir, 'hasJsonFile'));
                t.is('hasJsonFile', result.data.name);
                t.is('2.0', result.data.version);

                //Add a volo dep to the package.son, save, confirm the save.
                result.addVoloDep('dijit', 'dojo/dijit/1.7.2');
                result.save();
                result.refresh();
                t.is('dojo/dijit/1.7.2', result.data.volo.dependencies.dijit);
                t.is(file.readFile(path.join(expectedDir, 'hasJsonFile', 'package.json')),
                     file.readFile(path.join(outputDir, 'hasJsonFile', 'package.json')));

                //Test file comment
                result = packageJson(path.join(outputDir, 'hasJs'));
                t.is('lib', result.data.name);
                t.is('1.0', result.data.version);

                //Add a volo dep to the package.json, save, confirm the save.
                result.addVoloDep('jquery', 'jquery/jquery/1.7.1');
                result.save();
                result.refresh();
                t.is('jquery/jquery/1.7.1', result.data.volo.dependencies.jquery);
                t.is(file.readFile(path.join(expectedDir, 'hasJs', 'lib.js')),
                     file.readFile(path.join(outputDir, 'hasJs', 'lib.js')));

                //Test file, but no comment or package.json
                result = packageJson(path.join(outputDir, 'hasJsNoComment'));
                t.is(null, result.data);
                t.is(path.join(outputDir, 'hasJsNoComment', 'lib.js'), result.file);

                //Test no package.json and too many .js files
                result = packageJson(path.join(outputDir, 'tooManyJs'));
                t.is(null, result.data);
                t.is(null, result.file);
            }
        ]
    );
    doh.run();
}).then(function () {
    process.chdir(cwd);
});

module.exports = {
    start: start,
    end: end
};
