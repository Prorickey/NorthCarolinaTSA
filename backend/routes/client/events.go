package client

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"

	"github.com/gin-gonic/gin"
)

// GetAgenda returns all published agenda items (general agenda)
func GetEvents(context *gin.Context) {
	events, err := database.GetEventCache()

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve cache"})
		return
	}

	for i, item := range events {
		//item.Semifinalists = []string{"Trevor Bedson", "Joshua", "Aaditya"} // Ensure this is initialized to avoid nil pointer issues, if needed
		events[i] = item
	}

	context.JSON(http.StatusOK, events)
}

func GetEventSchedules(context *gin.Context) {
	// Get the event ID from the URL parameter
	eventID := context.Param("id")
	if eventID == "" {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Event ID is required"})
		return
	}

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	rows, err := conn.Query("SELECT id, title, description, date, endtime, location, published, icon, createdAt FROM agenda WHERE eventid = $1", eventID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve event schedules"})
		return
	}

	agendas := make([]database.Agenda, 0)
	for rows.Next() {
		var agenda database.Agenda
		err := rows.Scan(&agenda.ID, &agenda.Title, &agenda.Description, &agenda.Date, &agenda.EndTime, &agenda.Location, &agenda.Published, &agenda.Icon, &agenda.CreatedAt)
		if err != nil {
			log.Printf("Error scanning agenda: %v", err)
			return
		}
		agendas = append(agendas, agenda)
	}

	context.JSON(http.StatusOK, agendas)
}