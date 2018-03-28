'use strict';

const cache = require(__dirname + '/../index');

const calledCounts = {};
function fetchById(id,cb) {
  calledCounts.fetchById = calledCounts.fetchById || 0;
  calledCounts.fetchById++;
  return cb(null,id * 2);
}

function fetchByIds(ids,cb) {
  calledCounts.fetchByIds = calledCounts.fetchByIds || 0;
  calledCounts.fetchByIds++;
  return cb(null,ids.map(x=> {return [{id: x, value: 3*x}, {id: x, value: 2*x}]}).reduce((a,b)=>a.concat(b)));
}

const cachedFetchById = cache.callback.idToValue(1000, fetchById);
const cachedFetchByIds = cache.callback.idsAsAttributes(1000, fetchByIds);

cachedFetchById(3, (e,x) => {if(x != 6) throw new Error('cacheById failed: expected 6, got: ' + x)
cachedFetchById(3, (e,x) => {if(x != 6) throw new Error('cacheById failed: expected 6, got: ' + x)
cachedFetchById(4, (e,x) => {if(x != 8) throw new Error('cacheById failed: expected 8, got: ' + x)
cachedFetchById(4, (e,x) => {if(x != 8) throw new Error('cacheById failed: expected 8, got: ' + x)
cachedFetchById(4, (e,x) => {if(x != 8) throw new Error('cacheById failed: expected 8, got: ' + x)
cachedFetchByIds([10,11], () =>
cachedFetchByIds([10,11], () =>
cachedFetchByIds([11,12], () =>
cachedFetchByIds([10,12], () => {
  if(calledCounts.fetchById != 2) throw new Error('cacheById was called the wrong number of times!');
  if(calledCounts.fetchByIds != 2) throw new Error('cachePerId was called the wrong number of times!');
  console.log(calledCounts);
}))))})})})})});


