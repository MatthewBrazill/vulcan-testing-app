#!/bin/bash
#
# Startup script that runs the necessary code to build and start the application
# for each of the needed services.

{
    echo "running service $SERVICE on $ENV environment"
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

    cd /vulcan/services/$SERVICE

    echo "starting service $SERVICE..."
    case $SERVICE in
        "vulcan")
            # Minify JS Files
            echo "minifying js maps..."
            curl -s -o /vulcan/build-scripts/closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
            for jsFile in /vulcan/services/frontend/javascript/*.js; do
                echo "minifying $(basename $jsFile)"
                java -jar build-scripts/closure-compiler.jar \
                --js $jsFile \
                --js_output_file /vulcan/services/frontend/statics/js/$(basename $jsFile .js).min.js \
                --create_source_map /vulcan/services/frontend/statics/js/$(basename $jsFile .js).min.js.map \
                --source_map_include_content true
            done
            echo "done minifying JS maps"

            keytool -import -noprompt -alias user-manager-cert -cacerts -file /vulcan/services/user-manager/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias god-manager-cert -cacerts -file /vulcan/services/god-manager/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias authenticator-cert -cacerts -file /vulcan/services/authenticator/certificate/cert.pem -storepass changeit
            keytool -import -noprompt -alias delphi-cert -cacerts -file /vulcan/services/delphi/certificate/cert.pem -storepass changeit
            cp /opt/java/openjdk/lib/security/cacerts /vulcan/services/vulcan/cacert
            echo "configured certificates"
            echo "installing packages..."
            mvn install -q
            echo "done"
            exit 0
            ;;

        "god-manager")
            go mod download && go mod verify
            echo "verified go.mod"
            echo "building application..."
            go build -o ./build/god-manager ./god-manager/...
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
            echo "installing requirements..."
            pip3 install -r requirements.txt --quiet --root-user-action=ignore --upgrade
            echo "done"
            python3 ./authenticator/main.py
            ;;

        "vulcan-proxy")
            cp -a /vulcan/services/vulcan-proxy/. /etc/nginx/
            cp -a /vulcan/services/vulcan/certificate/. /certificate/
            echo "configured certificates"
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
            echo "installing requirements..."
            pip3 uninstall kafka --quiet --root-user-action=ignore
            pip3 uninstall kafka-python --quiet --root-user-action=ignore
            pip3 install -r requirements.txt --quiet --root-user-action=ignore --upgrade
            echo "done"
            python3 ./delphi/main.py
            ;;
    esac
    echo "looks like something went wrong" >&2
} &> >(sed "s/^/$(date +%s%N | cut -b1-13) info: /")
exit 1