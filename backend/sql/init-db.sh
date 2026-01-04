#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Run the SQL scripts
psql -U postgres << EOF
\i backend/sql/00-recreate-db.sql
\c chia_contracts
\i backend/sql/01-create-schema.sql
EOF

echo "Database initialized successfully!"
echo "Demo user created: username=demo1, password=welcome"
