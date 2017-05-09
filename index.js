'use strict';

const Promise = require("bluebird");

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
    const idsToFetch = [];

    for(let id of ids) {
      const t = expireTime[id] || 0;
      if (now > t) {
        idsToFetch.push(id);
      }
      else {
        ret[id] = fetchedData[id];
      }
    }

    if(idsToFetch.length == 0) {
      return Promise.resolve(ret);
    }

    const promiseToReturn = Promise.resolve(fetchFunction(idsToFetch))
      .tap( (data) => {
        const expire = new Date().getTime() + ttl;
        Object.assign(fetchedData, data);
        for(let id in data) {
          expireTime[id] = expire;
          fetchHistory.push(id);
        }
      })
      .then( (data) => Object.assign(ret, data) );

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

exports.timedCacheWrapper = timedCacheWrapper;
exports.hashRowsByColumnFactory = hashRowsByColumnFactory;
exports.hashRowsByUniqColumnFactory = hashRowsByUniqColumnFactory;
