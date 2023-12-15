---
title: "Parsing Local Amazon Ion Data with ion-js and classic-level"
date: 2023-10-29
draft: false
tags:
  - "software"
  - "javascript"
  - "databases"
---

This repo is supplemental reading to my blog [article](https://www.transmitteddreams.xyz/blog/amazon_ion/). Clone and try the following scripts:

```bash
$ npm run example-1
$ npm run example-2
```

## Introduction to `ion-js` and `classic-level`

In the ever-evolving landscape of cloud computing, AWS DynamoDB stands out as a highly performant, scalable NoSQL database service. However, developing and testing applications that interact with DynamoDB can often be a challenge, especially when it comes to setting up a local development environment. DynamoDB allows you to export tables or point-in-time backups your data to S3 in [Amazon Ion](https://amazon-ion.github.io/ion-docs/index.html) format. This is where [`ion-js`](https://www.npmjs.com/package/ion-js) comes into the picture. `ion-js` is a JavaScript library designed allow developers load Ion data with Javascript. [`classic-level`](https://www.npmjs.com/package/classic-level) on the other hand allows you to interface with Ion tables in a cohesive and effective way. 

## Setting Up Your Environment

First, you need to install `ion-js` and `classic-level`. Assuming you have Node.js and `npm` installed, you can add `ion-js` to your project with the following command:

```bash
$ npm init
$ npm i ion-js classic-level
```

Otherwise you can get an easier way of setting up an Ion playground by cloning this repo.

## Example 1: Iterating Over Rows of Data

### Creating a Table

First, let's create an *abstract-level* database for our example:

```js
import ion from 'ion-js'
import {ClassicLevel} from 'classic-level'

const db = new ClassicLevel(`./db`, {keyEncoding: 'json', valueEncoding: 'view'})
```

The `classic-level` package will allow us to create local database that we can write to and read from.
In the next code snippet we will define some dummy data and and populate the database.

```js
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

await createTable(db, items)
```

This will create and save a database in `/db`, where you will find the binary `.ldb` files and related logs.

### Iterating over keys

We can create a keys iterator with `db.keys()` in order to loop over the primary keys:

```js
async function iterateKeys(db) {
  console.log('ITERATE KEYS:')
  for await (const key of db.keys()) {
    console.log(key)
  }
}

await iterateKeys(db)
```

will iterate over the keys with the following result:

```log
ITERATE KEYS:
{ PK: 'pk1', SK: 'a' }
{ PK: 'pk2', SK: 'b' }
{ PK: 'pk3', SK: 'c' }
{ PK: 'pk4', SK: 'd' }
{ PK: 'pk5', SK: 'e' }
```

### Iterating over rows

In a similar manner we can iterate over the entire objects with `db.values()`:

```js
async function iterateValues(db) {
  console.log('ITERATE VALUES:')
  for await (const value of db.values()) {
    const item = ion.load(value)
    console.log(item.PK.stringValue())
  }
}

await iterateValues(db)
```

yields:

```log
ITERATE VALUES:
pk1
pk2
pk3
pk4
pk5
```

### A better iterator

There is a function that produces a better iterator combining functionalities of both `db.keys()` and `db.values()`:

```js
console.hr = () => console.log('-'.repeat(50)) // for more readable logging

async function iterateKeyValues(db) {
  console.log('ITERATE KEY VALUES:')
  for await (const [key, value] of db.iterator()) {
    const item = ion.load(value)
    console.log('KEY', key) // JavaScript Object
    console.log('ITEM', item) // Amazon Ion Struct
    console.hr()
  }
}


await iterateKeyValues(db)
```

will produce:

```log
ITERATE KEY VALUES:
KEY { PK: 'pk1', SK: 'a' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk1'] ],
    SK: [ [String: 'a'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
KEY { PK: 'pk2', SK: 'b' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk2'] ],
    SK: [ [String: 'b'] ],
    ENTITYTYPE: [ [String: 'user'] ]
  }
}
==================================================
KEY { PK: 'pk3', SK: 'c' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk3'] ],
    SK: [ [String: 'c'] ],
    ENTITYTYPE: [ [String: 'user'] ]
  }
}
==================================================
KEY { PK: 'pk4', SK: 'd' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk4'] ],
    SK: [ [String: 'd'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
KEY { PK: 'pk5', SK: 'e' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk5'] ],
    SK: [ [String: 'e'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
```

## Example 2: Writing new rows

Let's imagine a scenario where we need to delete all the rows with `'ENTITYTYPE': 'user'` and replace them with different entities.

## Writing and deleting

Loading a table is incredibly easy with `classic-level`, so let's get to writes and deletes, see `deleteUsers()`:

```js
import ion from 'ion-js'
import {ClassicLevel} from 'classic-level'
const db = new ClassicLevel(`./db`, {keyEncoding: 'json', valueEncoding: 'view'})
console.hr = () => console.log('='.repeat(50))

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

async function iterateKeyValues(db) {
  console.log('ITERATE KEY VALUES:')
  for await (const [key, value] of db.iterator()) {
    const item = ion.load(value)
    console.log('KEY', key) // JavaScript Object
    console.log('ITEM', item) // Amazon Ion Struct
    console.hr()
  }
}

// Take a look at this! the value here is a Uint8Array so we need to use ion to load the value. No await required.
// The resulting item will have all the methods you need to deal with the data.
function getEntityType(value) {
  const item = ion.load(value)
  const isMissing = item.get('ENTITYTYPE') === null
  const et = isMissing ? null : item.get('ENTITYTYPE').stringValue()
  return et
}

await deleteUsers(db)
await iterateKeyValues(db)
```

Will give us the following result with two new entities created based on existing entities.

```log
KEY { PK: 'pk1', SK: 'a' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk1'] ],
    SK: [ [String: 'a'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
KEY { PK: 'pk2_deleted', SK: 'b' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk2'] ],
    SK: [ [String: 'b'] ],
    ENTITYTYPE: [ [String: 'user'] ]
  }
}
==================================================
KEY { PK: 'pk3_deleted', SK: 'c' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk3'] ],
    SK: [ [String: 'c'] ],
    ENTITYTYPE: [ [String: 'user'] ]
  }
}
==================================================
KEY { PK: 'pk4', SK: 'd' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk4'] ],
    SK: [ [String: 'd'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
KEY { PK: 'pk5', SK: 'e' }
ITEM Struct {
  _fields: [Object: null prototype] {
    PK: [ [String: 'pk5'] ],
    SK: [ [String: 'e'] ],
    ENTITYTYPE: [ [String: 'account'] ]
  }
}
==================================================
```

## Event listeners

Looping over the table again just to see whether our change went through is **very** uneffective when dealing with bigger tables. `classic-level` allows us to define event listeners like so:

```js
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

```

will yield:

```log
DELETE USERS:
DELETING:  { PK: 'pk2', SK: 'b' }
CREATING A "_deleted" record:  { PK: 'pk2_deleted', SK: 'b' }
DELETING:  { PK: 'pk3', SK: 'c' }
CREATING A "_deleted" record:  { PK: 'pk3_deleted', SK: 'c' }
DELETED: 12
```


## Conclusion

`ion-js` in combination with `classic-level` offers a robust and intuitive approach to handling local DynamoDB data, making it an essential tool for developers working with AWS services. By simplifying the complexities of database operations, `ion-js` lets you focus on things like running analysis on your backups after a data-corrupting issue or experiment with your entity structure without having to waste your money in AWS DynamoDB console.

## Changelog

### 12/15/23
* added better links
* added a repo with examples
* improved intro wording