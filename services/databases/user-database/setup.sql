CREATE DATABASE vulcan_users;
\c vulcan_users



-- Add the user and API key data to the database
CREATE TABLE users (
    username varchar(32),
    pwhash varchar(64),
    hasnotes boolean not null default 0,
    permissions varchar(32),
    PRIMARY KEY (username)
);

CREATE TABLE apikeys (
    apikey char(32),
    permissions varchar(32),
    PRIMARY KEY (apikey)
);

INSERT INTO users (username, pwhash, permissions) VALUES ('matthew', '$2b$14$iGWLWUUk22JJISIQcmxHI.stMRCGzbSNdo64B3m/Socz3F9ZeGe5i', 'admin'); -- Password is testingpassword
INSERT INTO users (username, pwhash, permissions) VALUES ('synthetics', '$2b$14$CFs4E2M8hALhNG6IRaQI0e4isN/.cUlWbbUxGOekwpsHVS5TaqEeW', 'admin'); -- Password is 3J^eZ%u[D+

INSERT INTO apikeys VALUES ('f9fbde272f294dd3a2039e1f78f5262c', 'admin');



-- Create users and permissions
CREATE USER datadog WITH password '5aae8c35f7e16245';
CREATE USER vulcan WITH password 'yKCstvg4hrB9pmDP';
ALTER ROLE datadog INHERIT;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vulcan;



-- Set up the necessary schemas for Datadog
CREATE SCHEMA datadog;
GRANT USAGE ON SCHEMA datadog TO datadog;
GRANT USAGE ON SCHEMA public TO datadog;
GRANT pg_monitor TO datadog;
GRANT SELECT ON ALL TABLES TO datadog;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;



-- Create function to collect the explain plans
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