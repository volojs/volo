/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true esnext: true
         browser: true forin: false latedef: false */
/*global define: true */

!(function() {

"use strict";

function Jetpack(require, exports) {
  var timers = require('addon-kit/timers')
  exports.setTimeout = timers.setTimeout
  exports.setInterval = timers.setInterval
  exports.clearTimeout = timers.clearTimeout
  exports.clearInterval = timers.clearInterval
  exports.enqueue = function enqueue(task) { timers.setTimeout(task, 0) }
}

function NodeJS(require, exports) {
  exports.setTimeout = setTimeout
  exports.setInterval = setInterval
  exports.clearTimeout = clearTimeout
  exports.clearInterval = clearTimeout
  exports.enqueue = process.nextTick
}

function Worker(require, exports) {
  exports.setTimeout = setTimeout
  exports.setInterval = setInterval
  exports.clearTimeout = clearTimeout
  exports.clearInterval = clearInterval
  exports.enqueue = function enqueue(tasks) { setTimeout(tasks, 0) }
}

function Browser(require, exports) {
  // In IE 8 (at least) `postMessage` is synchronous so we
  // assume that `postMessage` is async only if `addEventListener` is defined.
  var isPostMessageAsync = 'addEventListener' in window
  // Array of pending tasks
  var tasks = []
  // Special data we post using `postMessage` to identify our calls.
  var KEY = 'event-queque:run:' + Math.round(Math.random() * 100000000000000000)

  // If asynchronous `postMessage` is supported we use that for enqueuing
  // messages instead of `setTimeout(f, 0)`, since it will be called in the next
  // turn of event loop without extra delay.
  isPostMessageAsync && window.addEventListener('message', function onTurn(e) {
    if (window == e.source && KEY == e.data) {
      run()
      e.stopPropagation()
    }
  }, true)

  // Function processes all the tasks that are in the queue.
  function run() {
    // We copy all the pending tasks before processing them,
    // since we want to bu sure that tasks added in this run
    // won't be processed.
    var task, pending = tasks.splice(0, tasks.length)
    while ((task = pending.shift()))
      // We catch `exceptions` that `task`'s may throw, since we don't want
      // to break the loop.
      try { task() } catch (exceptions) { console.error(exceptions) }
  }

  exports.setTimeout = window.setTimeout
  exports.setInterval = window.setInterval
  exports.clearTimeout = window.clearTimeout
  exports.clearInterval = window.clearTimeout
  // Runs task in the next turn of event-loop. This
  // On the next loop around the event loop call this task. This is not a simple
  // alias to `setTimeout(task, 0)`, it's much more efficient, but should not be
  // over used (for animations for example).
  exports.enqueue = function enqueue(task) {
    // Adding a task to process in next turn of event loop.
    tasks.push(task)
    // Using `postMessage` to run enqueued tasks in next turn of event-loop.
    if (isPostMessageAsync) window.postMessage(KEY, '*')
    // If async `postMessage` is not available falling back to `setTimeout(f, 0)`
    else exports.setTimeout(run, 0)
  }
}

var Module = typeof(process) === 'object' && process.nextTick ? NodeJS :
             typeof(window) === 'object' ? Browser :
             typeof(setTimeout) === 'function' ? Worker :
             Jetpack

!(typeof(define) !== "function" ? function($){ $(typeof(require) !== 'function' ? (function() { throw Error('require unsupported'); }) : require, typeof(exports) === 'undefined' ? this : exports); } : define)(function(require, exports) {

"use strict";

Module(require, exports)

});

})();
