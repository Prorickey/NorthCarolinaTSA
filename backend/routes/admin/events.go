package admin

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"
	"time"

	"github.com/gin-gonic/gin"
)

// GetEventsAdmin retrieves all events from cache
func GetEventsAdmin(context *gin.Context) {
	events, err := database.GetEventCache()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve events cache"})
		return
	}

	context.JSON(http.StatusOK, events)
}

// PostEvent creates a new event
func PostEvent(context *gin.Context) {
	var event database.Event
	err := context.BindJSON(&event)
	if err != nil {
		log.Printf("Error binding JSON: %v", err)
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	var uuid string
	var createdAt time.Time
	err = conn.QueryRow(`INSERT INTO "event" (name, location, "startTime", "endTime") VALUES ($1, $2, $3, $4) RETURNING id, createdAt`,
		event.Name, event.Location, event.StartTime, event.EndTime).Scan(&uuid, &createdAt)
		
	if err != nil {
		log.Printf("Error inserting event: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert event"})
		return
	}

	event.ID = uuid
	event.CreatedAt = createdAt

	database.AddEventToCache(event)

	context.JSON(http.StatusOK, gin.H{"message": "Event created", "event": event})
}

// UpdateEvent updates an existing event
func UpdateEvent(context *gin.Context) {
	id := context.Param("id")
	var event database.Event
	if err := context.BindJSON(&event); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	_, err := conn.Exec(`UPDATE "event" SET name=$1, location=$2, "startTime"=$3, "endTime"=$4 WHERE id=$5`,
		event.Name, event.Location, event.StartTime, event.EndTime, id)

	if err != nil {
		log.Printf("Error updating event: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	// Make sure to set the ID before updating the cache
	event.ID = id
	database.UpdateEventInCache(event)

	context.JSON(http.StatusOK, gin.H{"message": "Event updated", "event": event})
}

// DeleteEvent deletes an event
func DeleteEvent(context *gin.Context) {
	id := context.Param("id")

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	_, err := conn.Exec(`DELETE FROM "event" WHERE id=$1`, id)
	if err != nil {
		log.Printf("Error deleting event: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	database.DeleteEventFromCache(id)

	context.JSON(http.StatusOK, gin.H{"message": "Event deleted"})
}