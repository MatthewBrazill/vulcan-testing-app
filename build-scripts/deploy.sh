#! bin/bash
#
# Deploy script for Vulcan App that starts the application in both kubernets
# and docker. The script has a few options, specifically:
#   -d -- Deploys the application on Docker
#   -k -- Deploys the application on Kubernetes (uses default cluster)
#      `- Ommitting both of these options will deploy on both Kubernetes
#         and Docker
#   -t -- Taredown any exitsing configs before deploying. Usefull to makes
#         sure code changes are applied and theres a fresh start. Database
#         content is preserved.

build=0
taredown=0
application=0
monitoring=0
while getopts "btam" flag
do
    case $flag in
        "b") build=1;;
        "t") taredown=1;;
        "a") application=1;;
        "m") monitoring=1;;
    esac
done

if [ $(basename ${PWD}) == "build-scripts" ]; then
    printf "Detected `build-scripts` directory; Going back to project top level directory...\n"
    cd ..
fi

if [ $(basename ${PWD}) != "vulcan-testing-app" ]; then
    printf "It looks like you're in the wrong folder. expected to be in `vulcan-testing-app`, detected `%s`.\n" $(basename ${PWD})
    printf "Please make sure you're in the correct folder and that it is correctly named."
    exit 1
fi

# Build JS Files and Maps
if [ "$build" == 1 ]; then
    printf "Miniying JS maps...\n"

    if which wget >/dev/null ; then
        wget -nc -nv -O build-scripts/closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
    elif which curl >/dev/null ; then
        curl -s -o build-scripts/closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
    fi

    for jsFile in services/frontend/javascript/*.js; do
        printf "  Minifying $(basename $jsFile)\n"
        java -jar build-scripts/closure-compiler.jar \
        --js $jsFile \
        --js_output_file services/frontend/statics/js/$(basename $jsFile .js).min.js \
        --create_source_map services/frontend/statics/js/$(basename $jsFile .js).min.js.map \
        --source_map_include_content true
    done
    printf "Done minifying JS maps!\n\n"

    # Upload Maps to Datadog
    if which datadog-ci >/dev/null ; then
        printf "Uploading JS Maps to Datadog...\n"
        datadog-ci sourcemaps upload services/frontend/statics/js --service vulcan-app --release-version 1.9 --minified-path-prefix /js/ | grep --line-buffered "^Uploading sourcemap*" | sed 's/^/  /'
        printf "Done uploading JS maps!\n\n"
    else
        printf "Missing Datadog CI tool; skipping JS Map upload.\n\n"
    fi
fi

# Taredown Application
if [ "$taredown" == 1 ]; then
    printf "Vulcan Application Taredown...\n"
    
    printf "  Docker...\n"
    docker-compose down 2> /dev/null
    printf "  Kubernetes...\n"
    kubectl delete -f deployment.yaml | grep -v --line-buffered "*unchanged*" | sed 's/^/    /'
        
    printf "Finished taredown!\n\n"
fi

# Deploy Application
if [ "$application" == 1 ]; then
    printf "Deploying Vulcan Application...\n"
    export DD_GIT_COMMIT_SHA=$(git rev-parse HEAD)
    export DD_GIT_REPOSITORY_URL="https://github.com/MatthewBrazill/vulcan-testing-app"
    
    printf "  Docker...\n"
    docker-compose --env-file ./secrets.env up -d 2> /dev/null
    printf "  Kubernetes...\n"
    kubectl apply -f deployment.yaml | grep -v --line-buffered "*unchanged*" | sed 's/^/    /'
        
    printf "Finsihed deploying! You can now use the Vulcan App: https://localhost/login\n\n"
fi

# Taredown Monitoring
if [ "$monitoring" == 1 && "$taredown" == 1 ]; then
    printf "Monitoring Resources Taredown...\n"

    printf "  Docker...\n"
    docker-compose --file ./services/monitoring/docker-compose.yaml down 2> /dev/null
    printf "  Kubernetes...\n"
    kubectl delete -f ./services/monitoring/secret.yaml
    helm uninstall datadog-agent datadog/datadog 2> /dev/null

    printf "Done!\n"
fi

# Deploy Monitoring
if [ "$monitoring" == 1 ]; then
    printf "Deploying Monitoring Resources...\n"

    printf "  Docker...\n"
    docker-compose --env-file ./secrets.env --file ./services/monitoring/docker-compose.yaml up -d 2> /dev/null
    printf "  Kubernetes...\n"
    kubectl apply -f ./services/monitoring/secrets.yaml | grep -v --line-buffered "*unchanged*" | sed 's/^/    /'
    helm install datadog-agent -f ./services/monitoring/datadog-agent/agent-values.yaml datadog/datadog 2> /dev/null

    printf "Done!\n"
fi