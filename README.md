# Vulcan Application

## Summary
This small application was originally used by me to learn golang, but has since expanded into a single repo containing several services, databases and backends for the same webapp - the `vulcan-testing-app`.

The application is just a basic application that allows some CRUD actions for god's of several ancient pantheons (though this might change in the future). Written in several languages, the application is deliberately overcomplicated to allow me to try out different languages, technologies, development concepts, as well as learn about systems architecture in a environment that is familiar to me and I know inside out.

After several different approaches to managing the application, the current setup runs several services in Kubernetes, others in Docker and finally one of them (`user-manager`) in both environments. This lets me use a unified single application while still getting insights into use cases for Kubernetes, Docker and other setups.

## Technologies
The following isa non-exhaustive list of the technologies that have been used in this repository:
- Languages:
    - JavaScript
    - Golang
    - Python
    - Java
- Databases:
    - PostgreSQL
    - MongoDB
    - Redis
- Message Queues:
    - Kafka
- LLMs (Specifically OpenAI)
- Containerization with Kubernetes and Docker
- Microservices Architecture
- Application and System Monitoring using Datadog and OpenTelemetry
    - APM and Profiling on Every Service
    - Real User Monitoring
    - Synthetic Tests
    - Log Collection
    - LLM Observability
- Good Security Concepts:
    - Secure Password Handling - Including Salt and Pepper
    - Application Internal HTTPS
    - Input Sanitation
- Use of Security Tools
    - SAST/IAST
    - SCA

## Architecture Overview
| Service Name      | Kubernetes | Docker | Summary |
| ----------------- | - | - | --------------------- |
| Vulcan            | X |   | The main application backend |
| God-Manager       | X |   | The management service for the stored gods |
| User-Manager      | X |   | The management service for all user related things |
| Scribe            | X | X | The Notes management service handling user notes |
| Authenticator     | X |   | The authentication and authorization service |
| Application Proxy |   | X | NGINX Proxy for accessing the application |
| Delphi            | X |   | A python service to access the OpenAI API to perform LLM calls |
| Database Proxy    | X |   | Proxy for managing the connections from in the cluster to the databases |
| God-Database      |   | X | MongoDB database for the stored gods |
| User-Database     |   | X | PostgreSQL database to store users and passwords |
| Notes-Database    |   | X | MongoDB database to store the notes for each user |
| Notes-Queue       | X |   | Kafka queue for new user notes |
| Session-Store     | X |   | A redis database for session storage of the application |

## Monitoring
All applications, services, and databases are also set up to be instrumented using Datadog to allow for in depth monitoring, troubleshooting and tracking using all of its features.

To deploy the monitoring, ensure that the API and APP keys are properly set as described in the [Deployment Instructions](#deployment-instructions) and then run the Docker compose file located in the monitoring directory at `services/monitoring`. For kubernetes deploy the agent using the HELM chart provided by Datadog using the provided YAML files for the values.

To ensure that the Datadog Synthetics Private Location works, add the worker configs to the `datadog-synthetics` folder as `worker-config-kubernetes.json` and `worker-config-docker.json` respectively.

## Deployment Instructions
The entire application can be deployed in a single line using the deployment script in `build-scripts/deploy.sh`! However, to ensure that the correct API keys and secrets are used, first update the `secrets.yaml` and `services/monitoring/docker-compose.yaml` files in the project with the relevant values. This is how the secrets will be made available to the application. In that file you will need to add values for the following:

- `deployment.yaml`
    - `password-pepper`: The pepper used for the password hashing
    - `session-key`: The session key used for the vulcan applications sessions
    - `openai-api-key`: The API key for OpenAI for to use the Delphi Oracle function
    - `dd-api-key`: The API key for Datadog that is used for the Datadog agent
    - `dd-app-key`: The Datadog APP key also used for the agent
- `services/monitoring/docker-compose.yaml`
    - `dd-api-key`: The API key for Datadog that is used for the Datadog agent
    - `dd-app-key`: The Datadog APP key also used for the agent

After setting up the files, you then just need to run the deploy script in the `build-scripts` folder, which will automatically deploy all the necessary containers in Docker and on Kubernetes, as well as create source maps of frontend scripts and upload those to Datadog. Further details on the usage of that script is available at the top of the script file.