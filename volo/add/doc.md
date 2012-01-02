## Usage

    volo.js add [flags] archive [localName]

where the allowed flags are:

* -f: Forces the add even if the code has already been added to the project.

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

If **localName** is specified then that name is used for the installed name.
If the installed item is a directory, the directory will have this name. If
a specific file from the the archive, the file will have this name.

If **localName** is not specified, the installed directory name will be the
name of the .tar.gz file without the tar.gz extension, or if a GitHub
reference, the repo name. If it is a specific file from within a .tar.gz file,
then that file's name will be used.

## Specifics of installation.

Mention amd.baseUrl, js/ scripts/ current directory.

