#! bin/bash
taredown=0
while getopts "t" flag
do
    case $flag in
        "t") taredown=1;;
    esac
done

# Taredown
if [ "$taredown" == 1 ]; then
    kubectl delete -f deployment.yaml
    docker-compose down
fi

# Build
export SHA=$(git rev-parse HEAD)
docker-compose up -d
kubectl apply -f deploymnet.yaml