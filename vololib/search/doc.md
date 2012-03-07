## Usage

    volo search query

where query is a string used for the search. The query can have a scheme on it,
to specify what type of search module to use. For example:

    volo search foo:bar

uses the foo search module to get search results on 'bar'.

The default query scheme is 'github', so to search for the right repo to use
for installing 'jquery':

    volo search jquery

