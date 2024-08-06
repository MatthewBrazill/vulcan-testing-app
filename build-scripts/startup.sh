#! bin/sh
#
# Startup script that runs the nececary code to build and start the application
# for each of the needed services.

if [ $DD_ENV = "kubernetes" ]
then
    rm -rf /vulcan
    git clone https://github.com/MatthewBrazill/vulcan-testing-app.git /vulcan
    cd /vulcan/services/$DD_SERVICE
fi

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
            -Dlog4j2.configurationFile=/vulcan/src/log4j2.xml \
            -Dvulcan.session.key=2PbmuNW_uRkaf6Kux!ByK!yT!UmMZZ9B \
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
            --logging.config=/vulcan/src/log4j2.xml
        ;;

    "god-manager")
        go mod download && go mod verify
        go build -o /usr/local/bin/god-manager -tags appsec ./god-manager/...
        god-manager
        ;;

    "user-manager")
        npm install .
        npm start
        ;;

    "authenticator")
        pip3 install -r requirements.txt
        ddtrace-run python3 ./authenticator/main.py
        ;;

    "nginx-proxy")
        wget -nc -nv -O /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.1.0/nginx_1.25.4-alpine-arm64-ngx_http_datadog_module.so.tgz
        tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
        nginx -g "daemon off;"
        ;;

    "database-proxy")
        wget -nc -nv -O /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.1.0/nginx_1.25.4-alpine-arm64-ngx_http_datadog_module.so.tgz
        tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
        nginx -g "daemon off;"
        ;;

    "scribe")
        npm install .
        npm start
        ;;
esac