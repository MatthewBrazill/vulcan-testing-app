use("admin")
db.createUser({
    "user": "datadog",
    "pwd": "5aae8c35f7e16245",
    "roles": [
        { role: "read", db: "admin" },
        { role: "read", db: "notes" },
        { role: "read", db: "local" },
        { role: "clusterMonitor", db: "admin" }
    ]
})

use("notes")
db.createUser({
    "user": "notes",
    "pwd": "96758wg54tbravp7",
    "roles": [
        { role: "readWrite", db: "notes" }
    ]
})