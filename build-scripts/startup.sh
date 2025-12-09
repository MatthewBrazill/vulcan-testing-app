#!/bin/bash
#
# Startup script that runs the necessary code to build and start the application
# for each of the needed services.

{
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
            echo "failed to install git" >&2
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

    echo "DD_GIT_COMMIT_SHA=$DD_GIT_COMMIT_SHA\nDD_GIT_REPOSITORY_URL=$DD_GIT_REPOSITORY_URL" > /vulcan/git-config.env

    echo "starting service $DD_SERVICE..."
    case $DD_SERVICE in
        "vulcan")
            # Minify JS Files
            echo "minifying js maps..."
            curl -s -o /closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
            for jsFile in /vulcan/services/frontend/javascript/*.js; do
                echo "minifying $(basename $jsFile)"
                java -jar /closure-compiler.jar \
                --js $jsFile \
                --js_output_file /vulcan/services/frontend/statics/js/$(basename $jsFile .js).min.js \
                --create_source_map /vulcan/services/frontend/statics/js/$(basename $jsFile .js).min.js.map \
                --source_map_include_content true
            done
            echo "done minifying js maps"

            # Upload Maps to Datadog
            if which datadog-ci >/dev/null ; then
                echo "uploading js maps to datadog..."
                datadog-ci sourcemaps upload services/frontend/statics/js --service vulcan-app --release-version $FRONTEND_VERSION --minified-path-prefix /js/
                echo "done uploading js maps"
            else
                echo "missing datadog ci tool; skipping js map upload"
            fi

            keytool -import -noprompt -alias user-manager-cert -cacerts -file /vulcan/services/user-manager/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias god-manager-cert -cacerts -file /vulcan/services/god-manager/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias authenticator-cert -cacerts -file /vulcan/services/authenticator/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias delphi-cert -cacerts -file /vulcan/services/delphi/certificate/cert.pem -storepass changeit
            cp /opt/java/openjdk/lib/security/cacerts /vulcan/services/vulcan/cacert
            echo "configured certificates"
            echo "installing datadog tracer..."
            curl -fLSS -o /vulcan/services/vulcan/dd-java-agent.jar https://dtdg.co/latest-java-tracer
            echo "installing packages..."
            mvn install -q
            echo "done"
            exit 0
            ;;

        "god-manager")
            go mod download && go mod verify
            echo "verified go.mod"
            GOPROXY=direct go install github.com/DataDog/orchestrion@latest
            echo "installed orchestrion"
            echo "building application..."
            orchestrion go build -o ./build/god-manager -tags appsec ./god-manager/...
            echo "done"
            exit 0
            ;;

        "user-manager")
            echo "installing packages..."
            npm config set update-notifier false
            npm install . > /dev/null
            echo "done"
            exit 0
            ;;

        "authenticator")
            echo "installing datadog tracer..."
            pip3 install ddtrace --quiet --root-user-action=ignore --upgrade
            echo "installing requirements..."
            pip3 install -r requirements.txt --quiet --root-user-action=ignore --upgrade
            echo "done"
            ddtrace-run python3 ./authenticator/main.py
            ;;

        "vulcan-proxy")
            cp -a /vulcan/services/vulcan-proxy/. /etc/nginx/
            cp -a /vulcan/services/vulcan/certificate/. /certificate/
            echo "configured certificates"
            echo "installing modules..."
            wget -nc -nv -O -q /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.6.2/ngx_http_datadog_module-appsec-arm64-1.28.0.so.tgz
            tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
            nginx -g "daemon off;"
            ;;

        "scribe")
            echo "installing packages..."
            npm config set update-notifier false
            npm install . > /dev/null
            echo "done"
            exit 0
            ;;

        "delphi")
            echo "installing datadog tracer..."
            pip3 install ddtrace --quiet --root-user-action=ignore --upgrade
            echo "installing requirements..."
            pip3 uninstall kafka --quiet --root-user-action=ignore
            pip3 uninstall kafka-python --quiet --root-user-action=ignore
            pip3 install -r requirements.txt --quiet --root-user-action=ignore --upgrade
            echo "done"
            ddtrace-run python3 ./delphi/main.py
            ;;
    esac
    echo "looks like something went wrong" >&2
} &> >(sed "s/^/$(date +%s%N | cut -b1-13) info: /")
exit 1