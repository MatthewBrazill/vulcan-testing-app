package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func Authenticate(ctx *gin.Context) string {
	sess := sessions.Default(ctx)
	authorized := sess.Get("authorized")
	permissions := sess.Get("permissions")

	span, c := tracer.StartSpanFromContext(ctx.Request.Context(), "vesuvius.helper", tracer.ResourceName("Authenticate"))
	defer span.Finish()

	if authorized != true {
		body := ""
		if apiKey, exists := ctx.Request.Header["Api-Key"]; exists {
			body = fmt.Sprintf(`{"apiKey":"%s"}`, apiKey[0])
		} else {
			userdata := make(map[string]string)
			ctx.ShouldBind(&userdata)
			body = fmt.Sprintf(`{"username":"%s","password":"%s"}`, userdata["username"], userdata["password"])
		}

		req, err := http.NewRequestWithContext(c, http.MethodPost, "http://authenticator:2448/auth", strings.NewReader(body))
		if err != nil {
			span.SetTag("authorized", false)
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return "none"
		}

		res, err := http.DefaultClient.Do(req)
		if err != nil {
			span.SetTag("authorized", false)
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			return "none"
		}

		if res.StatusCode == http.StatusOK {
			rawBody, err := io.ReadAll(res.Body)
			if err != nil {
				span.SetTag("authorized", false)
				Log(ctx).WithError(err).Error(ctx.Error(err).Error())
				return "none"
			}

			jsonBody := make(map[string]string)
			err = json.Unmarshal(rawBody, &jsonBody)
			if err != nil {
				span.SetTag("authorized", false)
				Log(ctx).WithError(err).Error(ctx.Error(err).Error())
				return "none"
			}

			span.SetTag("authorized", true)
			return jsonBody["permissions"]
		} else {
			Log(ctx).Debug("Session failed to authorize.")
			span.SetTag("authorized", false)
			return "none"
		}
	}

	span.SetTag("authorized", true)
	return fmt.Sprint(permissions)
}

func Validate(ctx *gin.Context, obj map[string]string, params [][2]string) bool {
	span, _ := tracer.StartSpanFromContext(ctx.Request.Context(), "vesuvius.helper", tracer.ResourceName("Validate"))
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
