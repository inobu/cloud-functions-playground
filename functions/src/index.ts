import * as functions from 'firebase-functions/v1';
import { defineJsonSecret } from 'firebase-functions/params';
import { knex as createKnex, Knex } from 'knex';

const runtimeConfig = defineJsonSecret('RUNTIME_CONFIG');
let knexClient: Knex | undefined;

const connect = () => {
  const config = runtimeConfig.value().database as {
    user: string;
    password: string;
    database: string;
    host: string;
  };

  const client = createKnex({
    client: 'pg',
    connection: {
      user: config.user,
      password: config.password,
      database: config.database,
      host: `/cloudsql/${config.host}`,
    },
  });

  // [START cloud_sql_postgres_knex_limit]
  // 'max' limits the total number of concurrent connections this pool will keep. Ideal
  // values for this setting are highly variable on app design, infrastructure, and database.
  client.client.pool.max = 5;
  // 'min' is the minimum number of idle connections Knex maintains in the pool.
  // Additional connections will be established to meet this value unless the pool is full.
  client.client.pool.min = 5;
  // [END cloud_sql_postgres_knex_limit]
  // [START cloud_sql_postgres_knex_timeout]
  // 'acquireTimeoutMillis' is the maximum number of milliseconds to wait for a connection checkout.
  // Any attempt to retrieve a connection from this pool that exceeds the set limit will throw an
  // SQLException.
  client.client.pool.createTimeoutMillis = 30000; // 30 seconds
  // 'idleTimeoutMillis' is the maximum amount of time a connection can sit in the pool. Connections that
  // sit idle for this many milliseconds are retried if idleTimeoutMillis is exceeded.
  client.client.pool.idleTimeoutMillis = 600000; // 10 minutes
  // [END cloud_sql_postgres_knex_timeout]
  // [START cloud_sql_postgres_knex_backoff]
  // 'createRetryIntervalMillis' is how long to idle after failed connection creation before trying again
  client.client.pool.createRetryIntervalMillis = 200; // 0.2 seconds
  // [END cloud_sql_postgres_knex_backoff]
  // [START cloud_sql_postgres_knex_lifetime]
  // 'acquireTimeoutMillis' is the maximum possible lifetime of a connection in the pool. Connections that
  // live longer than this many milliseconds will be closed and reestablished between uses. This
  // value should be several minutes shorter than the database's timeout value to avoid unexpected
  // terminations.
  client.client.pool.acquireTimeoutMillis = 600000; // 10 minutes
  // [START cloud_sql_postgres_knex_lifetime]
  return client;
};

const getKnex = () => {
  if (!knexClient) {
    knexClient = connect();
  }
  return knexClient;
};

/**
 * Insert a vote record into the database.
 *
 * @param {object} knexParam The Knex connection object.
 * @param {string} uid The user ID to insert.
 * @returns {Promise}
 */
const insertVote = async (knexParam: Knex, uid: string) => {
  return knexParam('users').insert({ uid });
};

export const registerHook = functions
  .runWith({ secrets: [runtimeConfig] })
  .auth.user()
  .onCreate(async (user) => {
    await insertVote(getKnex(), user.uid).catch((err: Error) => {
      console.log(err);
    });
  });
