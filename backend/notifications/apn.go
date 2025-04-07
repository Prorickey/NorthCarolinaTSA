package notifications

import (
	"database/sql"
	"log"
	"os"

	"prorickey/nctsa/database"

	"github.com/sideshow/apns2"
	"github.com/sideshow/apns2/certificate"
	"github.com/sideshow/apns2/payload"
)

func SendNotification(db *sql.DB, noti database.Notification) {
    // Load the APNs certificate
    file := "./apn.p12"
    if os.Getenv("DEPLOY") == "release" {
        file = "/root/apn.p12" // Path to the certificate in the deployed environment
    }
    cert, err := certificate.FromP12File(file, os.Getenv("APN_PASS"))
    if err != nil {
        log.Fatalf("Cert Error: %v", err)
    }

    // Create the APNs client
    client := apns2.NewClient(cert).Production()

    // Create the notification payload
    p := payload.NewPayload().AlertTitle(noti.Title).AlertBody(noti.Description).Sound("default")
    p.MutableContent()
    p.Custom("notificationID", noti.ID)
    p.Custom("type", noti.Type)

    // Create the APNs notification
    notification := &apns2.Notification{
        Payload: p,
        Topic:   "com.northcarolinatsa.ios",
    }

    log.Printf("Notification: %+v", notification) // Log the notification for debugging purposes

    if noti.Private {
        // Send notification to each user ID
        for _, userID := range noti.UserIDS {
            log.Printf("Sending private notification to user ID: %s", userID) // Log the user ID being used
            tokens, err := database.GetDeviceToken(db, userID)
            if err != nil {
                log.Printf("Error retrieving device token for user %s: %v", userID, err)
                continue
            }
            for _, tok := range tokens {
                notification.DeviceToken = tok
                res, err := client.Push(notification)
                if err != nil {
                    log.Printf("Error sending notification to %s: %v", userID, err)
                } else {
                    log.Printf("Sent notification to %s: %v", userID, res)
                }
            }
        }
    } else {
        // Send notification to all devices (public notification)
        tokens, err := database.GetAllAppleDeviceTokens(db)
        log.Printf("Retrieved %d device tokens for public notification", len(tokens))
        log.Printf("Tokens : %v", tokens) // Log the tokens for debugging purposes
        if err != nil {
            log.Printf("Error retrieving device tokens: %v", err)
            return
        }

        for _, token := range tokens {
            log.Printf("Sending notification to token: %s", token) // Log the token being used
            notification.DeviceToken = token
            res, err := client.Push(notification)
            if err != nil {
                log.Printf("Error sending notification to %s: %v", token, err)
            } else {
                log.Printf("Sent notification to %s: %v", token, res)
            }
        }
    }
}