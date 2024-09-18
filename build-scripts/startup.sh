#! bin/sh
#
# Startup script that runs the nececary code to build and start the application
# for each of the needed services.

echo "running service $DD_SERVICE on $DD_ENV environment"

if which git >/dev/null ; then
    apt update
    apt install -y git
fi

echo "pulling git repo..."
rm -rf /vulcan/*
git clone https://github.com/MatthewBrazill/vulcan-testing-app.git /vulcan

cd /vulcan/services/$DD_SERVICE

export DD_GIT_COMMIT_SHA=$(git rev-parse HEAD)
export DD_GIT_REPOSITORY_URL=$(git config --get remote.origin.url)

echo "starting service $DD_SERVICE..."
case $DD_SERVICE in
    "vulcan")
        keytool -import -noprompt -alias user-manager-cert -keystore /cacerts/keystore.jks -file /cacerts/user-manager-cert.pem -storepass changeit
        keytool -import -noprompt -alias god-manager-cert -keystore /cacerts/keystore.jks -file /cacerts/god-manager-cert.pem -storepass changeit
        keytool -import -noprompt -alias authenticator-cert -keystore /cacerts/keystore.jks -file /cacerts/authenticator-cert.pem -storepass changeit
        wget -nc -nv -O /dd-java-agent.jar https://dtdg.co/latest-java-tracer
        mvn install
        java -javaagent:/dd-java-agent.jar \
            -Djavax.net.ssl.trustStore=/cacerts/keystore.jks \
            -Djavax.net.ssl.trustStorePassword=changeit \
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
        go install github.com/datadog/orchestrion@latest
        go mod download && go mod verify
        orchestrion go build -o ./build/god-manager -tags appsec ./god-manager/...
        ;;

    "user-manager")
        npm install .
        npm start
        ;;

    "authenticator")
        pip3 install -r requirements.txt
        ddtrace-run python3 ./authenticator/main.py
        ;;

    "vulcan-proxy")
        wget -nc -nv -O /etc/nginx/nginx.conf https://raw.githubusercontent.com/MatthewBrazill/vulcan-testing-app/main/services/vulcan-proxy/nginx.conf
        wget -nc -nv -O /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.1.0/nginx_1.25.4-alpine-arm64-ngx_http_datadog_module.so.tgz
        tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
        nginx -g "daemon off;"
        ;;

    "notes-queue")
        cp -rf /vulcan/services/message-queues/kafka/kafka.properties /etc/kafka/docker/server.properties
        #sh /etc/kafka/docker/run
        ;;

    "scribe")
        npm install .
        npm start
        ;;
esac
echo "done"