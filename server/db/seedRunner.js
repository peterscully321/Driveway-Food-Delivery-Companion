/**
 * MySQL Seed Runner Script for Driveway Food Ordering System
 * Executes schema.sql and seed.sql against any local or cloud MySQL instance (including Aiven).
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function sanitizeSqlForTargetDb(sqlText) {
  // Strip CREATE DATABASE and USE statements so it applies to the currently connected DB (e.g. defaultdb on Aiven)
  return sqlText
    .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+[^;]+;/gi, '-- [Skipped CREATE DATABASE for cloud DB]')
    .replace(/USE\s+[^;]+;/gi, '-- [Skipped USE database for cloud DB]');
}

async function runSeed() {
  const cliUri = process.argv[2];
  const databaseUrl = cliUri || process.env.DATABASE_URL;

  let connection;

  try {
    if (databaseUrl) {
      console.log('Connecting to Cloud MySQL database via connection string...');
      connection = await mysql.createConnection({
        uri: databaseUrl,
        multipleStatements: true,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      const host = process.env.DB_HOST || 'localhost';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD || '';
      const database = process.env.DB_NAME || 'driveway_db';
      const port = Number(process.env.DB_PORT) || 3306;
      const useSSL = process.env.DB_SSL === 'true';

      console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

      const config = {
        host,
        user,
        password,
        database,
        port,
        multipleStatements: true
      };

      if (useSSL) {
        config.ssl = { rejectUnauthorized: false };
      }

      connection = await mysql.createConnection(config);
    }

    console.log(' Connected to MySQL successfully!');

    console.log(' Executing schema.sql (creating tables, indexes & relations)...');
    let schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    schemaSql = sanitizeSqlForTargetDb(schemaSql);
    await connection.query(schemaSql);
    console.log(' Schema tables created successfully.');

    console.log(' Executing seed.sql (inserting categories, burgers, pizzas, coupons)...');
    let seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    seedSql = sanitizeSqlForTargetDb(seedSql);
    await connection.query(seedSql);
    console.log(' Seed data inserted successfully.');

    // Quick verification count
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM menu_items');
    console.log(`\n Database verification: ${rows[0].count} menu items ready!`);
    console.log(' Driveway MySQL Database is 100% initialized and live.\n');

    await connection.end();
  } catch (err) {
    console.error('\n Failed to run MySQL seed:', err.message);
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    process.exit(1);
  }
}

runSeed();
