# volo

A command line JavaScript tool to set up JavaScript-based projects.

The basic tool is a generic command completion tool -- you can create new
commands that volo can run, and you can use commands others have created.

By default, volo knows how to create a new web project that uses
RequireJS and knows how to convert some scripts to an AMD format. volo can
install script dependencies from the command line.

volo.js can download scripts from GitHub or an URL as part of the project setup,
so it can be extended to run any sort of JavaScript-based action that can run
in node

It is still very early in development. Lots may change and it has some sharp
corners, but it is already fun to use. It is just one file, so it is
easy to try out and discard.

### Prerequisites

* Node 0.6.5 or later installed.
* Probably does not work on Windows (needs tar and gzip). Want it to work on
Windows? Help out with [issue #1](https://github.com/volojs/volo/issues/1).

## Install

    > curl https://raw.github.com/volojs/volo/master/dist/volo.js > volo.js
    > chmod +x volo.js

It is best to put volo.js in your path, but *do not* install it as root.

Suggested path so that it is always available:

    > mkdir ~/scripts
    > cd ~/scripts
    > curl https://raw.github.com/volojs/volo/master/dist/volo.js > volo.js
    > chmod +x volo.js

Then add **~/scripts** to your PATH in your .profile.

Since it is just a single JS file, you can have multiple copies laying around,
tailored to use specific commands for specific purposes.

## Usage

volo.js can use GitHub to retrieve code, so one of the core concepts when using
it is understanding **user/repo** for archive names. See the
[add doc](https://github.com/volojs/volo/blob/master/volo/add/doc.md) for more
info on the types of archive names to use.

Set up an AMD/RequireJS-based project called **fast** that uses AMD versions of
Backbone, jQuery and underscore:

    > volo.js create fast
    > cd fast
    > volo.js add jquery/jquery
    > volo.js add documentcloud/underscore
    > volo.js add jrburke/backbone/optamd3

Set up an HTML5 Boilerplate project that does not use AMD/RequireJS, but does
use Backbone, jQuery and underscore:

    > volo.js create html5fast h5bp/html5-boilerplate
    > cd html5fast
    > volo.js add jquery/jquery
    > volo.js add documentcloud/underscore
    > volo.js add documentcloud/backbone

## Details

* Design goals
* Create a volo command
* License: [MIT and new BSD](https://github.com/volojs/volo/blob/master/LICENSE)

## Engage

* [Discussion list](http://groups.google.com/group/volojs)
* [File an issue](https://github.com/volojs/volo/issues)
* [Working with the volo code]()
