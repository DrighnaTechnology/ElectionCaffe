#!/bin/bash
set -e

# This script runs automatically when the PostgreSQL container starts for the
# first time. It creates the tenant database (heliumdb) alongside the core
# database (electioncaffe_core) that is created by POSTGRES_DB env var.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE heliumdb'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'heliumdb')\gexec

    GRANT ALL PRIVILEGES ON DATABASE heliumdb TO $POSTGRES_USER;
EOSQL

echo "Database initialization complete: electioncaffe_core + heliumdb created."
