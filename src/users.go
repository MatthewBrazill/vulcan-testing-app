package main

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

func LoginPage(ctx *gin.Context) {
	gintrace.HTML(ctx, http.StatusOK, "login", gin.H{
		"Title": "Login Page",
	})
}

func LoginAPI(ctx *gin.Context) {
	login := make(map[string]string)
	ctx.ShouldBind(&login)

	//TODO remove plaintext password storge, but for now: functionality > security

	var result bson.M
	err := db.Collection("users").FindOne(ctx.Request.Context(), bson.M{"username": login["username"]}).Decode(&result)
	if err != nil {
		result = nil
		if err.Error() != "mongo: no documents in result" {
			Log(ctx).WithError(err).Error(ctx.Error(err).Error())
			ctx.JSON(http.StatusInternalServerError, gin.H{
				"message": "There was an issue with the Server, please try again later.",
			})
		}
	}

	if result != nil {
		if login["password"] == result["password"] {
			sess := sessions.Default(ctx)
			sess.Set("userId", result["userId"])
			sess.Save()

			ctx.JSON(http.StatusOK, gin.H{
				"message": "Successfully logged in.",
				"userId":  result["userId"],
			})
			return
		}
	}

	Log(ctx).WithField("username", login["username"]).Info("Failed login attempt.")
	ctx.JSON(http.StatusForbidden, gin.H{
		"message": "Your login details are incorrect.",
	})
}

func LogoutAPI(ctx *gin.Context) {
	sess := sessions.Default(ctx)
	sess.Clear()

	ctx.JSON(http.StatusOK, gin.H{
		"message": "Successfully logged out.",
	})
}
