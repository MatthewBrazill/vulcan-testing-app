use("admin")
db.createUser({
    "user": "datadog",
    "pwd": "5aae8c35f7e16245",
    "roles": [
        { role: "read", db: "admin" },
        { role: "read", db: "local" },
        { role: "readAnyDatabase", db: "admin" },
        { role: "clusterMonitor", db: "admin" }
    ]
})
db.createUser({
    "user": "vulcan",
    "pwd": "96758wg54tbravp7",
    "roles": [
        { role: "readWrite", db: "vulcan" }
    ]
})

use("vulcan")
db.gods.insertOne({
    "godId": "H62nd",
    "pantheon": "Roman",
    "name": "Justitia",
    "domain": "Justice and Morals",
})
db.gods.insertOne({
    "godId": "Zu72H",
    "pantheon": "Greek",
    "name": "Zeus",
    "domain": "Sky and Lightning",
})