'use strict';

const _       = require('lodash'),
      sqlite3 = require('sqlite3'),
      db      = new sqlite3.Database('prod.db');

let cache = require("./cache");

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function checkAndGetName(product) {
    return new Promise((resolve, reject) => {
        if (!isNumeric(product.id)) {
            return reject(new Error('Not a valid ID'));
        }

        db.get('SELECT name FROM product WHERE id = $id', {
            $id: product.id
        }, function(err, rows) {
            if (err) {
                return reject(err);
            }

            if (_.isEmpty(rows)) {
                return resolve(false);
            }

            resolve(rows);
        });
    });
}

function getProductInfo(rows, product) {
    return new Promise((resolve, reject) => {
        if (rows) {
            product.name = rows.name;
            let query =
                "SELECT description, stock, price " +
                "FROM (" +
                "  SELECT pi_en.id AS id," +
                "    COALESCE(pi_locale.description, pi_en.description) AS description" +
                "  FROM" +
                "    (" +
                "      SELECT id, description" +
                "      FROM product_info pi" +
                "      WHERE pi.id = $id AND pi.locale = $defaultLocale" +
                "    ) AS pi_en LEFT OUTER JOIN" +
                "    (" +
                "      SELECT id, description" +
                "      FROM product_info pi" +
                "      WHERE pi.id = $id AND pi.locale = $locale" +
                "    ) AS pi_locale" +
                "      ON pi_locale.id = pi_en.id" +
                ") AS pi INNER JOIN product_stock ps ON pi.id = ps.id";
            db.get(query, {
                $id: product.id,
                $locale: product.locale,
                $defaultLocale: "en"
            }, function(err, rows) {
                if (err) {
                    return reject(err);
                }

                if (_.isEmpty(rows)) {
                    return resolve(false);
                }
                if (rows) {
                    product.description = rows.description;
                    product.stock = rows.stock;
                    product.price = rows.price;

                    resolve();
                } else {
                    reject(404);
                }
            });
        } else {
            reject(404);
        }
    });
}

function handleError(err, res) {
    if (err === 404) {
        res.status(404).json({
            message: "Product not found"
        });
    } else {
        res.status(500).json({
            message: err.message
        });
    }
}

function getFlatProduct(req, res) {
    //const locale = req.params.locale || 'en';
    const locale = req.query.locale || 'en';

    let product = {
        id: req.params.pid,
        locale: locale
    };

    let fromCache = cache.get({id: product.id}, (criteria, item) => {
        return criteria.id == item.id;
    });
    if (fromCache != undefined) {
        console.log("Fetched from cache.");
        res.json(fromCache.data);
    } else {
        checkAndGetName(product).then((rows) => {
            return getProductInfo(rows, product);
        }).then(() => {
            console.log("Fetched from DB.");
            cache.put(product);
            res.json(product);
        }).catch((err) => {
            handleError(err, res);
        });
    }
}

function Product() {
    return function(req, res) {
        getFlatProduct(req, res);
    };
}

module.exports = Product;
