-- DEV ONLY - Drop and recreate database

DROP DATABASE IF EXISTS chia_contracts;
DROP USER IF EXISTS chia_user;

-- Create user
CREATE USER chia_user PASSWORD 'your_password';

-- Create database
CREATE DATABASE chia_contracts owner chia_user ENCODING = 'UTF-8';
