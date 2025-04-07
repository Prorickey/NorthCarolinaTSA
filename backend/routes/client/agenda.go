package client

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetAgenda returns all published agenda items (general agenda)
func GetAgenda(context *gin.Context) {
	agenda, err := database.GetAgendaCache()

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve cache"})
		return
	}

	for i, item := range agenda {
		agenda[i] = item
	}

	deviceHeader := context.GetHeader("Device")

	published := make([]database.Agenda, 0)
	for _, item := range agenda {
		if item.Published {
			if deviceHeader != "ios" {
				item.Date = item.Date.Add(4 * time.Hour)
			} else {
				item.Date = item.Date.Add(-24 * time.Hour)
			}
			published = append(published, item)
		}
	}

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	userIdobj, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userId := userIdobj.(string)

	// Get the user's personal event agendas
	userEventAgenda, err := database.RetrieveUserAgenda(conn, userId)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user event agenda"})
		log.Printf("Error retrieving user event agenda: %v", err)
		return
	}

	var fixedUserEventAgenda []database.Agenda
	for _, item := range userEventAgenda {
		if deviceHeader != "ios" {
			item.Date = item.Date.Add(4 * time.Hour)
		} else {
			item.Date = item.Date.Add(-24 * time.Hour)
		}
		fixedUserEventAgenda = append(fixedUserEventAgenda, item)
	}

	fullAgenda := append(published, fixedUserEventAgenda...)

	// Sort fullAgenda by date
	sort.Slice(fullAgenda, func(i, j int) bool {
		return fullAgenda[i].Date.Before(fullAgenda[j].Date)
	})

	context.JSON(http.StatusOK, fullAgenda)
}

// GetUserAgendaEvents returns the list of events that the user has added to their personal agenda
func GetUserAgendaEvents(context *gin.Context) {
	// Get the user ID from the context
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	log.Printf("User ID: %v", userID)

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	// Get the user's personal event agendas
	events, err := database.RetrieveUserAgendaEvents(conn, userID.(string))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user event agenda"})
		log.Printf("Error retrieving user event agenda: %v", err)
		return
	}

	context.JSON(http.StatusOK, events)
}

// AddEventToUserAgenda adds an event to the user's personal agenda
func PostAddEventToUserAgenda(context *gin.Context) {
	// Get the user ID from the context
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse the request body
	var requestBody struct {
		EventID string `json:"eventId" binding:"required"`
	}

	if err := context.BindJSON(&requestBody); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding request: %v", err)
		return
	}

	// Validate UUID
	_, err := uuid.Parse(requestBody.EventID)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID format"})
		return
	}

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	// Check if the event exists
	exists_event := database.EventExists(conn, requestBody.EventID)
	if !exists_event {
		context.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	// Add the event to the user's agenda
	err = database.AddEventToAgenda(conn, userID.(string), requestBody.EventID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add event to user agenda"})
		log.Printf("Error adding event to user agenda: %v", err)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Event added to personal agenda"})
}

// RemoveEventFromUserAgenda removes an event from the user's personal agenda
func DeleteRemoveEventFromUserAgenda(context *gin.Context) {
	// Get the user ID from the context
	userID, exists := context.Get("user_id")
	if !exists {
		context.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get the event ID from the URL parameter
	eventID := context.Param("id")
	if eventID == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Event ID is required"})
		return
	}

	// Validate UUID
	_, err := uuid.Parse(eventID)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID format"})
		return
	}

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	// Remove the event from the user's agenda
	err = database.RemoveEventFromAgenda(conn, userID.(string), eventID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove event from user agenda"})
		log.Printf("Error removing event from user agenda: %v", err)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Event removed from personal agenda"})
}