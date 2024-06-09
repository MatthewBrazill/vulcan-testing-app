package main

import (
	"fmt"
	"os"

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
		log := logrus.WithFields(logrus.Fields{
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

		log.Info(fmt.Sprintf("god-manager accessed %s", ctx.Request.URL.Path))
	})

	// Gods
	app.POST("/create", CreateGod)
	app.POST("/get", GetGod)
	app.POST("/search", SearchGod)
	app.POST("/update", UpdateGod)
	app.POST("/delete", DeleteGod)

	return app
}
