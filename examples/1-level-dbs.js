import ion from 'ion-js'
import {ClassicLevel} from 'classic-level'

const db = new ClassicLevel(`./db`, {keyEncoding: 'json', valueEncoding: 'view'})

const items = [
  {PK: 'pk1', SK: 'a', ENTITYTYPE: 'account'},
  {PK: 'pk2', SK: 'b', ENTITYTYPE: 'user'},
  {PK: 'pk3', SK: 'c', ENTITYTYPE: 'user'},
  {PK: 'pk4', SK: 'd', ENTITYTYPE: 'account'},
  {PK: 'pk5', SK: 'e', ENTITYTYPE: 'account'},
]

async function createTable(db, items) {
  let count = 0
  for (const item of items) {
    const writer = ion.makeBinaryWriter()
    const reader = ion.makeReader(JSON.stringify(item))
    writer.writeValues(reader)
    writer.close()
    const bytes = writer.getBytes()
    const key = {
      PK: item.PK,
      SK: item.SK,
    }
    await db.put(key, bytes)
    console.log(`Created ${++count} items.`)
  }
}

async function iterateKeys(db) {
  console.log('ITERATE KEYS:')
  for await (const key of db.keys()) {
    console.log(key)
  }
}

async function iterateValues(db) {
  console.log('ITERATE VALUES:')
  for await (const value of db.values()) {
    const item = ion.load(value)
    console.log(item.PK.stringValue())
  }
}

console.hr = () => console.log('='.repeat(50))
async function iterateKeyValues(db) {
  console.log('ITERATE KEY VALUES:')
  for await (const [key, value] of db.iterator()) {
    const item = ion.load(value)
    console.log('KEY', key) // JavaScript Object
    console.log('ITEM', item) // Amazon Ion Struct
    console.hr()
  }
}

await createTable(db, items)
await iterateKeys(db)
await iterateValues(db)
await iterateKeyValues(db)
