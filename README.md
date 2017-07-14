# invisible-cache
A node.js caching system that lets you continue using your existing code without refactoring.

# Install
```bash
  npm install invisible-cache
```
# Introduction

This module lets you turn your existing data fetching functions into ones that have a TTL cache built in.

To alleviate refactoring work, the cached versions of the fetching functions have the same calling symatics as the original versions.

This module currently supports:
* Promise based fetching functions
* Callback style fetching functions

Within each category, there are three main calling symatics that are supported:
* Fetching a single ID at a time.
* Fetching multiple IDs where the function output is a hash whose keys are the input IDs to the function.
* Fetching multiple IDs where the function output is an array of objects, each of which contains the corresponding input ID in an attribute.

If you have a fetching function that does not follow one of the above options, please let us know so that we can add support.

# Usage
```js
  const cachify = require('invisible-cache');
  const cachifyPromise = cachify.promise;
  const cachifyCallback = cachify.callback;

  const ttl = 60*1000; // one minute

  // fetching a single ID at a time - using promises
  function fetchUserPromise(id){ ... }
  const cachedFetchUserPromise =
    cachifyPromise.idToValue(ttl, fetchUserPromise);
  const userPromise = cachedFetchUserPromise(123);

  // fetching a single ID at a time - using callbacks
  function fetchUserCallback(id, cb){ ... }
  const cachedFetchUserCallback =
    cachifyCallback.idToValue(ttl, fetchUserCallback);
  cachedFetchUserCallback(123, (user) => { ... });

  // fetching many user rows at a time - using promises
  const attributeWithId = 'user_id';
  function fetchUsersPromise(ids){ ... }
  const cachedFetchUsersPromise =
    cachifyPromise.idsAsAttributes(ttl, fetchUsersPromise, attributeWithId);
  const usersPromise = cachedFetchUsersPromise([123,456]);

  // fetching many user rows at a time - using callbacks
  function fetchUsersCallback(ids, cb){ ... }
  const cachedFetchUsersCallback =
    cachifyCallback.idsAsAttributes(ttl, fetchUsersCallback, attributeWithId);
  cachedFetchUsersCallback([123,456], (users) => { ... }); 

  // fetching a hash with user_ids as the keys - using promises
  function fetchUsersHashPromise(ids){ ... }
  const cachedFetchUsersHashPromise =
    cachifyPromise.idsAsHashKeys(ttl, fetchUsersHashPromise);
  const usersHashPromise = cachedFetchUsersHashPromise([123,456]);

  // fetching a hash with user_ids as the keys - using callbacks
  function fetchUsersHashCallback(ids, cb){ ... }
  const cachedFetchUsersHashCallback =
    cachifyCallback.idsAsHashKeys(ttl, fetchUsersHashCallback);
  cachedFetchUsersHashCallback([123,456], (usersHash) => { ... });
```

# Avoiding Refactoring
You can avoid refactoring by having the cached fetching function named as the original uncached fetching function.

```js
  // old code
  function myFetchFunction(id){ ... }

  // new code
  function _myFetchFunction(id){ ... }
  const myFetchFunction =
    cachify.promise.idToValue(ttl, _myFetchFunction);
```

