/**
 * Unit test for the Cache Mechanism and the Locale Support.
 *
 * Created by Carlos Carvalhal on 02-04-2017.
 */

"use strict";

let chai = require("chai");
let chaiHttp = require("chai-http");
let server = require(process.cwd() + "/index");
let expect = chai.expect;
let cache = require(process.cwd() + "/lib/product/cache");

let util = require("util");

chai.use(chaiHttp);

// Test the Locale Support.
describe("Locale Support", () => {
    let sqlite3 = require("sqlite3").verbose();
    let db = new sqlite3.Database("prod.db");
    let prodIdLocalePTEN, prodIdLocaleEN;
    const prodDescLocalePT = "Descrição do Produto";
    const prodDescLocaleEN = "Product Description";

    before(function(done) {
        // Get the ID for the products used in the test cases.
        db.get("SELECT seq FROM sqlite_sequence WHERE name = 'product'",
            function(err, row) {
                expect(row).to.be.a("object");
                expect(row.seq).to.be.a("number");

                prodIdLocaleEN = row.seq + 1;
                prodIdLocalePTEN = prodIdLocaleEN + 1;

                db.serialize(function() {
                    // Insert the products in the "product" table.
                    let stmt = db.prepare("INSERT INTO product VALUES (?, ?), (?, ?)",
                        [prodIdLocaleEN, "Test Product Locale EN",
                            prodIdLocalePTEN, "Test Product Locale PT and EN"]);
                    stmt.run(function (err) {
                        expect(err).to.not.exist;
                    });
                    stmt.finalize();

                    // Insert the description of the products in the "product_info" table.
                    stmt = db.prepare("INSERT INTO product_info VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)",
                        [prodIdLocaleEN, "en", prodDescLocaleEN,
                            prodIdLocalePTEN, "pt", prodDescLocalePT,
                            prodIdLocalePTEN, "en", prodDescLocaleEN]);
                    stmt.run(function (err) {
                        expect(err).to.not.exist;
                    });
                    stmt.finalize();

                    // Insert the stock and price info in the "product_stock" table.
                    stmt = db.prepare("INSERT INTO product_stock VALUES (?, ?, ?), (?, ?, ?)",
                        [prodIdLocaleEN, 0, 0.0, prodIdLocalePTEN, 0, 0.0]);
                    stmt.run(function (err) {
                        expect(err).to.not.exist;
                        done();
                    });
                    stmt.finalize();
                });
            });
    });

    after(function(done) {
        db.serialize(function() {
            let stmt = db.prepare("DELETE FROM product WHERE id in (?, ?)",
                [prodIdLocaleEN, prodIdLocalePTEN]);
            stmt.run(function(err) {
                expect(err).to.not.exist;
            });
            stmt.finalize();

            stmt = db.prepare("DELETE FROM product_info WHERE id in (?, ?)",
                [prodIdLocaleEN, prodIdLocalePTEN]);
            stmt.run(function(err) {
                expect(err).to.not.exist;
            });
            stmt.finalize();

            stmt = db.prepare("DELETE FROM product_stock WHERE id in (?, ?)",
                [prodIdLocaleEN, prodIdLocalePTEN]);
            stmt.run(function(err) {
                expect(err).to.not.exist;
                db.close();
                done();
            });
            stmt.finalize();
        });
    });

    it("Should return the description in 'pt' of a product with description in 'en' and 'pt'.", (done) => {
        chai.request(server)
            .get(util.format("/product/%d?locale=pt", prodIdLocalePTEN))
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals(util.format("%d", prodIdLocalePTEN));
                expect(res.body.locale).to.be.equals("pt");
                expect(res.body.description).to.be.equals(prodDescLocalePT);
                done();
            });
    });

    it("Should return the description in 'en' of a product with description in 'en' and 'pt'.", (done) => {
        chai.request(server)
            .get(util.format("/product/%d?locale=en", prodIdLocalePTEN))
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals(util.format("%d", prodIdLocalePTEN));
                expect(res.body.locale).to.be.equals("en");
                expect(res.body.description).to.be.equals(prodDescLocaleEN);
                done();
            });
    });

    it("Should return the description in the default locale ('en') of a product with description in 'en' and 'pt'" +
        " because the request did not specify the locale.", (done) => {
        chai.request(server)
            .get(util.format("/product/%d", prodIdLocalePTEN))
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals(util.format("%d", prodIdLocalePTEN));
                expect(res.body.locale).to.be.equals("en");
                expect(res.body.description).to.be.equals(prodDescLocaleEN);
                done();
            });
    });

    it("Should return the description in the default locale ('en') of a product without description" +
        " in the requested locale ('pt').", (done) => {
        chai.request(server)
            .get(util.format("/product/%d?locale=pt", prodIdLocaleEN))
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals(util.format("%d", prodIdLocaleEN));
                expect(res.body.locale).to.be.equals("pt");
                expect(res.body.description).to.be.equals(prodDescLocaleEN);
                done();
            });
    });
});

// Test the Cache Mechanism.
describe("Cache Mechanism", () => {
    it("Should insert itens with ID '1', '2' and '3' and get item with ID '2'.", (done) => {
        cache.initialize();
        for (let i = 1; i <= 3; i++) {
            cache.put({id: i, description: "Item #" + i});
        }
        let item = cache.get({id: 2}, function(criteria, item) {
            return criteria.id === item.id;
        });
        expect(item).to.be.a("object");
        expect(item.id).to.be.equals(2);
        expect(item.description).to.be.equals("Item #2");
        done();
    });

    it("Should insert itens with ID '1', '2' and '3' and get item with ID '4'.", (done) => {
        cache.initialize();
        for (let i = 1; i <= 3; i++) {
            cache.put({id: i, description: "Item #" + i});
        }
        let item = cache.get({id: 4}, function(criteria, item) {
            return criteria.id === item.id;
        });
        expect(item).to.not.exist;
        done();
    });

    it("Should configure 'lifetime' to 10 ms, insert itens with ID '1', '2' and '3'" +
        " and, 20 ms after, get item with ID '2'.", (done) => {
        cache.initialize({lifetime: 10});
        for (let i = 1; i <= 3; i++) {
            cache.put({id: i, description: "Item #" + i});
        }
        setTimeout(function() {
            let item = cache.get({id: 2}, function(criteria, item) {
                return criteria.id === item.id;
            });
            expect(item).to.not.exist;
            done();
        }, 20);

    });

    it("Should configure 'capacity' to 10 and 'cleaningThreshold' to 3, insert itens with ID '1', ..., '11'" +
        " and get item with ID '2'.", (done) => {
        cache.initialize({capacity: 10, cleaningThreshold: 3});
        for (let i = 1; i <= 11; i++) {
            cache.put({id: i, description: "Item #" + i});
        }
        let item = cache.get({id: 2}, function(criteria, item) {
            return criteria.id === item.id;
        });
        expect(item).to.not.exist;
        done();
    })
});