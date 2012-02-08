define(function (require, exports, module) {
module.exports = GlobalHeaderWriter

var ExtendedHeaderWriter = require('./extended-header-writer')
  , inherits = require('../node_modules/inherits')

inherits(GlobalHeaderWriter, ExtendedHeaderWriter)

function GlobalHeaderWriter (props) {
  if (!(this instanceof GlobalHeaderWriter)) {
    return new GlobalHeaderWriter(props)
  }
  ExtendedHeaderWriter.call(this, props)
  this.props.type = "g"
}

});