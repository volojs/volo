## Usage

    volo add [flags] [archive] [localName]

where the allowed flags are:

* -f: Forces the add even if the code has already been added to the project.
* -amd: Indicates the project is an AMD project. If the project has a
  package.json entry for "amd": {} then this flag is not needed.
* -amdoff: Turns off AMD conversion for when the project is AMD and the
  dependency being added is not AMD/CommonJS. Only needs to be set if the
  project's package.json has an "amd": {} entry.
* -amdlog: Prints out more details on files converted to AMD, if AMD conversion
  is done.
* -noprompt: Does not prompt the user for any dependency/exports details when
  adding a non-AMD/non-CommonJS module to an AMD project.
* -nostamp: Does not stamp the package.json in the directory that runs this
  command with the added dependency information.
* -skipexists: If a dependency by that name already exists, just skip it without
  informing it already exists.

**archive** is in one of the following formats:

* searchterm: GitHub search is used to resolve searchterm to a user/repo value.
* searchterm/version: GitHub search is used to resolve searchterm to a user/repo
  value, then version is added to it. version can be a semantic version range.
* user/repo: Download the zip file from GitHub for the user/repo, using the
  latest version tag, or "master" if no version tags.
* user/repo/tag: Download the zip file from GitHub for the user/repo, using the
  specific tag/branch name listed.
* user/repo/semverVersion: Download the zip file from GitHub for the user/repo,
  using the specified semantic version range. Example ranges: '~1.2', '>1.6.4'.
* user/repo/tag#specific/file.js: Download zip file from GitHub for the user/
  repo, using the specific tag/branch name listed, then extracting only
  the specific/file.js file from that archive and installing it.
* user/repo/tag#specific/dir: Download zip file from GitHub for the user/
  repo, using the specific tag/branch name listed, then extracting only
  the specific/dir directory from that archive and installing it.
* http://some.domain.com/path/to/archive.zip: Downloads the zip file and
  installs it.
* http://some.domain.com/path/to/archive.zip#specific/file.js: Download
  the zip file and only install specific/file.js.
* symlink:path/to/directory/or/file.js: Creates a symlink to the specific
  location in the project. If it is a directory and the project using the
  directory is an AMD project, an adapter module will also be created.
* local:path/to/directory: Copies the local directory. A local directory is
  also checked when the "some/thing" archive name is used -- if there is no
  local file match, it is assumed to be a GitHub URL.

If **archive is missing from the command**, then if a package.json in the
current directory contains a **volo.dependencies** section, it will go through
those dependencies and add all of them.

If **localName** is specified then that name is used for the installed name.
If the installed item is a directory, the directory will have this name. If
a specific file from the the archive, the file will have this name.

If **localName** is not specified, the installed directory name will be the
name of the .zip file without the zip extension, or if a GitHub
reference, the repo name. If it is a specific file from within a zip file,
then that file's name will be used.

## Examples

This one fetches Underscore and converts it to have an AMD wrapper. Underscore
still registers a global export, but AMD code can get a local reference
through the module ID:

    volo add -amd documentcloud/underscore exports=_

When the -amd flag is used, the the **amdify** command is used to convert
the file downloaded by the **add** command, so the named arguments supported
by **amdify** can also be used with **add**.

Here is a command that fetches Backbone and wraps in it in an AMD define() call,
specifying 'jquery' and 'underscore' as dependencies:

    volo add -amd documentcloud/backbone depends=underscore,jquery exports=Backbone


## Installation Details

For the directory in which add is run, it will look for the following to know
where to install:

* Looks for a volo.baseDir package.json property.
* Looks for a volo.baseUrl package.json property. (legacy property)
* Looks for a amd.baseUrl package.json property (legacy property)
* Looks for a **js** directory
* Looks for a **scripts** directory

If none of those result in a subdirectory for installation, then the current
working directory is used.

If the archive has a top level .js file in it and it is the same name
as the repo's/zip file name, then only that .js file will be installed.

Or, if there is only one top level .js file in the repo and it has a
/*package.json */ comment with JSON inside that comment, it will be used.

## Remembering the details

Once the dependency has been added, `volo add` will stamp a package.json
file with the archive name used to add the dependency. If there is no
package.json file in the current directory, it will create one.
