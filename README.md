# volo

A command line JavaScript tool for JavaScript-based projects. It likes
GitHub.

The basic tool is a generic command completion tool -- you can create new
commands for volo, and you can use commands others have created.

By default, volo knows how to:

* [create a new web project](https://github.com/volojs/volo/blob/master/volo/create/doc.md)
* [add scripts for a web project from the command line](https://github.com/volojs/volo/blob/master/volo/add/doc.md)
* [acquire new commands for volo.js](https://github.com/volojs/volo/blob/master/volo/acquire/doc.md)
* [update volo.js](https://github.com/volojs/volo/blob/master/volo/rejuvenate/doc.md)
* [convert some scripts to AMD format](https://github.com/volojs/volo/blob/master/volo/amdify/doc.md)

It is still very early in development. Lots may change and it has some sharp
corners, but it is already fun to use. It is just one file, so it is
easy to try out and discard.

### Prerequisites

* Node 0.6.5 or later installed.
* Probably does not work on Windows (needs tar and gzip). Want it to work on
Windows? Help out with [issue #1](https://github.com/volojs/volo/issues/1).

## Install

The latest release is 0.0.2, but you can use the **latest** tag to always get
the latest release:

    > curl https://raw.github.com/volojs/volo/latest/dist/volo.js > volo.js
    > chmod +x volo.js

If you like to live dangerously on the edge, use the master version:

https://raw.github.com/volojs/volo/master/dist/volo.js

It is best to put volo.js in your path, but *do not* install it as root.

Suggested path so that it is always available:

    > mkdir ~/scripts
    > cd ~/scripts
    > curl https://raw.github.com/volojs/volo/latest/dist/volo.js > volo.js
    > chmod +x volo.js

Then add **~/scripts** to your PATH in your .profile.

Since it is just a single JS file, you can have multiple copies laying around,
tailored to use specific commands for specific purposes.

## Usage

volo can use GitHub to retrieve code, so one of the core concepts when using
it is understanding **user/repo** for archive names. See the
[add doc](https://github.com/volojs/volo/blob/master/volo/add/doc.md) for more
info on the types of archive names to use.

To set up an AMD/RequireJS-based project called **fast** that uses AMD versions of
Backbone, jQuery and underscore:

    > volo.js create fast
    > cd fast
    > volo.js add jquery/jquery
    > volo.js add amdjs/underscore/master
    > volo.js add amdjs/backbone/master

Then modify www/js/app.js to require the modules you need and add your app logic.

If you prefer to use underscore and backbone from their sources, instead of
using the amdjs forks that include nice AMD registration, you can use amdify
to convert the files fetched from the documentcloud repos:

    > volo.js create fast2
    > cd fast2
    > volo.js add jquery/jquery
    > volo.js add -amd documentcloud/underscore exports=_
    > volo.js add -amd documentcloud/backbone depend=underscore,jquery exports=Backbone

The amdify conversions are not as pretty as the amdjs handmade ones. However,
it can be useful to use the documentcloud sources particularly if you want to
use older releases of underscore and backbone.

If you would prefer to have the documentcloud repos include native AMD registration,
click the **Watch** button for the amdjs forks of [underscore](https://github.com/amdjs/underscore)
and [backbone](https://github.com/amdjs/backbone), so we can help give the
documentcloud group real data on how many people find would find it useful.

To set up an HTML5 Boilerplate project that does not use AMD/RequireJS, but does
use Backbone and underscore (the Boilerplate already has jQuery):

    > volo.js create html5fast h5bp/html5-boilerplate
    > cd html5fast
    > volo.js add documentcloud/underscore
    > volo.js add documentcloud/backbone

## Details

* [Design goals](https://github.com/volojs/volo/blob/master/docs/designGoals.md)
* [Create a volo command](https://github.com/volojs/volo/blob/master/docs/createCommand.md)
* License: [MIT and new BSD](https://github.com/volojs/volo/blob/master/LICENSE)

## Engage

* [Discussion list](http://groups.google.com/group/volojs)
* [File an issue](https://github.com/volojs/volo/issues)
* [Working with the volo code](https://github.com/volojs/volo/blob/master/docs/workingWithCode.md)
