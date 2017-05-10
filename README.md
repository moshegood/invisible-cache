# invisible-cache
A node.js caching system that lets you continue using your existing code without refactoring.

# Install
```bash
  npm install invisible-cache
```
# Introduction

This module exports three caching generators. They are used in different scenarios.

`cacheById(ttl_in_ms, function_to_cache)` is used when your `function_to_cache` takes a single input.

```js
function function_to_cache(id) {...}
```

`cachePerId(ttl_in_ms, function_to_cache, id_attribute = id)` is used when your `function_to_cache` takes an array input and produces an array of records, with an attribute per record mapping back to a related item in the input array.

```js
function function_to_cache(ids) { return [...]; }
```

`cachePerHashKey(ttl_in_ms, function_to_cache)` is used when your `function_to_cache` takes an array input and produces a hash, with the keys of the hash are related to the input array.

```js
function function_to_cache(ids) { return {...}; }
```

# Samples

Let's assume we have a SQL table...

```
----------------------------
| accounts                 |
----------------------------
| id | user_id | name      |
----------------------------
|  1 |       1 | Savings   |
|  2 |       1 | Chequing  |
|  3 |       1 | US Dollar |
|  4 |       2 | Savings   |
|  5 |       2 | Chequing  |
|  6 |       3 | Chequing  |
----------------------------
```

Some queries someone may decide to perform on this table...

## Get data for a single ID

Without caching...

```js
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function getAccount(id){
    console.log("Fetching account: " + id);
    return pool.query(
        'select * from accounts where id = ?',
        [id]
    );
}

Promise.resolve(1)                              // Start a promise chain
    .then(() => getAccount(4))                  // 'Fetching account 4'
    .then( rows => console.log(row[0].name) );  // 'Savings'
    .then(() => getAccount(3))                  // 'Fetching account 3'
    .then( rows => console.log(row[0].name) );  // 'US Dollar'
    .then(() => getAccount(4))                  // 'Fetching account 4'
    .then( rows => console.log(row[0].name) );  // 'Savings'

```

And with caching...

```js
var cache = require('invisible-cache');
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function _getAccount(id){
    console.log("Fetching account: " + id);
    return pool.query(
        'select * from accounts where id = ?',
        [id]
    );
}
var getAccount = cache.cacheById(10*60*1000, _getAccount);
// no code below this line needs to change

Promise.resolve(1)                              // Start a promise chain
    .then(() => getAccount(4))                  // 'Fetching account 4'
    .then( rows => console.log(row[0].name) );  // 'Savings'
    .then(() => getAccount(3))                  // 'Fetching account 3'
    .then( rows => console.log(row[0].name) );  // 'US Dollar'
    .then(() => getAccount(4))                  // ...
    .then( rows => console.log(row[0].name) );  // 'Savings'
```

## Get data for multiple IDs

Without caching...

```js
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function _getAccounts(ids){
    console.log("Fetching accounts: " + ids);
    return pool.query(
        'select * from accounts where id in (?)',
        [ids]
    );
}
var getAccounts = cache.cachePerId(10*60*1000, _getAccounts);
// no code below this line needs to change

Promise.resolve(1)                              // Start a promise chain
    .then(() => getAccounts([1,2]))             // 'Fetching accounts: 1,2'
    .then( rows => 
        console.log(rows.map(r => r.name))      // [ 'Savings', 'Chequing' ]
    );
    .then(() => getAccounts([2,3]))             // 'Fetching accounts: 2,3'
    .then( rows =>
        console.log(rows.map(r => r.name))      // [ 'Chequing', 'US Dollar' ]
    );
    .then(() => getAccounts([1,3]))             // 'Fetching accounts: 1,3'
    .then( rows =>
        console.log(rows.map(r => r.name))      // [ 'Savings', 'US Dollar' ]
    );
```

And with caching...

```js
var cache = require('invisible-cache');
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function getAccounts(ids){
    console.log("Fetching accounts: " + ids);
    return pool.query(
        'select * from accounts where id in (?)',
        [ids]
    );
}

Promise.resolve(1)                              // Start a promise chain
    .then(() => getAccounts([1,2]))             // 'Fetching accounts: 1,2'
    .then( rows => 
        console.log(rows.map(r => r.name))      // [ 'Savings', 'Chequing' ]
    );
    .then(() => getAccounts([2,3]))             // 'Fetching accounts: 3'
    .then( rows =>
        console.log(rows.map(r => r.name))      // [ 'Chequing', 'US Dollar' ]
    );
    .then(() => getAccounts([1,3]))             // ... Cache hit. No DB hit.
    .then( rows =>
        console.log(rows.map(r => r.name))      // [ 'Savings', 'US Dollar' ]
    );

```

## Getting a bunch of data grouped by some ID

Without caching...

```js
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function getUserAccounts(ids) {
console.log("Fetching accounts for users: " + ids);
return pool.query('select * from accounts where user_id in (?)', [ids])
  .then( rows => {
    var hashById = {};
    // initialize arrays for each user
    for(var u = 0; u < ids.length; u++){
        hashById[ ids[u] ] = [];
    }
    // put each row into the array for that user
    for(var i = 0; i < rows.length; i++){
      hashById[ row[i].user_id ].push(row);
    }
    return hashById;
  });
}

Promise.resolve(1)                      // Start a promise chain
  .then(() => getUserAccounts([1,2]))   // 'Fetching accounts for users: 1,2'
  .then(console.log)
  .then(() => getUserAccounts([2,3]))   // 'Fetching accounts for users: 2,3'
  .then(console.log)
  .then(() => getUserAccounts([1,3]))   // 'Fetching accounts for users: 1,3'
  .then(console.log);

  // Output:
  // { 1: [ 
  //        {id: 1, user_id: 1, name: 'Savings'},
  //        {id: 2, user_id: 1, name: 'Chequing'},
  //        {id: 3, user_id: 1, name: 'US Dollar'}
  //      ],
  //   2: [
  //        {id: 4, user_id: 2, name: 'Savings'},
  //        {id: 5, user_id: 2, name: 'Chequing'}
  //      ]
  // }
  // { ... }
  // { ... }

```

With caching...

```js
var cache = require('invisible-cache');
var mysql = require('mysql-promise');
val pool = mysql.createPool({...});

function _getUserAccounts(ids) {
  console.log("Fetching accounts for users: " + ids);
  return pool.query('select * from accounts where user_id in (?)', [ids])
    .then( rows => {
      var hashById = {};
      // initialize arrays for each user
      for(var u = 0; u < ids.length; u++){
          hashById[ ids[u] ] = [];
      }
      // put each row into the array for that user
      for(var i = 0; i < rows.length; i++){
        hashById[ row[i].user_id ].push(row);
      }
      return hashById;
    });
}
var getUserAccounts = cache.cachePerHashKey(10*60*1000, _getUserAccounts);
// no code below this line needs to change

Promise.resolve(1)                      // Start a promise chain
  .then(() => getUserAccounts([1,2]))   // 'Fetching accounts for users: 1,2'
  .then(console.log)
  .then(() => getUserAccounts([2,3]))   // 'Fetching accounts for users: 3'
  .then(console.log)
  .then(() => getUserAccounts([1,3]))   // ... Cache hit. No DB hit.
  .then(console.log);

  // Output:
  // { 1: [ 
  //        {id: 1, user_id: 1, name: 'Savings'},
  //        {id: 2, user_id: 1, name: 'Chequing'},
  //        {id: 3, user_id: 1, name: 'US Dollar'}
  //      ],
  //   2: [
  //        {id: 4, user_id: 2, name: 'Savings'},
  //        {id: 5, user_id: 2, name: 'Chequing'}
  //      ]
  // }
  // { ... }
  // { ... }
```
