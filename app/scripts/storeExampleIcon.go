package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"os"
)

func main() {
	dat, err := os.ReadFile("./exampleIcon.png")
	if err != nil {
		panic(err)
	}

	fmt.Println("Data size:", len(dat)) // Debugging output

	db := CreateConnection()
	defer db.Close()

	res, err := db.Exec("UPDATE agenda SET icon = $1 WHERE id = 20", string(dat))
	if err != nil {
		panic(err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		panic(err)
	}
	if rowsAffected == 0 {
		panic("No rows were updated! ID may not exist.")
	}
}

func CreateConnection() *sql.DB {
	user, _ := os.LookupEnv("DB_USER")
	password, _ := os.LookupEnv("DB_PASSWORD")
	host, _ := os.LookupEnv("DB_HOST")
	port, _ := os.LookupEnv("DB_PORT")
	dbname, _ := os.LookupEnv("DB_NAME")

	if val, set := os.LookupEnv("DEPLOYMENT"); set == false || val != "PROD" {
		user = "nctsa"
		password = "pass"
		host = "localhost"
		port = "5432"
		dbname = "nctsa"
	}

	db, err := sql.Open("postgres", "postgres://"+user+
		":"+password+
		"@"+host+":"+port+
		"/"+dbname+"?sslmode=disable")

	if err != nil {
		panic(err)
		return nil
	}

	return db
}
