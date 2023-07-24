package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aymerick/raymond"
	"github.com/gin-contrib/sessions"
	redisStore "github.com/gin-contrib/sessions/redis"
	"github.com/gin-gonic/gin"
	redigo "github.com/gomodule/redigo/redis"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"gitlab.com/go-box/ginraymond"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	sqltrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/database/sql"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	mongotrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/go.mongodb.org/mongo-driver/mongo"
	redigotrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gomodule/redigo"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gopkg.in/DataDog/dd-trace-go.v1/profiler"
)

// Global variables
var mongodb *mongo.Database
var pgdb *bun.DB
var mongoURL string
var postgresURL string
var redisURL string
var sessionKey string
var service string
var version string
var env string

func main() {
	// Change settings based on environment
	service = "vulcan-go"
	version = "1.1.0"
	env = os.Getenv("DD_ENV")
	if env == "docker" { // Dockerised
		mongoURL = "mongodb://god-database:27017/?connect=direct"
		postgresURL = "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@user-database:5432/vulcan_users"
		redisURL = "session-store:6379"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else if env == "kube" { // Kubernetes
		mongoURL = "mongodb://172.17.0.2:27017/?connect=direct"
		postgresURL = "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@172.17.0.2:5432/vulcan_users"
		redisURL = "172.17.0.2:6379"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else if env == "dev" { // Local
		mongoURL = "mongodb://localhost:27017/?connect=direct"
		postgresURL = "postgresql://vulcan:yKCstvg4-hrB9pmDPzu.gG.jxzhcCafT@localhost:5432/vulcan_users"
		redisURL = "localhost:6379"
		sessionKey = "ArcetMuxHCFXM4FZYoHPYuizo-*u!ba*"
	} else {
		LogInitEvent().Error("Environment is not recognized.")
		os.Exit(1)
	}

	// Create log file if not exist
	os.Mkdir("logs", 0755)
	file, err := os.OpenFile("logs/golang.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
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
		tracer.WithRuntimeMetrics(),
		tracer.WithGlobalTag("git.commit.sha", os.Getenv("VULCAN_COMMIT_SHA")),
		tracer.WithGlobalTag("git.repository_url", "https://github.com/MatthewBrazill/vulcan-testing-app"),
	)
	defer tracer.Stop()

	// Start the Profiler
	profiler.Start(
		profiler.WithEnv(env),
		profiler.WithService(service),
		profiler.WithVersion(version),
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
	app.SetTrustedProxies(nil)

	// Connect to god-database
	client, err := mongo.Connect(
		context.Background(),
		options.Client().SetMonitor(mongotrace.NewMonitor(mongotrace.WithServiceName("god-database"))).ApplyURI(mongoURL),
	)
	defer client.Disconnect(context.Background())
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to connect to god-database.")
		os.Exit(1)
	}
	mongodb = client.Database("vulcan")

	// Connect to user-database
	sqltrace.Register("bun", pgdriver.Driver{}, sqltrace.WithServiceName("user-database"))
	sqldb := sqltrace.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(postgresURL), pgdriver.WithInsecure(true)))
	pgdb = bun.NewDB(sqldb, pgdialect.New())

	// Set up sessions
	pool := &redigo.Pool{
		MaxIdle:   10,
		MaxActive: 12000,
		Dial: func() (redigo.Conn, error) {
			return redigotrace.DialContext(&gin.Context{}, "tcp", redisURL, redigotrace.WithServiceName("session-store"))
		},
	}
	store, err := redisStore.NewStoreWithPool(pool, []byte(sessionKey))
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to connect to session-store.")
		os.Exit(1)
	}
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		Secure:   true,
		HttpOnly: true,
	})
	app.Use(sessions.Sessions("vulcan-go", store))

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

	// Register pages and set raymond renderer
	app.HTMLRender = ginraymond.New(&ginraymond.RenderOptions{
		TemplateDir: "./services/frontend/pages",
	})
	partialsDir, err := os.ReadDir("./services/frontend/partials")
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to load template partials directory.")
		os.Exit(1)
	}
	for _, partial := range partialsDir {
		file, err := os.ReadFile(fmt.Sprintf("./services/frontend/partials/%s", partial.Name()))
		if err != nil {
			LogInitEvent().WithError(err).WithFields(logrus.Fields{
				"partialName": partial.Name(),
				"partialDir":  "./services/frontend/partials",
				"partialPath": fmt.Sprintf("./services/frontend/partials/%s", partial.Name()),
			}).Error(fmt.Sprintf("Failed to load template partial '%s'.", partial.Name()))
		} else {
			raymond.RegisterPartial(strings.Split(partial.Name(), ".")[0], string(file))
		}
	}

	// Add public folder
	app.Static("/css", "./statics/css")
	app.Static("/img", "./statics/img")
	app.Static("/js", "./js")

	// Root redirect to storage page
	app.GET("/", func(ctx *gin.Context) {
		ctx.Redirect(http.StatusMovedPermanently, "/storage")
	})

	// Login, signup, etc
	app.GET("/login", LoginPage)
	app.POST("/login", LoginAPI)
	app.GET("/logout", LogoutAPI)

	// Storage page
	app.GET("/storage", StoragePage)
	app.POST("/storage/search", StorageSearchAPI)

	// Add page
	app.GET("/add", AddGodPage)

	// Edit page
	app.GET("/edit", EditGodPage)

	// Gods
	app.POST("/gods/create", GodCreateAPI)
	app.POST("/gods/get", GodGetAPI)
	app.POST("/gods/update", GodUpdateAPI)
	app.POST("/gods/delete", GodDeleteAPI)

	// Error endpoint
	app.GET("/error", func(ctx *gin.Context) {
		time.Sleep(500000)
		Log(ctx).WithError(errors.New("deliberate error: error testing enpoint")).Error("Error from the error testing enpoint.")
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "This is a error testing endpoint. It will always return a 500 error.",
		})
	})

	// 404 page
	app.NoRoute(func(ctx *gin.Context) {
		gintrace.HTML(ctx, http.StatusNotFound, "error.html", gin.H{
			"Title":    "Not Found",
			"HttpCode": "404",
			"Message":  "There was an issue with the Server, please try again later.",
		})
	})

	LogInitEvent().Info("Starting Server")
	err = app.RunTLS(":443", "./cert/cert.pem", "./cert/key.pem")
	if err != nil {
		LogInitEvent().WithError(err).Error("Failed to start server.")
		os.Exit(1)
	}
}
