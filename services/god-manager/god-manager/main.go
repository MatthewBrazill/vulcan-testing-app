package main

import (
	"fmt"
	"os"

	"github.com/sirupsen/logrus"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

// Global variables
var service string
var version string
var env string

func main() {
	// Change settings based on environment
	service = os.Getenv("DD_SERVICE")
	version = os.Getenv("DD_VERSION")
	env = os.Getenv("DD_ENV")

	// Start the tracer
	tracer.Start(
		tracer.WithEnv(env),
		tracer.WithService(service),
		tracer.WithServiceVersion(version),
		tracer.WithRuntimeMetrics(),
		tracer.WithGlobalTag("git.commit.sha", os.Getenv("VLCN_COMMIT_SHA")),
		tracer.WithGlobalTag("git.repository_url", "https://github.com/MatthewBrazill/vulcan-testing-app"),
	)
	defer tracer.Stop()

	// Start the Profiler
	profiler.Start(
		profiler.WithEnv(env),
		profiler.WithService(service),
		profiler.WithVersion(version),
		profiler.WithProfileTypes(
			profiler.CPUProfile,
			profiler.HeapProfile,
			profiler.GoroutineProfile,
		),
	)
	defer profiler.Stop()

	// Create log file if not exist
	os.Mkdir("/logs", 0755)
	file, err := os.OpenFile("/logs/god-manager.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		LogInitEvent().WithError(err).Error("failed to access log file")
		os.Exit(1)
	}

	// Configure logrus
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetOutput(file)

	// Get gin engine
	app := GetGinEngine(file)

	// Start server
	LogInitEvent().Info("starting server")
	certFile := fmt.Sprintf("%s/cert.pem", os.Getenv("VLCN_CERT_FOLDER"))
	keyFile := fmt.Sprintf("%s/key.pem", os.Getenv("VLCN_CERT_FOLDER"))
	err = app.RunTLS(":443", certFile, keyFile)
	if err != nil {
		LogInitEvent().WithError(err).Error("failed to start server")
		os.Exit(1)
	}
}
