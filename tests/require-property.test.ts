const assert = require('node:assert/strict')

const { requireProperty } = require('../lib/require-property')

const property = { _id: 'property-1' }
let presentMissingCalls = 0
const presentResult = requireProperty(property, () => {
  presentMissingCalls += 1
  throw new Error('unexpected missing property')
})

assert.equal(presentResult, property)
assert.equal(presentMissingCalls, 0)
console.log('requireProperty returns a present property: OK')

const sentinel = new Error('NEXT_NOT_FOUND')
let missingCalls = 0
assert.throws(
  () =>
    requireProperty(null, () => {
      missingCalls += 1
      throw sentinel
    }),
  (error: unknown) => error === sentinel
)
assert.equal(missingCalls, 1)
console.log('requireProperty delegates a missing property exactly once: OK')

console.log('\nAll require-property tests passed.')
