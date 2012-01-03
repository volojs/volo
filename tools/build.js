({
    baseUrl: '../volo',
    paths: {
        'fs': 'empty:',
        'path': 'empty:',
        'url': 'empty:',
        'http': 'empty:',
        'https': 'empty:',
        'child_process': 'empty:'
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
        'help',
        'acquire',
        'rejuvenate',
        'create',
        'add',
        'amdify',

        //Leave this one last, see r.js issue #70
        'text'
    ],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../volo.js'
})