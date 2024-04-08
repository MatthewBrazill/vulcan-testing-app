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
	result := make(map[string]interface{})

	span, c := tracer.StartSpanFromContext(ctx.Request.Context(), "vesuvius.authorize", tracer.ResourceName("Authorize"))
	defer span.Finish()

	if username == nil || username == "" {
		fmt.Print(ctx.GetHeader("Api-Key"))
		if apiKey, exists := ctx.Request.Header["Api-Key"]; exists {
			span.SetTag("auth_method", "api_key")
			err := pgdb.NewSelect().Table("apikeys").Where("? = ?", bun.Ident("apikey"), apiKey[0]).Scan(c, &result)
			if err != nil {
				if err.Error() == "sql: no rows in result set" {
					span.SetTag("auth", false)
					Log(ctx).WithField("key", apiKey).WithField("result", result).Warnf("No API key for value '%s'", apiKey)
					return "no_auth"
				}

				span.SetTag("auth", false)
				Log(ctx).WithError(err).Error(ctx.Error(err).Error())
				return "no_auth"
			}
		} else {
			span.SetTag("auth_method", "none")
			span.SetTag("auth", false)
			Log(ctx).Debug("No API key or user session attached.")
			return "no_auth"
		}
	} else {
		span.SetTag("auth_method", "session")
		err := pgdb.NewSelect().Table("users").Where("? = ?", bun.Ident("username"), username).Scan(c, &result)
		if err != nil {
			if err.Error() == "sql: no rows in result set" {
				span.SetTag("auth", false)
				Log(ctx).WithField("username", username).WithField("result", result).Warnf("No user for username '%s'", username)
				return "no_auth"
			}

			span.SetTag("auth", false)
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return "no_auth"
		}
	}

	span.SetTag("auth", true)
	return fmt.Sprint(result["permissions"])
}

func Validate(ctx *gin.Context, obj map[string]string, params [][2]string) bool {
	span, _ := tracer.StartSpanFromContext(ctx.Request.Context(), "vesuvius.validate", tracer.ResourceName("Validate"))
	defer span.Finish()

	for i := 0; i < len(params); i++ {
		regex, err := regexp.Compile(params[i][1])
		if err != nil {
			span.SetTag("valid", false)
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return false
		}

		if !regex.MatchString(obj[params[i][0]]) {
			span.SetTag("valid", false)
			Log(ctx).WithFields(logrus.Fields{
				"key":     params[i][0],
				"pattern": params[i][1],
				"value":   obj[params[i][0]],
			}).Debugf("Validation failed for '%s'", obj[params[i][0]])
			return false
		}
	}

	span.SetTag("valid", true)
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
