package admin

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAgendaAdmin(context *gin.Context) {
	agenda, err := database.GetAgendaCache()
	for i, item := range agenda {
		agenda[i] = item
	}

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve cache"})
		return
	}

	context.JSON(http.StatusOK, agenda)
}

func PostAgenda(context *gin.Context) {
	var agenda database.Agenda
	err := context.BindJSON(&agenda)
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
	err = conn.QueryRow(`INSERT INTO "agenda" (title, description, date, endTime, location, published, icon) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, createdAt`,
		agenda.Title, agenda.Description, agenda.Date, agenda.EndTime,
		agenda.Location, agenda.Published, agenda.Icon).Scan(&uuid, &createdAt)
		
	if err != nil {
		log.Printf("Error inserting agenda: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert agenda item"})
		return
	}

	agenda.ID = uuid
	agenda.CreatedAt = createdAt

	database.AddAgendaItemToCache(agenda)

	context.JSON(http.StatusOK, gin.H{"message": "Agenda posted", "agenda": agenda})
}

// UpdateAgenda updates an existing agenda item.
func UpdateAgenda(context *gin.Context) {
	id := context.Param("id")
	var agenda database.Agenda
	if err := context.BindJSON(&agenda); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	_, err := conn.Exec(`UPDATE "agenda" SET title=$1, description=$2, date=$3, endTime=$4, location=$5, icon=$6, published=$7 WHERE id=$8`,
		agenda.Title, agenda.Description, agenda.Date, agenda.EndTime,
		agenda.Location, agenda.Icon, agenda.Published, id)

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update agenda item"})
		return
	}

	database.UpdateAgendaItemInCache(agenda)

	context.JSON(http.StatusOK, gin.H{"message": "Agenda updated", "agenda": agenda})
}

// DeleteAgenda deletes an agenda item.
func DeleteAgenda(context *gin.Context) {
	id := context.Param("id")

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	_, err := conn.Exec(`DELETE FROM "agenda" WHERE id=$1`, id)
	if err != nil {
		log.Printf("Error deleting agenda: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete agenda item"})
		return
	}

	database.DeleteAgendaItemFromCache(id)

	context.JSON(http.StatusOK, gin.H{"message": "Agenda deleted"})
}