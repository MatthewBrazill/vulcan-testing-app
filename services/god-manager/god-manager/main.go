package main

import (
	"context"
	"fmt"
	"os"

	"github.com/sirupsen/logrus"
	//dd_logrus "gopkg.in/DataDog/dd-trace-go.v1/contrib/sirupsen/logrus"
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

	// Define default context
	ctx := context.Background()

	// Create log file if not exist
	os.Mkdir("/logs", 0755)
	file, err := os.OpenFile("/logs/god-manager.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		Log(ctx).WithError(err).Error("failed to access log file")
		os.Exit(1)
	}

	// Configure logrus
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetLevel(logrus.TraceLevel)
	//logrus.AddHook(&dd_logrus.DDContextLogHook{})
	//logrus.SetOutput(file)

	// Get gin engine
	app := GetGinEngine(file)

	// Start server
	Log(ctx).Info("starting god-manager")
	certFile := fmt.Sprintf("%s/cert.pem", os.Getenv("CERT_FOLDER"))
	keyFile := fmt.Sprintf("%s/key.pem", os.Getenv("CERT_FOLDER"))
	err = app.RunTLS(":443", certFile, keyFile)
	if err != nil {
		Log(ctx).WithError(err).Error("failed to start god-manager")
		os.Exit(1)
	}
}
