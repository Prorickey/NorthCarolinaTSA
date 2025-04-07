package main

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/auth"
	"prorickey/nctsa/database"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func UserAuthMiddleware(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        if tokenString == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

		userId, err := auth.ValidateUserToken(rdb, tokenString)
        if err != nil || userId == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            log.Printf("Error validating token: %v", err)
            return
        }

        c.Set("user_id", userId)
        c.Next()
    }
}

func ApiAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
        // Check if the user exists in the database
		db, exists := ctx.Get("db")
		if !exists {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
			return
		}

        conn := db.(*sql.DB)

        key := ctx.GetHeader("Authorization")
        if key == "" {
            ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            ctx.Abort()
            return
        }
		key = key[7:] // "Bearer tokenrighthere"
        _, ok := database.ValidateApiKey(conn, key)
		if !ok {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthenticated Client"})
			ctx.Abort()
			return
		}
	}
}