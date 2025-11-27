use("admin")
db.createUser({
    "user": "vulcan-notes",
    "pwd": "96758wg54tbravp7",
    "roles": [
        { role: "readWrite", db: "vulcanNotes" }
    ]
})

use("vulcanNotes")
db.userNotes.updateOne({
    'username': 'matthew'
}, {
    $addToSet: {
        'notes': 'This user is the owner of the application.'
    }
}, {
    'upsert': true
})
db.userNotes.updateOne({
    'username': 'synthetics'

}, {
    $addToSet: {
        'notes': 'This is a synthetic account.'

    }
}, {
    'upsert': true
})
db.userNotes.updateOne({
    'username': 'synthetics'

}, {
    $addToSet: {
        'notes': 'It is used only for automated testing.'
    }
}, {
    'upsert': true
})