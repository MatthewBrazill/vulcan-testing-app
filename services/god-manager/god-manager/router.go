package main

import (
	"fmt"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func GetGinEngine(logFile *os.File) *gin.Engine {
	// Gin settings
	gin.SetMode(gin.ReleaseMode)
	//gin.DefaultWriter = logFile

	// Create new router
	app := gin.New()
	app.Use(gin.Recovery())
	app.SetTrustedProxies(nil)

	// Route logging
	app.Use(func(ctx *gin.Context) {
		ctx.Next()
		Log(ctx).WithFields(logrus.Fields{
			"path":      ctx.Request.URL.Path,
			"method":    ctx.Request.Method,
			"status":    ctx.Writer.Status(),
		}).Info(fmt.Sprintf("god-manager accessed %s", ctx.Request.URL.Path))
	})

	// Gods
	app.POST("/create", CreateGod)
	app.POST("/get", GetGod)
	app.POST("/search", SearchGod)
	app.POST("/update", UpdateGod)
	app.POST("/delete", DeleteGod)

	return app
}
