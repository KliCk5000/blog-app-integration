"use strict";

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
  };
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

  // GET
  describe("GET endpoint", function() {
    // can you get them all
    it("should return all existing blog posts", function() {
      let res;
      return chai
        .request(app)
        .get("/posts")
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body).to.have.lengthOf(count);
        });
    });

    // do they all match?
    it("should return blog posts with right fields", function() {
      let resBlogPost;
      return (
        chai
          .request(app)
          .get("/posts")
          .then(function(res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.a("array");
            expect(res.body).to.have.lengthOf.at.least(1);

            res.body.forEach(function(post) {
              expect(post).to.be.a("object");
              expect(post).to.include.keys(
                "id",
                "author",
                "title",
                "content",
                "created"
              );
            });
            resBlogPost = res.body[0];
            return BlogPost.findById(resBlogPost.id);
          })
          // Compare an actual post to one in the DB
          .then(function(post) {
            expect(resBlogPost.id).to.equal(post.id);
            expect(resBlogPost.author).to.equal(post.authorName);
            expect(resBlogPost.title).to.equal(post.title);
            expect(resBlogPost.content).to.equal(post.content);
          })
      );
    });
  });

  describe("POST endpoint", function() {
    it("should add a new blog post", function() {
      const newBlogPost = generateBlogData();

      return chai
        .request(app)
        .post("/posts")
        .send(newBlogPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a("object");
          expect(res.body).to.include.keys(
            "id",
            "author",
            "title",
            "content",
            "created"
          );
          expect(res.body.id).to.not.be.null;
          expect(res.body.title).to.equal(newBlogPost.title);
          expect(res.body.content).to.equal(newBlogPost.content);
          return BlogPost.findById(res.body.id);
        })
        .then(function(blogPost) {
          expect(blogPost.title).to.equal(newBlogPost.title);
          expect(blogPost.content).to.equal(newBlogPost.content);
        });
    });
  });

  describe("PUT endpoint", function() {
    it("should update a blog post", function() {
      const updateData = {
        title: "How to dive with sharks",
        content: "Pray"
      };
      return BlogPost.findOne()
        .then(function(post) {
          updateData.id = post.id;

          return chai
            .request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(updateData.id);
        })
        .then(function(post) {
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
        });
    });
  });

  describe("DELETE endpoint", function() {
    it("should delete a blog post by id", function() {
      let blogPost;

      return BlogPost.findOne()
        .then(function(_blogPost) {
          blogPost = _blogPost;
          return chai.request(app).delete(`/posts/${blogPost.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(blogPost.id);
        })
        .then(function(_blogPost) {
          expect(_blogPost).to.be.null;
        });
    });
  });
});
