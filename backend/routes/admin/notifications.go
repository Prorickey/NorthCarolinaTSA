package admin

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/database"
	"prorickey/nctsa/notifications"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

func GetNotifications(context *gin.Context) {
	notifications, err := database.GetNotificationsCache()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Server failed to retrieve cache"})
		return
	}

	context.JSON(http.StatusOK, notifications)
}

func PostNotifications(context *gin.Context) {
	var notification database.Notification
	err := context.BindJSON(&notification)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding notification: %v", err)
		return
	}

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	err = nil
	if notification.Private {
		if len(notification.UserIDS) == 0 {
			context.JSON(http.StatusBadRequest, gin.H{"error": "User IDs are required for private notifications"})
			return
		}
		uids, err1 := convertStringsToUUIDs(notification.UserIDS)
		if err1 != nil {
			context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user IDs"})
			log.Printf("Error converting user IDs to UUIDs: %v", err)
			return
		}
		err = conn.QueryRow(`INSERT INTO "notifications" (title, description, date, published, private, type, userids) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, 
		notification.Title, notification.Description, notification.Date, notification.Published, notification.Private, notification.Type, pq.Array(uids)).Scan(&notification.ID)
	} else {
		err = conn.QueryRow(`INSERT INTO "notifications" (title, description, date, published) VALUES ($1, $2, $3, $4) RETURNING id`, 
		notification.Title, notification.Description, notification.Date, notification.Published).Scan(&notification.ID)
	}

	if err != nil {
		log.Printf("Error inserting notification: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert notification"})
		return
	}

	database.AddNotificationToCache(notification)

	if notification.Published {
		notifications.SendNotification(conn, notification)
	}

	context.JSON(http.StatusOK, gin.H{"message": "Notification posted", "notification": notification})
}

func convertStringsToUUIDs(strings []string) ([]uuid.UUID, error) {
    var uuids []uuid.UUID
    for _, str := range strings {
        uid, err := uuid.Parse(str)
        if err != nil {
            return nil, err
        }
        uuids = append(uuids, uid)
    }
    return uuids, nil
}

// UpdateNotification updates an existing notification.
func UpdateNotification(context *gin.Context) {
	id := context.Param("id")
	var notification database.Notification
	err1 := context.BindJSON(&notification)
	if err1 != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding notification: %v", err1)
		return
	}

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	notis, err2 := database.GetNotificationsCache()
	if err2 != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notifications from cache"})
		return
	}

	// Check if the notification exists in the cache
	previouslyPublished := false
	for _, notif := range notis {
		if notif.ID == id {
			previouslyPublished = notif.Published
			break
		}
	}

	conn := db.(*sql.DB)
	
	var err error
	if notification.Private {
		if len(notification.UserIDS) == 0 {
			context.JSON(http.StatusBadRequest, gin.H{"error": "User IDs are required for private notifications"})
			return
		}
		uids, err1 := convertStringsToUUIDs(notification.UserIDS)
		if err1 != nil {
			context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user IDs"})
			log.Printf("Error converting user IDs to UUIDs: %v", err1)
			return
		}
		_, err = conn.Exec(`UPDATE "notifications" SET title=$1, description=$2, date=$3, published=$4, private=$5, type=$6, userids=$7 WHERE id=$8`,
			notification.Title, notification.Description, notification.Date, notification.Published, 
			notification.Private, notification.Type, pq.Array(uids), id)
	} else {
		// For non-private notifications, set userids to NULL
		_, err = conn.Exec(`UPDATE "notifications" SET title=$1, description=$2, date=$3, published=$4, private=$5, type=$6, userids=NULL WHERE id=$7`,
			notification.Title, notification.Description, notification.Date, notification.Published, 
			notification.Private, notification.Type, id)
	}

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		log.Printf("Error updating notification: %v", err)
		return
	}

	database.UpdateNotificationInCache(notification)

	if notification.Published && !previouslyPublished {
		notifications.SendNotification(conn, notification)
	}

	context.JSON(http.StatusOK, gin.H{"message": "Notification updated", "notification": notification})
}

// DeleteNotification deletes an existing notification.
func DeleteNotification(context *gin.Context) {
	id := context.Param("id")

	db, exists := context.Get("db")
	if !exists {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	_, err := conn.Exec(`DELETE FROM "notifications" WHERE id=$1`, id)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		log.Printf("Error deleting notification: %v", err)
		return
	}

	database.DeleteNotificationFromCache(id)

	context.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}