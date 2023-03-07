package main

import (
	"fmt"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func Authorize(ctx *gin.Context) string {
	sess := sessions.Default(ctx)
	userId := sess.Get("userId")
	
	var result bson.M
	err := db.Collection("users").FindOne(ctx.Request.Context(), bson.M{"userId": userId}).Decode(&result)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return "no_auth"
		} else {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return "error"
		}
	}

	return fmt.Sprint(result["permissions"])
}

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
			"service":  service,
			"version":  version,
			"env":      env,
		},
	})
}