# invisible-cache
A node.js caching system that lets you continue using your existing code without refactoring.

OK. Maybe not. :-)

Assuming your fetching function returns a hash that maps ID => value, then you're good.

# Install
```bash
  npm install invisible-cache
```

# Samples

Without caching:
```js
  var mysql = require('mysql-promise');
  val pool = mysql.createPool({...});

  function getUsers(userIds) {
    return pool
      .query('select * from users where id in (?)', [userIds])
      .then( rows => {
        var usersById = {};
        for(var i = 0; i < rows.length; i++){
          usersById[ row[i].id ] = row;
        }
        return usersById;
      });
  }

  getUsers([1,2,3]).then(console.log);      // hits the DB
  getUsers([2,4,6]).then(console.log);      // hits the DB
  getUsers([1,2,3,4]).then(console.log);    // hits the DB

  // Output: { "1": {"id": 1, "name": "Me"}, "2": {"id": 2, "name": "You"}, ... }

```

With caching:
```js
  var mysql = require('mysql-promise');
  val pool = mysql.createPool({...});
  var cache = require('invisible-cache');

  function _getUsers(userIds) {
    return pool
      .query('select * from users where id in (?)', [userIds])
      .then(cache.hashRowsByUniqColumnFactory('id'));
  }
  // cache results for 5 minutes
  var getUsers = cache.timedCacheWrapper(5*60*1000, _getUsers);

  getUsers([1,2,3]).then(console.log);      // hits the DB to get users 1,2,3
  getUsers([2,4,6]).then(console.log);      // hits the DB to get users 4,6
  getUsers([1,2,3,4]).then(console.log);    // doesn't hit the DB at all

  // Output:
  // { "1": {"id": 1, "name": "Me"},
  //   "2": {"id": 2, "name": "You"},
  //   "3": {"id": 3, "name": "Jim"}
  //   "4": {"id": 3, "name": "James"}
  // }
```

You can also easily cache when the fetching function returns many rows per input:
```js
  var mysql = require('mysql-promise');
  val pool = mysql.createPool({...});
  var cache = require('invisible-cache');

  function _getUserAccounts(userIds) {
    return pool
      .query('select * from accounts where user_id in (?)', [userIds])
      .then(cache.hashRowsByColumnFactory('user_id'));
  }
  // cache results for 5 minutes
  var getUserAccounts = cache.timedCacheWrapper(5*60*1000, _getUsers);

  getUserAccounts([1,2,3]).then(console.log);      // hits the DB for users 1,2,3
  getUserAccounts([2,4,6]).then(console.log);      // hits the DB for users 4,6
  getUserAccounts([1,2,3,4]).then(console.log);    // doesn't hit the DB at all

  // Output:
  // { "1": [ {"id": 101, "user_id": 1, "name": "Savings"}, {"id": 102, "user_id": 1, ... } ],
  //   "2": [ {"id": 111, "user_id": 2, "name": "Chequing"}, {"id": 112, "user_id": 2, ... } ],
  //   "3": [ {"id": 121, "user_id": 3, "name": "CDN Dollar"}, {"id": 122, "user_id": 3, ... } ],
  //   "4": [ {"id": 131, "user_id": 4, "name": "Savings"}, {"id": 132, "user_id": 4, ... } ] }
```
