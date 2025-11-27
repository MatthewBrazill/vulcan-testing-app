CREATE DATABASE vulcan_users;
\c vulcan_users



-- Add the user and API key data to the database
CREATE TABLE users (
    username varchar(32),
    pwhash varchar(64),
    hasnotes boolean not null default false,
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
CREATE USER vulcan WITH password 'yKCstvg4hrB9pmDP';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vulcan;