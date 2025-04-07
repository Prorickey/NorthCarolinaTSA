package routes

import (
	"database/sql"
	"log"
	"net/http"
	"prorickey/nctsa/auth"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type PostLoginData struct {
	UserID  int `json:"tsaId"`
	SchoolCode int `json:"schoolCode"`
}

func PostLogin(ctx *gin.Context) {
	var loginData PostLoginData
	err := ctx.ShouldBindBodyWithJSON(&loginData)
	if err != nil {
		type PostLoginDataLegacy struct {
			UserID  string `json:"tsaId"`
			SchoolCode string `json:"schoolCode"`
		}

		err = nil
		var legacyLoginData PostLoginDataLegacy
		err = ctx.ShouldBindBodyWithJSON(&legacyLoginData)
		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request (1)"})
			log.Printf("Error binding JSON: %v", err)
			return
		}

		tsaId, err := strconv.Atoi(legacyLoginData.UserID)
		schoolId, err := strconv.Atoi(legacyLoginData.SchoolCode)

		if err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request (2)"})
			log.Printf("Error binding JSON: %v", err)
			return
		}

		loginData = PostLoginData{
			UserID:     tsaId,
			SchoolCode: schoolId,
		}
	}

	// Check if the user exists in the database
	db, exists := ctx.Get("db")
	if !exists {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	var userID string
	err = conn.QueryRow("SELECT u.id FROM public.users u JOIN public.school s ON u.schoolId = s.id WHERE u.tsaId = $1 AND s.tsaid = $2", loginData.UserID, loginData.SchoolCode).Scan(&userID)
	if err != nil {
		log.Printf("Error querying user: %v", err)
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user credentials"})
		return
	}

	refreshToken, expiration, err := auth.CreateUserRefreshToken(conn, userID)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create refresh token"})
		log.Printf("Error creating refresh token: %v", err)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"refreshToken": refreshToken, "expiration": expiration, "userId": userID})
}

type PostTokenData struct {
	UserID string `json:"userId"`
	RefreshToken string `json:"refreshToken"`
}

func PostCreateShortToken(ctx *gin.Context) {
	var createTokenData PostTokenData
	err := ctx.BindJSON(&createTokenData)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding JSON: %v", err)
		return
	}

	db, exists := ctx.Get("db")
	if !exists {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	connSql := db.(*sql.DB)

	userId, err := auth.ValidateUserRefreshToken(connSql, createTokenData.RefreshToken)
	if userId == "" || err != nil || userId != createTokenData.UserID {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		log.Printf("Error validating refresh token: %v", err)
		log.Printf("userId: %v, createTokenData.UserID: %v", userId, createTokenData.UserID)
		return
	}

	rdb, exists := ctx.Get("rdb")
	if !exists {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Redis connection error"})
		return
	}

	conn := rdb.(*redis.Client)

	shortToken, expiration, err := auth.CreateUserToken(conn, userId)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create token"})
		log.Printf("Error creating token: %v", err)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"token": shortToken, "expiration": expiration})
}

func PostRefreshToken(ctx *gin.Context) {
	var createTokenData PostTokenData
	err := ctx.BindJSON(&createTokenData)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		log.Printf("Error binding JSON: %v", err)
		return
	}

	db, exists := ctx.Get("db")
	if !exists {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection error"})
		return
	}

	conn := db.(*sql.DB)

	userId, err := auth.ValidateUserRefreshToken(conn, createTokenData.RefreshToken)
	if userId == "" || err != nil || userId != createTokenData.UserID {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		log.Printf("Error validating refresh token: %v", err)
		log.Printf("userId: %v, createTokenData.UserID: %v", userId, createTokenData.UserID)
		return
	}

	refreshToken, expiration, err := auth.CreateUserRefreshToken(conn, userId)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create refresh token"})
		log.Printf("Error creating refresh token: %v", err)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"refreshToken": refreshToken, "expiration": expiration, "userId": userId})
}