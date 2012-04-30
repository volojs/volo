#!/usr/bin/env node

var fs = require('fs'),
    stamp = (new Date()).toUTCString(),
    exec = require('child_process').exec,
    distFileName = 'dist/volo',
    count = 0,
    contents;

exec('node tools/r.js -o tools/build.js',
    function (error, stdout, stderr) {
        if (error) {
            console.error('ERROR: ' + error);
        } else {

            fs.writeFileSync(distFileName, fs.readFileSync('volo', 'utf8'), 'utf8');

            contents = fs.readFileSync(distFileName, 'utf8')
                .replace(/\d\.\d\.\d(\+|[a-z]+)?/g, function (match) {
                    //Only do date insertion twice at the top of the file.
                    count += 1;
                    if (count < 3) {
                        return match + ' ' + stamp;
                    } else {
                        return match;
                    }
                }
            );

            fs.writeFile(distFileName, contents, 'utf8');
        }
    }
);
