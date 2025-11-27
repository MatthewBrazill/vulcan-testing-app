#! bin/bash
#
# Deploy script for Vulcan App that starts the application in both kubernetes
# and docker. The script has a few options, specifically:
#   -d -- Deploys the application on Docker
#   -k -- Deploys the application on Kubernetes (uses default cluster)
#      `- Omitting both of these options will deploy on both Kubernetes
#         and Docker
#   -t -- Teardown any existing configs before deploying. Useful to makes
#         sure code changes are applied and theres a fresh start. Database
#         content is preserved.

teardown=0
application=0
monitoring=0
while getopts "tam" flag
do
    case $flag in
        "t") teardown=1;;
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

# Teardown Application
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
    export DD_GIT_COMMIT_SHA=$(git rev-parse HEAD)
    export DD_GIT_REPOSITORY_URL="https://github.com/MatthewBrazill/vulcan-testing-app"

    printf "  Docker...\n"
    docker compose pull && docker compose up -d --quiet-pull | sed "s/^/    /"
    printf "  Kubernetes...\n"
    kubectl apply -f deployment.yaml | grep -v --line-buffered ".*unchanged.*" | sed "s/^/    /"
    kubectl apply -f secrets.yaml | grep -v --line-buffered ".*unchanged.*" | sed "s/^/    /"

    printf "Finsihed deploying! You can now use the Vulcan App: https://localhost/login\n\n"
fi

# Teardown Monitoring
if [ "$monitoring" == 1 ] && [ "$teardown" == 1 ]; then
    printf "Monitoring Resources teardown...\n"

    printf "  Docker...\n"
    docker compose --file ./services/monitoring/docker-compose.yaml down | sed "s/^/    /"
    printf "  Kubernetes...\n"
    helm uninstall datadog-agent | sed "s/^/    /"

    printf "Done!\n"
fi

# Deploy Monitoring
if [ "$monitoring" == 1 ]; then
    printf "Deploying Monitoring Resources...\n"

    printf "  Docker...\n"
    docker compose pull && docker compose --file ./services/monitoring/docker-compose.yaml up -d --quiet-pull | sed "s/^/    /"
    printf "  Kubernetes...\n"
    helm install datadog-agent -f ./services/monitoring/datadog-agent/agent-values.yaml datadog/datadog | sed "s/^/    /"

    printf "Done!\n"
fi