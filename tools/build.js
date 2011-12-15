({
    baseUrl: '../pkg',
    name: '../tools/require',
    optimize: 'none',
    //tools/node.js comes from r.js/build/jslib/node.js
    include: ['../tools/requirejsVars', '../tools/node', 'main'],
    wrap: {
        startFile: "wrap.start",
        endFile: "wrap.end"
    },
    out: '../pkg.js'
})