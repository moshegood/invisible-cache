'use strict';

const cache = require(__dirname + '/../index');

const calledCounts = {};
function fetchById(id) {
  calledCounts.fetchById = calledCounts.fetchById || 0;
  calledCounts.fetchById++;
  return Promise.resolve(id * 2);
}

function fetchByIds(ids) {
  calledCounts.fetchByIds = calledCounts.fetchByIds || 0;
  calledCounts.fetchByIds++;
  return Promise.resolve(ids.map(x=> {return [{id: x, value: 3*x}, {id: x, value: 2*x}]}).reduce((a,b)=>a.concat(b)));
}

const cachedFetchById = cache.promise.idToValue(1000, fetchById);
const cachedFetchByIds = cache.promise.idsAsAttributes(1000, fetchByIds);

Promise.resolve(1)
  .then(() => cachedFetchById(3))
  .then(x => {if(x != 6) throw new Error('cacheById failed')})
  .then(() => cachedFetchById(3))
  .then(x => {if(x != 6) throw new Error('cacheById failed')})
  .then(() => cachedFetchById(4))
  .then(x => {if(x != 8) throw new Error('cacheById failed')})
  .then(() => cachedFetchById(4))
  .then(x => {if(x != 8) throw new Error('cacheById failed')})
  .then(() => cachedFetchById(4))
  .then(x => {if(x != 8) throw new Error('cacheById failed')})
  .then(() => cachedFetchByIds([10,11]))
  .then(() => cachedFetchByIds([10,11]))
  .then(() => cachedFetchByIds([11,12]))
  .then(() => cachedFetchByIds([10,12]))
  .then(() => {
    if(calledCounts.fetchById != 2) throw new Error('cacheById was called the wrong number of times!');
    if(calledCounts.fetchByIds != 2) throw new Error('cachePerId was called the wrong number of times!');
  })
  .then( () => console.log(calledCounts) );


