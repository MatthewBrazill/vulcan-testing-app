package main

import (
	"context"

	"github.com/sirupsen/logrus"
)

func Log(ctx context.Context) *logrus.Entry {
	return logrus.WithContext(ctx).WithFields(logrus.Fields{
		"service":  service,
		"version":  version,
		"env":      env,
	})
}