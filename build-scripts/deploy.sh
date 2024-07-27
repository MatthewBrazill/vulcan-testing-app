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

taredown=0
docker=0
kube=0
monitoring=0
while getopts "tdkm" flag
do
    case $flag in
        "t") taredown=1;;
        "d") docker=1;;
        "k") kube=1;;
        "m") monitoring=1;;
    esac
done

if [ $(basename ${PWD}) == "build-scripts" ]; then
    cd ..
fi

# Build JS Files and Maps
echo "Miniying JS maps..."

if which wget >/dev/null ; then
    wget -nc -nv -O build-scripts/closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
elif which curl >/dev/null ; then
    curl -s -o build-scripts/closure-compiler.jar https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/v20240317/closure-compiler-v20240317.jar
fi

for jsFile in services/frontend/javascript/*.js; do
    echo "  Minifying $(basename $jsFile)"
    java -jar build-scripts/closure-compiler.jar \
    --js $jsFile \
    --js_output_file services/frontend/statics/js/$(basename $jsFile .js).min.js \
    --create_source_map services/frontend/statics/js/$(basename $jsFile .js).min.js.map \
    --source_map_include_content true
done
echo "Done minifying JS maps!"

# Upload Maps to Datadog
if which datadog-ci >/dev/null ; then
    echo "Uploading JS Maps to Datadog..."
    datadog-ci sourcemaps upload services/frontend/statics/js --service vulcan-app --release-version 1.6 --minified-path-prefix /js/
    echo "Done uploading JS maps!"
else
    echo "Missing Datadog CI tool; skipping JS Map upload."
fi

# Taredown
if [ "$taredown" == 1 ]; then
    echo "Taredown..."
    if [ "$docker" == 0 ] && [ "$kube" == 0 ]; then
        echo "  Docker..."
        docker-compose down 2> /dev/null
        echo "  Kubernetes..."
        kubectl delete secret vulcan-secrets
        kubectl delete -f deployment.yaml 2> /dev/null
    elif [ "$docker" == 1 ]; then
        echo "  Docker..."
        docker-compose down 2> /dev/null
    elif [ "$kube" == 1 ]; then
        echo "  Kubernetes..."
        kubectl delete secret vulcan-secrets
        kubectl delete -f deployment.yaml 2> /dev/null
    fi
    echo "Finished taredown!"
fi

# Build
echo "Deploying..."
export SHA=$(git rev-parse HEAD)
if [ "$docker" == 0 ] && [ "$kube" == 0 ]; then
    echo "  Docker..."
    docker-compose --env-file ./secrets.env up -d 2> /dev/null
    echo "  Kubernetes..."
    kubectl create secret generic vulcan-secrets --from-env-file secrets.env
    kubectl apply -f deployment.yaml 2> /dev/null
elif [ "$docker" == 1 ]; then
    echo "  Docker..."
    docker-compose --env-file ./secrets.env up -d 2> /dev/null
elif [ "$kube" == 1 ]; then
    echo "  Kubernetes..."
    kubectl create secret generic vulcan-secrets --from-env-file secrets.env
    kubectl apply -f deployment.yaml 2> /dev/null
fi

# Monitoring
if [ "$monitoring" == 1 ]; then
    echo "Adding Monitoring Resources..."
    if [ "$docker" == 0 ] && [ "$kube" == 0 ]; then
        echo "  Docker..."
        docker-compose --env-file ./secrets.env --file ./services/monitoring/docker-compose.yaml up -d 2> /dev/null
        echo "  Kubernetes..."
    elif [ "$docker" == 1 ]; then
        echo "  Docker..."
        docker-compose --env-file ./secrets.env --file ./services/monitoring/docker-compose.yaml up -d 2> /dev/null
    elif [ "$kube" == 1 ]; then
        echo "  Kubernetes..."
    fi
    echo "Done!"
fi