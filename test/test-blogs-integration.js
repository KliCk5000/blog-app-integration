"use strict"

const chai = require("chai");
const chaiHttp = require("chai-http");
const faker = require("faker");
const mongoose = require("mongoose");

const expect = chai.expect;

const { BlogPost } = require("../models");
const { runServer, app, closeServer } = require("../server");
const { TEST_DATABASE_URL } = require("../config");

chai.use(chaiHttp);

// use faker library to seed random documents in test DB
function seedBlogData() {
  console.info("Seeding blog data");
  const seedData = [];

  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogData());
  }

  // Return a promise
  return BlogPost.insertMany(seedData);
}

// Generate fake data
function generateBlogData() {
  return {
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(2)
  }
}

// delete the database afterEach test is ran
function tearDownDb() {
  console.warn("Deleting test database");
  return mongoose.connection.dropDatabase();
}

describe("BlogPost API resource", function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe("GET endpoint", function() {
    it("should return all existing blog posts", function() {
      let res;
      return chai.request(app)
        .get("/posts")
        .then(function(_res) {
          res = _res;
          console.log(res.body[0]);
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });
  });

});