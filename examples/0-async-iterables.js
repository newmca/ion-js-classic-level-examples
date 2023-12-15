/**
 * This example is just an intro to JS iterables
 */
const letters = ['a', 'b', 'c']
const delay = (value) => new Promise((resolve) => setTimeout(resolve, 1000, value))

function* letterGenerator() {
  yield 'A'
  yield 'B'
  yield 'C'
}

async function* asyncGenerator() {
  yield* letters
  console.log('Hello', await delay('World!'))
  yield* letterGenerator()
}

//******************************************************************************
function syncIterable(iterable) {
  const it = iterable[Symbol.iterator]()

  let iteration = it.next()

  while (!iteration.done) {
    console.log(iteration.value)
    iteration = it.next()
  }

  console.log(it.next())
}

console.log(`\n***** Synchronous Iteration *****`)
syncIterable(letters)
syncIterable(letterGenerator())

//******************************************************************************
console.log(`\n***** Synchronous to Asynchronous Iteration *****`)
// An async function is turned into an async generator by adding the * infront of it.
async function* asyncIterable(iterable) {
  for (const elem of iterable) yield elem
}

for await (const item of asyncIterable(letters)) {
  console.log(item)
}
console.log('-'.repeat(50))
for await (const item of asyncGenerator()) {
  console.log(item)
}
