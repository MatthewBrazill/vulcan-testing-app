#! bin/bash
#
# A startup script for each of the different sandbox envs available here!

if [ "$DD_ENV" == "kubernetes" ]
then
    rm -rf /vulcan
    mkdir /vulcan
    cd /vulcan
    git init
    git clone -q https://github.com/MatthewBrazill/vulcan-testing-app.git
fi

export VULCAN_COMMIT_SHA=$(git rev-parse HEAD)

if [ "$DD_SERVICE" == "vulcan-go" ]
then
    go mod download && go mod verify
    go build -o /usr/local/bin/vulcan -tags appsec ./services/golang/...
    vulcan
elif [ "$DD_SERVICE" = "vulcan-js" ]
then
    npm install .
    node ./services/node/app.js
elif [ "$DD_SERVICE" = "vulcan-java" ]
then
    wget -nc -nv -O /usr/src/dd-java-agent.jar https://dtdg.co/latest-java-tracer
    mvn install
    java -javaagent:/usr/src/dd-java-agent.jar \
        -Dvulcan.session.key=2PbmuNW_uRkaf6Kux!ByK!yT!UmMZZ9B \
        -Ddd.env=${DD_ENV} \
        -Ddd.service=${DD_SERVICE} \
        -Ddd.version=${DD_VERSION} \
        -Ddd.profiling.enabled=true \
        -Ddd.appsec.enabled=true \
        -Ddd.iast.enabled=true \
        -Ddd.service.mapping=redis:session-store,postgresql:user-database,mongo:god-database \
        -Ddd.tags=git.commit.sha:$(git rev-parse HEAD),git.repository_url:github.com/MatthewBrazill/vulcan-testing-app -jar \
        ./target/vulcan.jar
elif [ "$DD_SERVICE" = "vulcan-py" ]
then
    echo "Not yet implemented"
elif [ "$DD_SERVICE" = "vulcan-flutter" ]
then
    echo "Not yet implemented"
fi