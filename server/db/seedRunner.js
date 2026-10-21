/**
 * MySQL Seed Runner Script for Driveway Food Ordering System
 * Executes schema.sql and seed.sql against the configured MySQL server.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runSeed() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = process.env.DB_PORT || 3306;

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  try {
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      multipleStatements: true
    });

    console.log('Connected! Executing schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Executing seed.sql...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('Seed data inserted successfully.');

    await connection.end();
    console.log('MySQL Database initialization completed with 100% success!');
  } catch (err) {
    console.error('Failed to run MySQL seed:', err.message);
    process.exit(1);
  }
}

runSeed();
