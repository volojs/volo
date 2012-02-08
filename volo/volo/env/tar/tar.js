define(function (require, exports, module) {

var common = require('./lib/common')

Object.keys(common).forEach(function (key) {
  exports[key] = common[key]
})

exports.Pack = require('./lib/pack')
exports.Parse = require('./lib/parse')
exports.Extract = require('./lib/extract')

});