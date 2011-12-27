# volo

This is a JavaScript tool to set up JavaScript-based projects.

The basic tool is a generic task completion tool -- you can create new
tasks that volo can run, and you can use tasks others have created.

By default though, volo knows how to create a new web project that uses
RequireJS and knows how to convert some scripts to an AMD format. volo can
install script dependencies from the command line.

volo.js can download scripts from github or an URL as part of the project setup.

## Usage

TODO

### Prerequisites

* Node 0.6.0 or later installed.
* Probably does not work on Windows (needs tar and gzip)


TODO: explain how to use it.

Projects conform to this layout:
xxxx

* volo.js create appName
    * Generates dir structure, stub an application-level package.json file.
    * puts in require.js and sets up a build profile for deployment.
* volo.js add packageName version (or an URL)


## What does volo.js do?

TODO: explain the steps that volo.js does under the covers.
