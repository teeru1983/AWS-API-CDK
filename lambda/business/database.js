const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require(
  '@aws-sdk/client-secrets-manager'
);

const {
  Pool
} = require('pg');

const secretsManager =
  new SecretsManagerClient({});

let pool = null;

async function getPool() {

  /*
   * Reuse pool in a warm
   * Lambda execution environment.
   */
  if (pool) {
    return pool;
  }

  const secretArn =
    process.env.DB_SECRET_ARN;

  if (!secretArn) {
    throw new Error(
      'DB_SECRET_ARN is not configured'
    );
  }

  const response =
    await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: secretArn
      })
    );

  if (!response.SecretString) {
    throw new Error(
      'Database secret has no SecretString'
    );
  }

  const secret =
    JSON.parse(
      response.SecretString
    );

  pool = new Pool({
    host:
      process.env.DB_ENDPOINT,

    port: 5432,

    database:
      secret.dbname || 'appdb',

    user:
      secret.username,

    password:
      secret.password,

    max: 2,

    idleTimeoutMillis: 5000,

    connectionTimeoutMillis: 5000,

    ssl: {
      rejectUnauthorized: false
    }
  });

  return pool;
}

module.exports = {
  getPool
};