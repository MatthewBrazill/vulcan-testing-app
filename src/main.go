package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/mongo/mongodriver"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	mongotrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/go.mongodb.org/mongo-driver/mongo"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

// Global variables
var log *logrus.Entry
var db *mongo.Database
var mongoURL string
var sessionKey string
var service string
var version string
var env string

func main() {
	// Change settings based on environment
	service = "vulcan-go"
	version = "0.2"
	env = os.Getenv("DD_ENV")
	if env == "prod" { // Production
		mongoURL = "mongodb://172.17.0.2:27017/?connect=direct"
		sessionKey = os.Getenv("VULCAN_SESSION_KEY")
	} else if env == "docker" { // Dockerised
		mongoURL = "mongodb://vulcan-database:27017/?connect=direct"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else if env == "kube" { // Kubernetes
		mongoURL = "mongodb://172.17.0.2:27017/?connect=direct"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else if env == "dev" { // Local
		mongoURL = "mongodb://localhost:27017/?connect=direct"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else {
		LogInitEvent().Error("Environment is not recognized.")
		os.Exit(1)
	}

	// Create log file if not exist
	os.Mkdir("logs", 0755)
	file, err := os.OpenFile("logs/log.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to access log file.")
		os.Exit(1)
	}

	// Initialize logging
	logrus.SetFormatter(&logrus.JSONFormatter{})
	logrus.SetOutput(file)

	// Start the tracer
	tracer.Start(
		tracer.WithEnv(env),
		tracer.WithService(service),
		tracer.WithServiceVersion(version),
		tracer.WithGlobalTag("git.commit.sha", os.Getenv("VULCAN_COMMIT_SHA")),
		tracer.WithGlobalTag("git.repository_url", "github.com/MatthewBrazill/vulcan-testing-app"),
		tracer.WithLogStartup(false),
	)
	defer tracer.Stop()

	// Start the Profiler
	profiler.Start(
		profiler.WithEnv(env),
		profiler.WithService(service),
		profiler.WithVersion(version),
		profiler.WithLogStartup(false),
		profiler.WithProfileTypes(
			profiler.CPUProfile,
			profiler.HeapProfile,
		),
	)
	defer profiler.Stop()

	// Gin settings
	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = file

	// Create new router
	app := gin.New()
	app.Use(gintrace.Middleware(service))
	app.Use(gin.Recovery())
	app.Use(gin.LoggerWithFormatter(
		func(params gin.LogFormatterParams) string {
			log := make(map[string]interface{})
			span, _ := tracer.SpanFromContext(params.Request.Context())

			log["message"] = fmt.Sprintf("Client accessed resource: %s", params.Path)
			log["time"] = params.TimeStamp.Format(time.RFC3339)
			log["client_ip"] = params.ClientIP
			log["path"] = params.Path
			log["method"] = params.Method
			log["status"] = params.StatusCode
			log["dd"] = map[string]string{
				"service":  service,
				"version":  version,
				"env":      env,
				"trace_id": fmt.Sprint(span.Context().TraceID()),
				"span_id":  fmt.Sprint(span.Context().SpanID()),
			}

			s, err := json.Marshal(log)
			if err != nil {
				LogInitEvent().WithError(err).Error("Failed to start gin logging.")
				os.Exit(1)
			}
			return string(s) + "\n"
		},
	))
	app.SetTrustedProxies(nil)

	// Connect to the database
	client, err := mongo.Connect(
		context.Background(),
		options.Client().SetMonitor(mongotrace.NewMonitor()).ApplyURI(mongoURL),
	)
	defer client.Disconnect(context.Background())
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to connect to database.")
		os.Exit(1)
	}
	db = client.Database("vulcan")

	// Set up sessions
	store := mongodriver.NewStore(db.Collection("sessions"), 0, true, []byte(sessionKey))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		Secure:   true,
		HttpOnly: true,
	})
	app.Use(sessions.Sessions("vulcan", store))

	// Register views
	app.LoadHTMLGlob("./templates/**/*")

	// Add public folder
	app.Static("/css", "./statics/css")
	app.Static("/img", "./statics/img")
	app.Static("/js", "./js")

	// Home page explainging what the webpage is for and how to use it
	app.GET("/", func(ctx *gin.Context) {
		ctx.Redirect(http.StatusMovedPermanently, "/home")
	})

	// Login, Signup, etc
	app.GET("/login", LoginPage)
	app.POST("/login", LoginAPI)
	app.GET("/logout", LogoutAPI)

	// Home
	app.GET("/home", HomePage)

	// Storage Page
	app.GET("/storage", StoragePage)
	app.POST("/storage/search", StorageSearchAPI)

	// Gods
	app.POST("/gods/create", GodCreateAPI)
	app.GET("/gods/get", GodGetAPI)
	app.POST("/gods/update", GodUpdateAPI)
	app.POST("/gods/delete", GodDeleteAPI)

	// Error endpoint
	app.GET("/error", func(ctx *gin.Context) {
		Log(ctx).WithError(errors.New("deliberate error: error testing enpoint")).Error("Error from the error testing enpoint.")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"HttpCode": "500",
			"Message": "This is a error testing endpoint. It will always return a 500 error.",
		})
	})

	// 404 Page
	app.NoRoute(func(ctx *gin.Context) {
		gintrace.HTML(ctx, http.StatusNotFound, "error", gin.H{
			"HttpCode": "404",
			"Message":  "There was an issue with the Server, please try again later.",
		})
	})

	err = app.RunTLS(":443", "./cert/cert.pem", "./cert/key.pem")
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to start server.")
		os.Exit(1)
	}
}
