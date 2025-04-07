package client

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetPing(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "pong"})
}