({
    baseUrl: '../vololib',
    paths: {
        'assert': 'empty:',
        'buffer': 'empty:',
        'child_process': 'empty:',
        'constants': 'empty:',
        'fs': 'empty:',
        'http': 'empty:',
        'https': 'empty:',
        'path': 'empty:',
        'readline': 'empty:',
        'stream': 'empty:',
        'url': 'empty:',
        'zlib': 'empty:'
    },
    name: '../tools/require',
    optimize: 'none',
    //tools/node.js comes from r.js/build/jslib/node.js
    include: [
        '../tools/requirejsVars',
        '../tools/node',
        'volo/main',
        'volo/github',
        'volo/resolve/github',
        'volo/search/github',
        'volo/template',
        'help',
        'acquire',
        'rejuvenate',
        'create',
        'add',
        'amdify',
        'search',
        'npmrel',

        //Leave this one last, see r.js issue #70
        'text'
    ],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../volo'
})