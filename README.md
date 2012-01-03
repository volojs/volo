# volo

This is a JavaScript tool that workson the command line to set up
JavaScript-based projects.

The basic tool is a generic command completion tool -- you can create new
commands that volo can run, and you can use commands others have created.

By default, volo knows how to create a new web project that uses
RequireJS and knows how to convert some scripts to an AMD format. volo can
install script dependencies from the command line.

volo.js can download scripts from github or an URL as part of the project setup,
so it can be extended to run any sort of JavaScript-based action that can run
in node

### Prerequisites

* Node 0.6.5 or later installed.
* Probably does not work on Windows (needs tar and gzip). Want it to work on
Windows? Help out with [issue #1](https://github.com/volojs/volo/issues/1).


## Install

* curl https://raw.github.com/volojs/volo/master/dist/volo.js > volo.js
* chmod +x volo.js

It is best to put volo.js in your path, but *do not* install it as root.

Suggested path:

* cd ~
* mkdir ~/scripts
* cd ~/scripts
* curl https://raw.github.com/volojs/volo/master/dist/volo.js > volo.js
* chmod +x volo.js

Since it is just a single JS file, you can have multiple copies laying around,
tailored to use specific commands for specific purposes.

## Usage



Projects conform to this layout:
xxxx

* volo.js create appName
    * Generates dir structure, stub an application-level package.json file.
    * puts in require.js and sets up a build profile for deployment.
* volo.js add packageName version (or an URL)


## What does volo.js do?

TODO: explain the steps that volo.js does under the covers.
