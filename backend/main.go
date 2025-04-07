package main

import (
	"log"
	"os"
	"prorickey/nctsa/database"
	"prorickey/nctsa/routes"
	"prorickey/nctsa/routes/admin"
	"prorickey/nctsa/routes/client"
	"time"

	"github.com/gin-contrib/cors"

	"github.com/gin-gonic/gin"

	_ "github.com/joho/godotenv/autoload"
)

const version = "0.7.13"

func main() {
	if os.Getenv("DEPLOY") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	rdb := database.CreateRedisConnection()

	// Postgresql database
	db := database.CreateConnection()

	db.SetMaxOpenConns(100) // TODO: Figure out what a good number is here
	db.SetConnMaxLifetime(5 * time.Minute)

	defer db.Close()

	database.StartCachingScheduler(db)

	router := gin.New()

	// CORS configuration
	// TODO: Set up cors the proper way
    config := cors.Config{
        AllowOrigins:     []string{"*"},
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        MaxAge: 12 * time.Hour,
    }

    // Use the CORS middleware with the configuration
    router.Use(cors.New(config))

	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(func(c *gin.Context) {
		// Attach the database connection to the context
		c.Set("db", db)
		c.Set("rdb", rdb)
		c.Next()
	})

	router.POST("/login", routes.PostLogin)
	router.POST("/token", routes.PostCreateShortToken)
	router.POST("/token/refresh", routes.PostRefreshToken)

	// ApiAuthMiddleware is a middleware that checks if the client is authorized
	// This is for the api within the backend. Used by the management dashboard.
	authorized := router.Group("/admin")
	authorized.Use(ApiAuthMiddleware()) 
	{
		authorized.GET("/agenda", admin.GetAgendaAdmin)
		authorized.POST("/agenda", admin.PostAgenda)
		authorized.PUT("/agenda/:id", admin.UpdateAgenda)
		authorized.DELETE("/agenda/:id", admin.DeleteAgenda)
		
		authorized.GET("/notifications", admin.GetNotifications)
		authorized.POST("/notifications", admin.PostNotifications)
		authorized.PUT("/notifications/:id", admin.UpdateNotification)
		authorized.DELETE("/notifications/:id", admin.DeleteNotification)

		authorized.GET("/events", admin.GetEventsAdmin)
		authorized.POST("/events", admin.PostEvent)
		authorized.PUT("/events/:id", admin.UpdateEvent)
		authorized.DELETE("/events/:id", admin.DeleteEvent)

		authorized.GET("/users", admin.GetUsers)
		authorized.GET("/schools", admin.GetSchools)
		authorized.GET("/s/events", admin.GetSearchEvents)
	}
	
	// UserAuthMiddleware is a middleware that checks if the user is authenticated
	// These are the endpoints used by the users of the app.
	user := router.Group("/user")
	user.Use(UserAuthMiddleware(rdb)) 
	{
		user.GET("/ping", client.GetPing)
		user.POST("/device", client.RegisterDevice)
		user.GET("/notifications", client.GetNotifications)
		
		user.GET("/agenda", client.GetAgenda)
		user.GET("/agenda/events", client.GetUserAgendaEvents)
		user.POST("/agenda/events", client.PostAddEventToUserAgenda)
		user.DELETE("/agenda/events/:id", client.DeleteRemoveEventFromUserAgenda)

		user.GET("/events", client.GetEvents)
		user.GET("/events/:id/schedules", client.GetEventSchedules) 
	}

	err := router.Run(":8080")
	if err != nil {
		log.Fatal(err)
		return
	}
}
