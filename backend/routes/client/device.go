package client

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterDevice(context *gin.Context) {
	var requestBody struct {
		UserId string `json:"userId" binding:"required"`
		DeviceType string `json:"deviceType" binding:"required"`
		DeviceToken string `json:"token" binding:"required"`
	}

	if err := context.BindJSON(&requestBody); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding request: %v", err)
		return
	}

	// Get database connection
	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}
	conn := db.(*sql.DB)

	_, err := conn.Exec(`INSERT INTO public.devices (userId, deviceType, token) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, requestBody.UserId, requestBody.DeviceType, requestBody.DeviceToken)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register device"})
		log.Printf("Error registering device: %v", err)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Device registered successfully"})
}
