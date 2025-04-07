package database

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func CreateRedisConnection() *redis.Client {
	host := os.Getenv("REDIS_HOST")
	rdb := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:6379", host),
        Password: "", // no password set
        DB:       0,  // use default DB
    })

	return rdb
}

// RetrieveUser retrieves the user ID from the token
func RetrieveUser(rdb *redis.Client, token string) string {
	val, err := rdb.Get(ctx, fmt.Sprintf("TOKEN:%s", token)).Result()
	if err != nil {
		return ""
	}

	return val
}

// StoreUserToken stores the user ID with the token
func StoreUserToken(rdb *redis.Client, userId string, token string) {
	rdb.Set(ctx, fmt.Sprintf("TOKEN:%s", token), userId, 0)
}