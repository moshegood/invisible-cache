'use strict';

// ttl - the time to live in ms
// fetchFunction - should return a promise that maps:
//      [id1, id2, ...] => { id1: { data1 }, id2: { data2 }, ... }
function timedCacheWrapper(ttl, fetchFunction){
  const expireTime = {};
  const fetchedData = {};
  const fetchHistory = [];

  return (ids) => {
    const now = new Date().getTime();
    const ret = {};
    const idsAsFetch = [];

    for(let id of ids) {
      const t = expireTime[id] || 0;
      if (now > t) {
        idsAsFetch.push(id);
      }
      else {
        ret[id] = fetchedData[id];
      }
    }

    if(idsAsFetch.length == 0) {
      return Promise.resolve(ret);
    }

    const promiseToReturn = fetchFunction(idsAsFetch)
      .then( (data) => {
        const expire = new Date().getTime() + ttl;
        Object.assign(fetchedData, data);
        for(let id in data) {
          expireTime[id] = expire;
          fetchHistory.push(id);
        }
        return data;
      })
      .then( (data) => Object.assign(ret, data) );

    if(ttl === 0) {
      return promiseToReturn;
    }

    // while we are waiting for a result, cleanup old data
    while(true) {
      const id = fetchHistory[0];
      if(fetchHistory.length == 0) break;
      if(expireTime[id] > now) break;

      fetchHistory.shift();
      delete expireTime[id];
      delete fetchedData[id];
    }

    return promiseToReturn;
  };
}

function hashRowsByUniqColumnFactory(column) {
  return (rows) => {
    const hash = {};
    for(let row of rows) {
      const key = row[column];
      if( key === undefined ) throw new Error(`Missing value for ${column} on ${row}`);
      hash[key] = row;
    }
    return hash;
  };
}

function hashRowsByColumnFactory(column){
  return (rows) => {
    const hash = {};
    for(let row of rows) {
      const key = row[column];
      if( key === undefined ) throw new Error(`Missing value for ${column} on ${row}`);
      hash[key] = hash[key] || [];
      hash[key].push(row);
    }
    return hash;
  };
}

function cachePromiseById(ttl, fetchFunction) {
  const idToValue = (ids) =>
    fetchFunction(ids[0])
      .then( (data) => {
        const h = {};
        h[ids[0]] = data;
        return h;
      });
  
  const cachedFunction = timedCacheWrapper(ttl, idToValue);
  return (id) =>
    cachedFunction([id])
    .then( data => data[id] );
}

function cachePromisePerId(ttl, fetchFunction, idAttribue = 'id') {
  const idsAsValues = (ids) =>
    fetchFunction(ids)
      .then(hashRowsByColumnFactory(idAttribue));
  const cachedFunction = timedCacheWrapper(ttl, idsAsValues);
  return (ids) =>
    cachedFunction(ids)
    .then(h => Object.values(h).reduce( (a,b) => a.concat(b), []));
}

function cachePromisePerHashKey(ttl, fetchFunction) {
  return timedCacheWrapper(ttl, fetchFunction);
}

// Callback function support

function nullCB() {
  return null;
}

function cacheCallbackById(ttl, fetchFunction){
  const f = cachePromiseById(ttl, promisify(fetchFunction));
  return callbackify(f);
}

function cacheCallbackPerId(ttl, fetchFunction){
  const f = cachePromisePerId(ttl, promisify(fetchFunction));
  return callbackify(f);
}

function cacheCallbackPerHashKey(ttl, fetchFunction){
  const f = cachePromisePerHashKey(ttl, promisify(fetchFunction));
  return callbackify(f);
}

module.exports = {
  promise: {
    idsAsHashKeys: cachePromisePerHashKey,
    idsAsAttributes: cachePromisePerId,
    idToValue: cachePromiseById
  },
  callback: {
    idsAsHashKeys: cacheCallbackPerHashKey,
    idsAsAttributes: cacheCallbackPerId,
    idToValue: cacheCallbackById
  }
};


function promisify(f) {
  return (x) => {
    return new Promise( (resolve, reject) => {
      f(x, (err, data) => {
        if(err){
          reject(err);
        }
        else {
          resolve(data);
        }
      });
    });
  };
}

function callbackify(f) {
  return async (ids, cb = nullCB) => {
    try {
      const data = await f(ids);
      cb(null, data);
    }
    catch (err) {
      cb(err);
    }
  };
}
