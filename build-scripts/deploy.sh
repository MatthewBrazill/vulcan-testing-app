#! bin/bash
#
# Deploy script for Vulcan App that starts the application in both kubernetes
# and docker. The script has a few options, specifically:
#   -a -- Deploys the application.
#   -t -- Teardown any existing configs before deploying. Useful to makes
#         sure code changes are applied and theres a fresh start. Database
#         content is preserved.

teardown=0
application=0
while getopts "ta" flag
do
    case $flag in
        "t") teardown=1;;
        "a") application=1;;
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

# Tare down Application
if [ "$teardown" == 1 ]; then
    printf "Vulcan Application teardown...\n"

    printf "  Docker...\n"
    docker compose down | sed "s/^/    /"
    printf "  Kubernetes...\n"
    kubectl delete -f deployment.yaml | sed "s/^/    /"

    printf "Finished teardown!\n\n"
fi

# Deploy Application
if [ "$application" == 1 ]; then
    printf "Deploying Vulcan Application...\n"

    printf "  Docker...\n"
    docker compose pull && docker compose up -d --quiet-pull | sed "s/^/    /"
    printf "  Kubernetes...\n"
    kubectl apply -f deployment.yaml | grep -v --line-buffered ".*unchanged.*" | sed "s/^/    /"
    kubectl apply -f secrets.yaml | grep -v --line-buffered ".*unchanged.*" | sed "s/^/    /"

    printf "Finsihed deploying! You can now use the Vulcan App: https://localhost/login\n\n"
fi