package auth

import (
	"database/sql"
	"errors"
	"log"
	"os"
	"prorickey/nctsa/database"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type UserToken struct {
	ID          int       `json:"id"`
	UserID      string    `json:"userid"`
	TokenID     int       `json:"tokenid"`
	TokenSecret string    `json:"key"`
	CreatedAt   time.Time `json:"createdat"`
}

type ShortTokenClaims struct {
	UserID      string `json:"userid"`
	TokenSecret string `json:"tokensecret"`
	jwt.StandardClaims
}

type RefreshTokenClaims struct {
	UserID      string `json:"userid"`
	TokenID     int    `json:"tokenid"`
	TokenSecret string `json:"tokensecret"`
	jwt.StandardClaims
}

func CreateUserToken(rdb *redis.Client, userID string) (string, time.Time, error) {
	expiration := time.Now().Add(15 * time.Minute)

	key, err := uuid.NewV7()
	if err != nil {
		return "", time.Now(), err
	}

	database.StoreUserToken(rdb, userID, key.String())

	claims := &ShortTokenClaims{
		UserID:      userID,
		TokenSecret: key.String(),
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expiration.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	signedToken, err := token.SignedString([]byte(os.Getenv("JWT_SHORT_LIVED_SECRET")))
	return signedToken, expiration, err
}

func ValidateUserToken(redis *redis.Client, token string) (string, error) {
	var claims ShortTokenClaims
	tkn, err := jwt.ParseWithClaims(token, &claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SHORT_LIVED_SECRET")), nil
	})

	if err != nil {
		log.Printf("Error parsing token: %v", err)
		return "", err
	}

	if !tkn.Valid {
		log.Printf("Invalid token for supposed user %s (1)", claims.UserID)
		return "", nil
	}

	userId := database.RetrieveUser(redis, claims.TokenSecret)
	if userId == "" || claims.UserID != userId {
		log.Printf("Invalid token for supposed user %s (2)", claims.UserID)
		return "", nil
	}

	return claims.UserID, nil
}

func CreateUserRefreshToken(db *sql.DB, userID string) (string, time.Time, error) {
	expiration := time.Now().Add(24 * time.Hour)

	userTokenId, userTokenSecret, err := database.CreateRefreshToken(db, userID, expiration)
	if err != nil {
		return "", time.Now(), err
	}

	claims := &RefreshTokenClaims{
		UserID:      userID,
		TokenID:     userTokenId,
		TokenSecret: userTokenSecret,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expiration.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)
	signedToken, err := token.SignedString([]byte(os.Getenv("JWT_REFRESH_SECRET")))
	return signedToken, expiration, err
}

func ValidateUserRefreshToken(db *sql.DB, token string) (string, error) {
	var claims RefreshTokenClaims
	tkn, err := jwt.ParseWithClaims(token, &claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_REFRESH_SECRET")), nil
	})

	if err != nil {
		log.Printf("Error parsing token: %v", err)
		return "", err
	}

	if !tkn.Valid {
		log.Printf("Invalid token for supposed user %s (1)", claims.UserID)
		return "", nil
	}

	userId, err := database.RetrieveUserFromRefreshToken(db, claims.TokenID, claims.TokenSecret)
	if err != nil {
		log.Printf("Error retrieving user from refresh token: %v", err)
		return "", err
	}

	if claims.UserID != userId {
		log.Printf("Invalid token for supposed user %s (2)", claims.UserID)
		return "", errors.New("Invalid token")
	}

	return claims.UserID, nil
}