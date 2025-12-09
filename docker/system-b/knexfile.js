import 'dotenv/config';

export default {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'db-b',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'user',
      password: process.env.DB_PASSWORD || 'pass',
      database: process.env.DB_NAME || 'system_b'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      loadExtensions: ['.js', '.ts', '.tsx' , '.mjs'],
      esm: true
    }
  }
};
