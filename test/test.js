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


chai.use(chaiHttp);

// Test the Locale Support.
// TODO: Enhance this test suite inserting into the DB the registers we are expecting to be into it and removing it at the end.
describe("Locale Support", () => {
    it("Should return the product with ID '2' and description in the locale 'pt'", (done) => {
        chai.request(server)
            .get('/product/2?locale=pt')
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals("2");
                expect(res.body.locale).to.be.equals("pt");
                expect(res.body.description).to.be.equals("A melhor forma de subires na vida de dealer.");
                done();
            });
    });

    it("Should return the product with ID '2' and description in the locale 'en'", (done) => {
        chai.request(server)
            .get('/product/2?locale=en')
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals("2");
                expect(res.body.locale).to.be.equals("en");
                expect(res.body.description).to.be.equals("A faster way to run from the cops and hit a lamp post.");
                done();
            });
    });

    it("Should return the product with ID '2' and description in the default locale ('en')", (done) => {
        chai.request(server)
            .get('/product/2')
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals("2");
                expect(res.body.locale).to.be.equals("en");
                expect(res.body.description).to.be.equals("A faster way to run from the cops and hit a lamp post.");
                done();
            });
    });

    it("Should return the product with ID '1' and description in the locale 'en' because does not exist the 'pt' version", (done) => {
        chai.request(server)
            .get('/product/1?locale=pt')
            .end((err, res) => {
                expect(err).to.not.exist;
                expect(res).to.be.a("object");
                expect(res.status).to.be.equals(200);
                expect(res.body).to.be.a("object");
                expect(res.body.id).to.be.equals("1");
                expect(res.body.locale).to.be.equals("pt");
                expect(res.body.description).to.be.equals("Guess what, you can make calls!");
                done();
            });
    });
});

// Test the Cache Mechanism.
describe("Cache Mechanism", () => {
    it("Should insert itens with ID '1', '2' and '3' and get item with ID '2'", (done) => {
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

    it("Should insert itens with ID '1', '2' and '3' and get item with ID '4'", (done) => {
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
        " and, 20 ms after, get item with ID '2'", (done) => {
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
        " and get item with ID '2'", (done) => {
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