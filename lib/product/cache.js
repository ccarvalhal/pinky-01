/**
 * This module implement a simple in-memory cache.
 *
 * Created by Carlos Carvalhal on 31-03-2017.
 */

"use strict";

const _ = require("lodash");

// The maximum number of items that can be cached simultaneously
const CAPACITY = 100;
// The amount of time during which an item in cache is valid.
const LIFETIME = 2 * 60 * 1000;
// The quantity of itens to be removed from the cache in case it is out of space.
const CLEANING_THRESHOLD = 25;
// The cache storage space (insertion on bottom removing from top).
// [{timestamp: <The time the item was stored in cache>, data: <The item stored in cache>}, ...]
let storage = [];

/**
 * Get the cached instance of the item identified by the argument "criteria" or "undefined" if the item does not exist
 * in cache or exist but is expired.
 *
 * @param {Object} criteria Constains the attributes to be used to identify the target item.
 * @param {function} isEqualFunction The function to be used to compare itens. This function will be called with two
 *      arguments, the first one is the "criteriaItem" and the second one is the cache entry, and must return "true"
 *      if they are equals and "false" if they are not equals.
 * @return {Object | undefined} The found item ou "undefined" if the item was not found in cache or if the cached
 *      version is expired.
 */
function get(criteria, isEqualFunction) {
    let item;
    let now = new Date().getTime();
    for (let i = 0, leni = storage.length; i < leni; i++) {
        item = storage[i];
        if (isEqualFunction(criteria, item.data)) {
            if (now - item.timestamp <= LIFETIME) {
                return item;
            } else {
                storage.splice(i, 1);
                return undefined;
            }
        }
    }
    return undefined;
}

/**
 * Store the item referred by the argument "item" in cache.
 *
 * @param item The item to be stored in cache.
 */
function put(item) {
    if (storage.length >= CAPACITY) {
        storage.splice(0, CLEANING_THRESHOLD);
    }
    storage[storage.length] = {timestamp: new Date().getTime(), data: _.clone(item)};
}

module.exports.get = get;
module.exports.put = put;