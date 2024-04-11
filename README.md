# Vulcan Application

## Summary
This small application was originally used by me to learn golang, but has since expanded into a single repo containing several services, databases and backends for the same webapp - the `vulcan-testing-app`. This branch here is an archive of the state of the application on 11th of April 2024. The next steps oiin my plans with this application involve some pretty major changes to the structure, including code removal, and I wanted to avoid loosing all that was before. Specifically this includes the move to a "single" microserivce application instead of having a few services and the same backend replicated in 3 languages. There might still be small changes in the future such as bug fixes or comments and elaboration of the documnetation here, but no features.

The application is just a basic application that allows some CRUD actions for god's of several ancient pantheons (though this might change in the future). Written in several languages, the application is deliberatly overcomplicated to allow me to try out different languages, technologies, development concepts, as well as learn about systems archetecture in a environment that is familiar to me and I know inside out.

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
- Contianerisation with Kubernetes and Docker
- Microservices Archetecture
- Good Seciriuty Concepts:
    - Secure Password Handleing
    - Application Internal HTTPS
    - Input Sanitation

## Monitoring
All applications, services, and databases are also set up to be instrumented using Datadog to allow for in depth monitoring, troubleshooting and tracking using all of its features.

## Deployment Instructions
The entire application can be deployed to both Kubernetes and Docker in a single step!
