USE vulcan_users;

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
