package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

func HomePage(ctx *gin.Context) {
	perms := Authorize(ctx)
	switch perms {
	case "user", "admin":
		gintrace.HTML(ctx, http.StatusOK, "home", gin.H{
			"Title": "Home",
		})

	case "no_auth":
		ctx.Redirect(http.StatusFound, "/login")

	default:
		gintrace.HTML(ctx, http.StatusFound, "error", gin.H{
			"HttpCode": "404",
			"Message": "There was an issue with the Server, please try again later.",
		})
	}
}