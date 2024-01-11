USE vulcan_users;

CREATE USER datadog WITH password '5aae8c35f7e16245';
ALTER ROLE datadog INHERIT;


-- Set up the nececary schemas for Datadog
CREATE SCHEMA datadog;
GRANT USAGE ON SCHEMA datadog TO datadog;
GRANT USAGE ON SCHEMA public TO datadog;
GRANT pg_monitor TO datadog;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;


-- Create function to collect the explainplans
CREATE OR REPLACE FUNCTION datadog.explain_statement(
   l_query TEXT,
   OUT explain JSON
)
RETURNS SETOF JSON AS
$$
DECLARE
curs REFCURSOR;
plan JSON;

BEGIN
   OPEN curs FOR EXECUTE pg_catalog.concat('EXPLAIN (FORMAT JSON) ', l_query);
   FETCH curs INTO plan;
   CLOSE curs;
   RETURN QUERY SELECT plan;
END;
$$
LANGUAGE 'plpgsql'
RETURNS NULL ON NULL INPUT
SECURITY DEFINER;


-- Add the user and API key data to the database
CREATE TABLE users (
    username varchar(32),
    password varchar(64),
    permissions varchar(32)
);

CREATE TABLE apikeys (
    apikey char(32),
    permissions varchar(32)
);

INSERT INTO users VALUES ('matthew', 'testingpassword', 'admin');
INSERT INTO users VALUES ('synthetics', '3J^eZ%u[D+', 'user');

INSERT INTO apikeys VALUES ('f9fbde272f294dd3a2039e1f78f5262c', 'admin');