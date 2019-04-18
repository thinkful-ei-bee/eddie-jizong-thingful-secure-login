'use strict';
/* global supertest*/
const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Protected endpoints', () => {
  let db;

  const {
    testUsers,
    testThings,
    testReviews,
  } = helpers.makeThingsFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  beforeEach('insert things', () => {
    return helpers.seedThingsTables(
      db,
      testUsers,
      testThings,
      testReviews
    );
  });

  const protectEndpoints = [
    {
      name: 'GET /api/things/:thing_id',
      path: '/api/things/1'
    },
    {
      name: 'GET /api/things/:thing_id/reviews',
      path: '/api/things/1/reviews'
    },
  ];

  protectEndpoints.forEach(endpoint => {
    describe(endpoint.name, () => {
      it('responds with 401 \'Missing basic token\' when no bearer token', () => {
        return supertest(app)
          .get(endpoint.path)
          .expect(401, { error: 'Missing bearer token' });
      });

      it('respond 401 \'Unauthorized request\' when invalid JWT secret', () => {
        const validUser = testUsers[0];
        const invalidSecret = 'bad-secret';
        return supertest(app)
          .get(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(validUser,invalidSecret))
          .expect(401, { error: 'Unauthorized request'});
      });

      it('responds 401 \'Unauthorized request\' invalid sub in payload', () => {
        const invalidUser = {user_name: 'user-not-exist', id: 1};
        return supertest(app)
          .get(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(invalidUser))
          .expect(401, { error: 'Unauthorized request' });
      });

    });
  });
});
