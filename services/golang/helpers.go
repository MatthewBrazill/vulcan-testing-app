package main

import (
	"fmt"
	"regexp"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func Authorize(ctx *gin.Context) string {
	sess := sessions.Default(ctx)
	username := sess.Get("username")

	if username == nil || username == "" {
		return "no_auth"
	}

	user := &Users{}
	err := pgdb.NewSelect().Model(user).Where("? = ?", bun.Ident("username"), username).Scan(ctx.Request.Context())
	if err != nil {
		fmt.Print(err.Error())
		if err.Error() == "sql: no rows in result set" {
			Log(ctx).Warnf("No user for username '%s'", username)
			return "no_auth"
		}

		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		return "error"
	}

	return user.Permissions
}

func Validate(ctx *gin.Context, obj map[string]string, params [][2]string) bool {
	for i := 0; i < len(params); i++ {
		regex, err := regexp.Compile(params[i][1])
		if err != nil {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return false
		}

		if !regex.MatchString(obj[params[i][0]]) {
			Log(ctx).WithFields(logrus.Fields{
				"key":     params[i][0],
				"pattern": params[i][1],
				"value":   obj[params[i][0]],
			}).Debugf("Validation failed for '%s'", obj[params[i][0]])
			return false
		}
	}
	return true
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
			"service": service,
			"version": version,
			"env":     env,
		},
	})
}
