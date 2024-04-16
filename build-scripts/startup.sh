#! bin/sh
#
# A startup script for each of the different sandbox envs available here!

if [ $DD_ENV = "kubernetes" ]
then
    rm -rf /vulcan
    git clone https://github.com/MatthewBrazill/vulcan-testing-app.git /vulcan
    
    cd /vulcan
    export VLCN_COMMIT_SHA=$(git rev-parse HEAD)
    cd /vulcan/services/$DD_SERVICE
fi

case $DD_SERVICE in
    "vulcan")
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
            -jar ./target/vulcan.jar
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
esac