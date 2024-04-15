package main

import (
	"fmt"
	"os"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

func GetGinEngine(logFile *os.File) *gin.Engine {
	// Gin settings
	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = logFile

	// Create new router
	app := gin.New()
	app.Use(gintrace.Middleware(service))
	app.Use(gin.Recovery())
	app.SetTrustedProxies(nil)

	// Route logging
	app.Use(func(ctx *gin.Context) {
		ctx.Next()
		span, _ := tracer.SpanFromContext(ctx.Request.Context())
		sess := sessions.Default(ctx)
		log := logrus.WithFields(logrus.Fields{
			"client_ip": ctx.ClientIP(),
			"path":      ctx.Request.URL.Path,
			"method":    ctx.Request.Method,
			"status":    ctx.Writer.Status(),
			"dd": logrus.Fields{
				"service":  service,
				"version":  version,
				"env":      env,
				"trace_id": fmt.Sprint(span.Context().TraceID()),
				"span_id":  fmt.Sprint(span.Context().SpanID()),
			},
		})

		if sess.Get("userId") != "" {
			log = log.WithField("user_id", sess.Get("userId"))
		}

		log.Info(fmt.Sprintf("IP %s accessed: %s", ctx.ClientIP(), ctx.Request.URL.Path))
	})

	// Gods
	app.POST("/gods/create", GodCreateAPI)
	app.POST("/gods/get", GodGetAPI)
	app.POST("/gods/update", GodUpdateAPI)
	app.POST("/gods/delete", GodDeleteAPI)

	return app
}
