#! bin/sh
#
# Startup script that runs the nececary code to build and start the application
# for each of the needed services.

echo "running service $DD_SERVICE on $DD_ENV environment"
cd /

if ! command -v git >/dev/null ; then
    echo "didn't find git installed; installing..."
    if command -v apk >/dev/null ; then
        apk update
        apk add git
    elif command -v apt >/dev/null ; then
        apt update
        apt install git -y
    elif command -v yum >/dev/null ; then
        yup update
        yup -y install git
    else
        echo "failed to install git"
        exit 1
    fi
fi

echo "pulling git repo..."
rm -rf /vulcan/* 2> /dev/null
rm -rf /vulcan/.* 2> /dev/null
git clone https://github.com/MatthewBrazill/vulcan-testing-app.git /vulcan

cd /vulcan/services/$DD_SERVICE

export DD_GIT_COMMIT_SHA=$(git rev-parse HEAD)
export DD_GIT_REPOSITORY_URL=$(git config --get remote.origin.url)

echo "starting service $DD_SERVICE..."
case $DD_SERVICE in
    "vulcan")
        keytool -import -noprompt -alias user-manager-cert -cacerts -file /vulcan/services/user-manager/certificate/cert.pem -storepass changeit
        keytool -import -noprompt -alias god-manager-cert -cacerts -file /vulcan/services/god-manager/certificate/cert.pem -storepass changeit
        keytool -import -noprompt -alias authenticator-cert -cacerts -file /vulcan/services/authenticator/certificate/cert.pem -storepass changeit
        wget -nc -nv -O /dd-java-agent.jar https://dtdg.co/latest-java-tracer
        mvn install
        java -javaagent:/dd-java-agent.jar \
            -Dlog4j2.configurationFile=/vulcan/services/vulcan/src/log4j2.xml \
            -Dvulcan.session.key=$VLCN_SESSION_KEY \
            -Ddd.trace.agent.url=$DD_TRACE_AGENT_URL \
            -Ddd.env=$DD_ENV \
            -Ddd.service=$DD_SERVICE \
            -Ddd.version=$DD_VERSION \
            -Ddd.profiling.enabled=true \
            -Ddd.logs.injection=true \
            -Ddd.appsec.enabled=true \
            -Ddd.iast.enabled=true \
            -Ddd.dbm.propagation.mode=full \
            -Ddd.trace.sampling.rules='[{"service":"vulcan","sample_rate":1}]' \
            -Ddd.service.mapping=redis:session-store,postgresql:user-database,mongo:god-database,kafka:notes-queue \
            -jar ./target/vulcan.jar \
            --logging.config=/vulcan/services/vulcan/src/log4j2.xml
        ;;

    "god-manager")
        go install github.com/DataDog/orchestrion@v0.9.0
        go mod download && go mod verify
        orchestrion go build -o ./build/god-manager -tags appsec ./god-manager/...
        echo "done"
        exit 0
        ;;

    "user-manager")
        npm install . > /dev/null
        npm start
        ;;

    "authenticator")
        pip3 install -r requirements.txt
        ddtrace-run python3 ./authenticator/main.py
        ;;

    "vulcan-proxy")
        cp -a /vulcan/services/vulcan-proxy/. /etc/nginx/
        cp -a /vulcan/services/vulcan/certificate/. /certificate/
        wget -nc -nv -O /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.1.0/nginx_1.25.4-alpine-arm64-ngx_http_datadog_module.so.tgz
        tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
        nginx -g "daemon off;"
        ;;

    "notes-queue")
        cp -rf /vulcan/services/message-queues/kafka/kafka.properties /etc/kafka/docker/server.properties
        echo "done"
        exit 0
        ;;

    "scribe")
        npm install . > /dev/null
        npm start
        ;;
esac
echo "looks like something went wrong"
exit 1