const {
  getPool
} = require('./database');

exports.handler = async (event) => {

  console.log(
    'Business Lambda invoked'
  );

  try {

    const pool =
      await getPool();

    const result =
      await pool.query(
        `
        SELECT
          NOW() AS current_time,
          current_database() AS database_name
        `
      );

    const row =
      result.rows[0];

    return {
      statusCode: 200,

      headers: {
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        message:
          'Successfully connected to PostgreSQL',

        databaseTime:
          row.current_time,

        databaseName:
          row.database_name
      })
    };

  } catch (error) {

    console.error(
      'Database error:',
      error
    );

    return {
      statusCode: 500,

      headers: {
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        message:
          'Database connection failed',

        error:
          error.message
      })
    };
  }
};