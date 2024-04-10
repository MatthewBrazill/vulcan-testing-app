#! bin/bash
#
# A startup script for each of the different sandbox envs available here!

if [ "$DD_ENV" == "kubernetes" ]
then
    rm -rf /vulcan
    git clone https://github.com/MatthewBrazill/vulcan-testing-app.git /vulcan
    
    cd /vulcan
    export VLCN_COMMIT_SHA=$(git rev-parse HEAD)
    
    if [ "$DD_SERVICE" == "vesuvius" ]
    then
        cd /vulcan/services/golang
    elif [ "$DD_SERVICE" = "etna" ]
    then
        cd /vulcan/services/node
    elif [ "$DD_SERVICE" = "krakatoa" ]
    then
        cd /vulcan/services/java
    elif [ "$DD_SERVICE" = "authenticator" ]
    then
        cd /vulcan/services/authenticator
    elif [ "$DD_SERVICE" = "vulcan-flutter" ]
    then
        cd /vulcan/services/flutter
    fi
fi

if [ "$DD_SERVICE" == "vesuvius" ]
then
    go mod download && go mod verify
    go build -o /usr/local/bin/vesuvius -tags appsec ./vesuvius/...
    vesuvius
elif [ "$DD_SERVICE" = "etna" ]
then
    npm install .
    npm start
elif [ "$DD_SERVICE" = "krakatoa" ]
then
    wget -nc -nv -O /vulcan/dd-java-agent.jar https://dtdg.co/latest-java-tracer
    mvn install
    java -javaagent:/vulcan/dd-java-agent.jar \
        -Dvulcan.session.key=2PbmuNW_uRkaf6Kux!ByK!yT!UmMZZ9B \
        -Ddd.env=$DD_ENV \
        -Ddd.service=$DD_SERVICE \
        -Ddd.version=$DD_VERSION \
        -Ddd.profiling.enabled=true \
        -Ddd.appsec.enabled=true \
        -Ddd.iast.enabled=true \
        -Ddd.dbm.propagation.mode=full \
        -Ddd.service.mapping=redis:session-store,postgresql:user-database,mongo:god-database \
        -Ddd.tags=git.commit.sha:$(git rev-parse HEAD),git.repository_url:github.com/MatthewBrazill/vulcan-testing-app \
        -jar ./target/krakatoa.jar
elif [ "$DD_SERVICE" = "authenticator" ]
then
    pip3 install -r requirements.txt
    ddtrace-run python3 ./authenticator/main.py
elif [ "$DD_SERVICE" = "vulcan-flutter" ]
then
    echo "Not yet implemented"
fi