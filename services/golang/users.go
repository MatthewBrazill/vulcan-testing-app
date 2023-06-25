package main

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/uptrace/bun"

	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
)

type Users struct {
	bun.BaseModel `bun:"table:users,alias:users"`
	Username      string
	Password      string
	Permissions   string
}

func LoginPage(ctx *gin.Context) {
	sess := sessions.Default(ctx)
	sess.Clear()
	
	gintrace.HTML(ctx, http.StatusOK, "login.html", gin.H{
		"title": "Login Page",
	})
}

func LoginAPI(ctx *gin.Context) {
	login := make(map[string]string)
	ctx.ShouldBind(&login)
	if !Validate(ctx, login, [][2]string{{"username", "[a-zA-Z]{1,32}"}, {"password", ".{1,64}"}}) {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "There was an issue with your request.",
		})
		return
	}

	//TODO remove plaintext password storge, but for now: functionality > security

	user := &Users{}
	err := pgdb.NewSelect().Model(user).Where("? = ?", bun.Ident("username"), login["username"]).Scan(ctx.Request.Context())
	if err != nil {
		Log(ctx).WithError(err).Error(ctx.Error(err).Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "There was an issue with the Server, please try again later.",
		})
		return
	}

	if login["password"] == user.Password {
		sess := sessions.Default(ctx)
		sess.Set("username", user.Username)
		sess.Save()

		ctx.JSON(http.StatusOK, gin.H{
			"message": "Successfully logged in.",
		})
		return
	}

	Log(ctx).WithField("username", login["username"]).Warn("Failed login attempt due to incorrect password.")
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
