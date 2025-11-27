use("admin")
db.createUser({
    "user": "vulcan-gods",
    "pwd": "96758wg54tbravp7",
    "roles": [
        { role: "readWrite", db: "vulcanGods" }
    ]
})

use("vulcanGods")
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