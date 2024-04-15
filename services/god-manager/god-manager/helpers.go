package main

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func Log(ctx *gin.Context) *logrus.Entry {
	span, _ := tracer.SpanFromContext(ctx.Request.Context())
	return logrus.WithFields(logrus.Fields{
		"dd": logrus.Fields{
			"service":  service,
			"version":  version,
			"env":      env,
			"trace_id": fmt.Sprint(span.Context().TraceID()),
			"span_id":  fmt.Sprint(span.Context().SpanID()),
		},
	})
}

func LogInitEvent() *logrus.Entry {
	return logrus.WithFields(logrus.Fields{
		"dd": logrus.Fields{
			"service": service,
			"version": version,
			"env":     env,
		},
	})
}
