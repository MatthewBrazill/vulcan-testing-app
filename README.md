# Vulcan Application

## Summary
This small application was originally used by me to learn golang, but has since expanded into a single repo containing several services, databases and backends for the same webapp - the `vulcan-testing-app`.

The application is just a basic application that allows some CRUD actions for god's of several ancient pantheons (though this might change in the future). Written in several languages, the application is deliberately overcomplicated to allow me to try out different languages, technologies, development concepts, as well as learn about systems architecture in a environment that is familiar to me and I know inside out.

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
- Containerization with Kubernetes and Docker
- Microservices Architecture
- Application and System Monitoring using Datadog and OpenTelemetry
    - APM and Profiling on Every Service
    - Real User Monitoring
    - Log Collection
- Good Security Concepts:
    - Secure Password Handling - Including Salt and Pepper
    - Application Internal HTTPS
    - Input Sanitation

## Monitoring
All applications, services, and databases are also set up to be instrumented using Datadog to allow for in depth monitoring, troubleshooting and tracking using all of its features.

To deploy the monitoring, ensure that the API and APP keys are properly set as described in the [Deployment Instructions](#deployment-instructions) and then run the Docker compose file located in the monitoring directory at `services/monitoring`. For kubernetes deploy the agent using the HELM chart provided by Datadog using the provided YAML files for the values.

To ensure that the Datadog Synthetics Private Location works, add the worker configs to the `datadog-synthetics` folder as `worker-config-kubernetes.json` and `worker-config-docker.json` respectively.

## Deployment Instructions
The entire application can be deployed to both Kubernetes and Docker in two steps! First, set up an env file called `secrets.env` in the project root directory. This is where secrets will be stored. In that file you will need to add values for the following:

- DD_API_KEY: The API key for Datadog that is used for the Datadog agent
- DD_APP_KEY: The Datadog APP key also used for the agent
- SESSION_KEY: The session key used for the vulcan applications sessions
- PASSWORD_PEPPER: The pepper used for the password hashing

After setting up the `secrets.env` file, you then just need to run the deploy script in the `build-scripts` folder, which will automatically deploy all the necessary containers in Docker and on Kubernetes, as well as create source maps of frontend scripts and upload those to Datadog.