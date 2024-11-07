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
    "user": "notes",
    "pwd": "96758wg54tbravp7",
    "roles": [
        { role: "readWrite", db: "notes" }
    ]
})

use("notes")
db.notes.updateOne({
    'username': 'matthew'
}, {
    $addToSet: {
        'notes': 'This user is the owner of the application.'
    }
}, {
    'upsert': true
})
db.notes.updateOne({
    'username': 'synthetics'

}, {
    $addToSet: {
        'notes': 'This is a synthetic account.'

    }
}, {
    'upsert': true
})
db.notes.updateOne({
    'username': 'synthetics'

}, {
    $addToSet: {
        'notes': 'It is used only for automated testing.'
    }
}, {
    'upsert': true
})