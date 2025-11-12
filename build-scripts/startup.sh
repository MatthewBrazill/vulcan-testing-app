#! bin/sh
#
# Startup script that runs the nececary code to build and start the application
# for each of the needed services.

# add date and log level to each line of stdout and stderr
exec > >(trap "" INT TERM; sed "s/^/$(date +%s%N | cut -b1-13) info: /")
exec 2> >(trap "" INT TERM; sed "s/^/$(date +%s%N | cut -b1-13) error: /" >&2)

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

echo "starting service $DD_SERVICE..."
case $DD_SERVICE in
    "vulcan")
        keytool -import -noprompt -alias user-manager-cert -cacerts -file /vulcan/services/user-manager/certificate/cert.pem -storepass changeit
        keytool -import -noprompt -alias god-manager-cert -cacerts -file /vulcan/services/god-manager/certificate/cert.pem -storepass changeit
        keytool -import -noprompt -alias authenticator-cert -cacerts -file /vulcan/services/authenticator/certificate/cert.pem -storepass changeit
        keytool -import -noprompt -alias delphi-cert -cacerts -file /vulcan/services/delphi/certificate/cert.pem -storepass changeit
        cp /opt/java/openjdk/lib/security/cacerts /vulcan/services/vulcan/cacert
        wget -nc -nv -O /vulcan/services/vulcan/dd-java-agent.jar https://dtdg.co/latest-java-tracer
        mvn install -q
        echo "done"
        exit 0
        ;;

    "god-manager")
        go mod download && go mod verify
        echo "verified go.mod"
        GOPROXY=direct go install github.com/DataDog/orchestrion@latest
        echo "installed orchestrion"
        orchestrion go build -o ./build/god-manager -tags appsec ./god-manager/...
        echo "done"
        exit 0
        ;;

    "user-manager")
        npm config set update-notifier false
        npm install . > /dev/null
        npm start
        ;;

    "authenticator")
        apk update
        apk add build-base
        pip3 install -r requirements.txt
        ddtrace-run python3 ./authenticator/main.py
        ;;

    "vulcan-proxy")
        cp -a /vulcan/services/vulcan-proxy/. /etc/nginx/
        cp -a /vulcan/services/vulcan/certificate/. /certificate/
        wget -nc -nv -O /usr/nginx-datadog-module.so.tgz https://github.com/DataDog/nginx-datadog/releases/download/v1.6.2/ngx_http_datadog_module-appsec-arm64-1.28.0.so.tgz
        tar -xzf /usr/nginx-datadog-module.so.tgz -C /usr/lib/nginx/modules
        nginx -g "daemon off;"
        ;;

    "scribe")
        npm config set update-notifier false
        npm install . > /dev/null
        npm start
        ;;

    "delphi")
        apk update
        apk add build-base
        pip3 install -r requirements.txt
        ddtrace-run python3 ./delphi/main.py
        ;;
esac
echo "looks like something went wrong" >&2
exit 1