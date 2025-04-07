package admin

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"prorickey/nctsa/database"
)

func GetUsers(context *gin.Context) {
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)
	
	// Get search query parameter (empty string if not provided)
	searchTerm := context.Query("search")

	users, err := database.GetUsers(conn, searchTerm)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve users"})
		return
	}

	// Limit the number of results returned for performance when searching
	if searchTerm != "" && len(users) > 20 {
		users = users[:20]
	}

	context.JSON(http.StatusOK, users)
}

func GetSchools(context *gin.Context) {
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)
	
	// Get search query parameter (empty string if not provided)
	searchTerm := context.Query("search")

	schools, err := database.GetSchools(conn, searchTerm)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve schools"})
		return
	}

	// Limit the number of results returned for performance when searching
	if searchTerm != "" && len(schools) > 20 {
		schools = schools[:20]
	}

	context.JSON(http.StatusOK, schools)
}

func GetSearchEvents(context *gin.Context) {
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)
	
	// Get search query parameter (empty string if not provided)
	searchTerm := context.Query("search")
	events, err := database.GetAllEvents(conn, searchTerm)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve events"})
		return
	}

	// Limit the number of results returned for performance when searching
	if searchTerm != "" && len(events) > 20 {
		events = events[:20]
	}

	context.JSON(http.StatusOK, events)
}