package client

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"

	"github.com/gin-gonic/gin"
)

func GetNotifications(context *gin.Context) {
	notifications, err := database.GetNotificationsCache()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve cache"})
		return
	}

	published := make([]database.Notification, 0)
	for _, item := range notifications {
		if item.Published {
			if item.Private {
				userID, exists := context.Get("user_id")
				if !exists {
					context.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
					return
				}
				userIDStr, ok := userID.(string)
				if !ok {
					context.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
					return
				}

				db, exists := context.Get("db")
				if !exists {
					context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
					return
				}
				conn := db.(*sql.DB)

				userEventAgenda, err := database.RetrieveUserAgenda(conn, userIDStr)
				if err != nil {
					context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user event agenda"})
					log.Printf("Error retrieving user event agenda (2): %v", err)
					return
				}

				authorized := false
				for _, id := range item.UserIDS {
					if id == userIDStr {
						authorized = true
						break
					}

					for _, agendaItem := range userEventAgenda {
						if agendaItem.EventId == id {
							authorized = true
							break
						}
					}
				}

				if !authorized {
					continue
				}

				item.UserIDS = nil // Remove user IDs from the response
			}

			published = append(published, item)
		}
	}

	context.JSON(http.StatusOK, published)
}