## Usage

    volo.js add [flags] archive [localName]

where the allowed flags are:

* -f: Forces the add even if the code has already been added to the project.
* -amd: Indicates the project is an AMD project. If the project has a
  package.json entry for "amd": {} then this flag is not needed.

**archive** is in one of the following formats:

* user/repo: Download the tar.gz from GitHub for the user/repo, using the latest
  version tag, or "master" if no version tags.
* user/repo/tag: Download the tar.gz from GitHub for the user/repo, using the
  specific tag/branch name listed.
* user/repo/tag#specific/file.js: Download the tar.gz from GitHub for the user/
  repo, using the specific tag/branch name listed, then extracting only
  the specific/file.js from that archive and installing it.
* http://some.domain.com/path/to/archive.tar.gz: Downloads the tar.gz file and
  installs it.
* http://some.domain.com/path/to/archive.tar.gz#specific/file.js: Download
  the tar.gz file and only install specific/file.js.
* symlink:path/to/directory/or/file.js: Creates a symlink to the specific
  location in the project. If it is a directory and the project using the
  directory is an AMD project, an adapter module will also be created.

If **localName** is specified then that name is used for the installed name.
If the installed item is a directory, the directory will have this name. If
a specific file from the the archive, the file will have this name.

If **localName** is not specified, the installed directory name will be the
name of the .tar.gz file without the tar.gz extension, or if a GitHub
reference, the repo name. If it is a specific file from within a .tar.gz file,
then that file's name will be used.

## Installation Details

For the directory in which add is run, it will look for the following to know
where to install:

* Looks for a package.json file and if there is an amd.baseUrl defined in it.
* Looks for a **js** directory
* Looks for a **scripts** directory

If none of those result in a subdirectory for installation, then the current
working directory is used.

If the archive has a top level .js file in it and it is the same name
as the repo's/tar.gz file name, then only that .js file will be installed.

Or, if there is only one top level .js file in the repo and it has a
/*package.json */ comment with JSON inside that comment, it will be used.
