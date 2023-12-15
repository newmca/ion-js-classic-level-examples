import ion from 'ion-js'
import {ClassicLevel} from 'classic-level'
const db = new ClassicLevel(`./db`, {keyEncoding: 'json', valueEncoding: 'view'})

async function deleteUsers(db) {
  console.log('DELETE USERS:')
  for await (const [key, value] of db.iterator()) {
    const entityType = getEntityType(value)
    if (entityType === 'user') {
      db.del(key, value)
      const {PK: oldPK, SK} = key
      const PK = `${oldPK}_deleted`
      db.put({PK, SK}, value)
    }
  }
}

function getEntityType(value) {
  const item = ion.load(value)
  const isMissing = item.get('ENTITYTYPE') === null
  const entityType = isMissing ? null : item.get('ENTITYTYPE').stringValue()
  return entityType
}

let deletedTotal = 0
db.on('del', (key) => {
  deletedTotal++
  console.debug('DELETING: ', key)
})

db.on('put', (key) => {
  deletedTotal++
  console.debug('CREATING A "_deleted" record: ', key)
})

db.on('closed', () => {
  console.log('DELETED:', deletedTotal)
})

await deleteUsers(db)
await db.close()

