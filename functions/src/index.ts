import * as functions from 'firebase-functions';
// import * as firebase from 'firebase-admin';
import * as Knex from 'knex'

const connect = () => {
  // Configure which instance and what database user to connect with.
  // Remember - storing secrets in plaintext is potentially unsafe. Consider using
  // something like https://cloud.google.com/kms/ to help keep secrets secret.
    const config: Knex.PgConnectionConfig = {
    user: functions.config().database.user,
    password: functions.config().database.password,
    database: functions.config().database.database,
    host: `/cloudsql/${functions.config().database.host}`
  };
    
  // Establish a connection to the database
  const knexClient = Knex({
    client: 'pg',
    connection: config,
  });

  // [START cloud_sql_postgres_knex_limit]
  // 'max' limits the total number of concurrent connections this pool will keep. Ideal
  // values for this setting are highly variable on app design, infrastructure, and database.
  knexClient.client.pool.max = 5;
  // 'min' is the minimum number of idle connections Knex maintains in the pool.
  // Additional connections will be established to meet this value unless the pool is full.
  knexClient.client.pool.min = 5;
  // [END cloud_sql_postgres_knex_limit]
  // [START cloud_sql_postgres_knex_timeout]
  // 'acquireTimeoutMillis' is the maximum number of milliseconds to wait for a connection checkout.
  // Any attempt to retrieve a connection from this pool that exceeds the set limit will throw an
  // SQLException.
  knexClient.client.pool.createTimeoutMillis = 30000; // 30 seconds
  // 'idleTimeoutMillis' is the maximum amount of time a connection can sit in the pool. Connections that
  // sit idle for this many milliseconds are retried if idleTimeoutMillis is exceeded.
  knexClient.client.pool.idleTimeoutMillis = 600000; // 10 minutes
  // [END cloud_sql_postgres_knex_timeout]
  // [START cloud_sql_postgres_knex_backoff]
  // 'createRetryIntervalMillis' is how long to idle after failed connection creation before trying again
  knexClient.client.pool.createRetryIntervalMillis = 200; // 0.2 seconds
  // [END cloud_sql_postgres_knex_backoff]
  // [START cloud_sql_postgres_knex_lifetime]
  // 'acquireTimeoutMillis' is the maximum possible lifetime of a connection in the pool. Connections that
  // live longer than this many milliseconds will be closed and reestablished between uses. This
  // value should be several minutes shorter than the database's timeout value to avoid unexpected
  // terminations.
  knexClient.client.pool.acquireTimeoutMillis = 600000; // 10 minutes
  // [START cloud_sql_postgres_knex_lifetime]
  return knexClient;
};

const knex = connect();

/**
 * Insert a vote record into the database.
 *
 * @param {object} knexParam The Knex connection object.
 * @param {object} vote The vote record to insert.
 * @returns {Promise}
 */
const insertVote = async (knexParam: Knex, uid: string) => {
  try {
      return await knexParam('users').insert({ uid: uid } );
  } catch (err) {
    throw Error(err);
  }
};

export const registerHook = functions.auth.user().onCreate(async (user, context) => {
    await insertVote(knex, user.uid).catch((err: Error) => {
        // firebase.auth().deleteUser(user.uid)
        console.log(err)
    })
})