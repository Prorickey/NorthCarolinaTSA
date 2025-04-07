package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq" // Postgres driver
)

// CreateConnection creates a connection to the database
func CreateConnection() *sql.DB {
	user, _ := os.LookupEnv("DB_USER")
	password, _ := os.LookupEnv("DB_PASSWORD")
	host, _ := os.LookupEnv("DB_HOST")
	port, _ := os.LookupEnv("DB_PORT")
	dbname, _ := os.LookupEnv("DB_NAME")

	if val, set := os.LookupEnv("DEPLOY"); set == false || val != "release" {
		user = "nctsa"
		password = "pass"
		host = "localhost"
		port = "5432"
		dbname = "nctsa"
	}

	db, err := sql.Open("postgres", "postgres://"+user+":"+password+"@"+host+":"+port+"/"+dbname+"?sslmode=disable")

	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	initializeDatabase(db)

	return db
}

// initializeDatabase creates the database schema
func initializeDatabase(db *sql.DB) {
	deploy := os.Getenv("DEPLOY") == "release"
	var schema []byte
	var err error
	if deploy {
		schema, err = os.ReadFile("/root/schema.sql")
	} else {
		schema, err = os.ReadFile("./database/schema.sql")
	}

	if err != nil {
		log.Fatalf("Unable to read schema.sql: %v", err)
	}

	_, err = db.Exec(string(schema))
	if err != nil {
		log.Fatalf("Unable to execute schema.sql: %v", err)
	}

	log.Println("Database schema initialized")
}

func ValidateApiKey(db *sql.DB, key string) (ApiKey, bool) {
	var apiKey ApiKey
	err := db.QueryRow("SELECT * FROM api_keys WHERE key = $1", key).Scan(&apiKey.ID, &apiKey.Key, &apiKey.Purpose, &apiKey.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return ApiKey{}, false
		}
		log.Printf("Error querying api key: %v", err)
		return ApiKey{}, false
	}

	return apiKey, true
}

func CreateRefreshToken(db *sql.DB, userID string, expiration time.Time) (int, string, error) {
	var userTokenId int
	var userTokenSecret string
	err := db.QueryRow("INSERT INTO user_tokens (userid, expires) VALUES ($1, $2) RETURNING id, \"key\"", userID, expiration).Scan(&userTokenId, &userTokenSecret)
	if err != nil {
		return -1, "", err
	}

	return userTokenId, userTokenSecret, nil
}

func RetrieveUserFromRefreshToken(db *sql.DB, tokenId int, tokenSecret string) (string, error) {
	var userID string
	err := db.QueryRow("SELECT userid FROM user_tokens WHERE id = $1 AND \"key\" = $2", tokenId, tokenSecret).Scan(&userID)
	if err != nil {
		return "", err
	}

	return userID, nil
}

func RetrieveUserAgenda(db *sql.DB, userID string) ([]Agenda, error) {
	rows, err := db.Query(`
        SELECT a.id, a.title, a.description, a.date, a.location, a.published, a.eventId
        FROM public.agenda a
        JOIN public.user_agenda ua ON a.eventId = ua.eventId
        WHERE ua.userId = $1 AND a.eventId IS NOT NULL AND a.published = true
    `, userID)

	if err != nil {
		log.Printf("Error querying user event agenda: %v", err)
		return nil, err
	}

	agenda := make([]Agenda, 0)
	for rows.Next() {
		var item Agenda
		if err := rows.Scan(&item.ID, &item.Title, &item.Description, &item.Date, &item.Location, &item.Published, &item.EventId); err != nil {
			log.Printf("Error scanning user event agenda item: %v", err)
			continue
		}
		agenda = append(agenda, item)
	}

	return agenda, nil
}

func RetrieveUserAgendaEvents(db *sql.DB, userID string) ([]Event, error) {
	rows, err := db.Query(`
		SELECT e.id, e.name
		FROM public.event e
		JOIN public.user_agenda ua ON e.id = ua.eventId
		WHERE ua.userId = $1
	`, userID)

	if err != nil {
		log.Printf("Error querying user event agenda: %v", err)
		return nil, err
	}

	events := make([]Event, 0)
	for rows.Next() {
		var event Event
		if err := rows.Scan(&event.ID, &event.Name); err != nil {
			log.Printf("Error scanning user event agenda item: %v", err)
			continue
		}
		events = append(events, event)
	}

	return events, nil
}

func EventExists(db *sql.DB, eventID string) bool {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM public.event WHERE id = $1)", eventID).Scan(&exists)
	if err != nil {
		log.Printf("Error checking if event exists: %v", err)
		return false
	}

	return exists
}

func AddEventToAgenda(db *sql.DB, userID string, eventID string) error {
	_, err := db.Exec(`
		INSERT INTO public.user_agenda (userId, eventId)
		VALUES ($1, $2)
	`, userID, eventID)

	if err != nil {
		log.Printf("Error adding event to user agenda: %v", err)
		return err
	}

	return nil
}

func RemoveEventFromAgenda(db *sql.DB, userID string, eventID string) error {
	_, err := db.Exec(`
		DELETE FROM public.user_agenda
		WHERE userId = $1 AND eventId = $2
	`, userID, eventID)

	if err != nil {
		log.Printf("Error removing event from user agenda: %v", err)
		return err
	}

	return nil
}

func GetDeviceToken(db *sql.DB, userid string) ([]string, error) {
	query := `
	WITH RECURSIVE user_tokens AS (
	    SELECT
	        d.token
	    FROM
	        public.devices d
	    JOIN
	        public.users u ON d.userId = u.id
	    WHERE
	        u.id = $1
	        AND d.deviceType = 'ios'
	    UNION ALL
	    SELECT
	        d.token
	    FROM
	        public.devices d
	    JOIN
	        public.users u ON d.userId = u.id
	    WHERE
	        u.schoolId = $1
	        AND d.deviceType = 'ios'
	    UNION ALL
	    SELECT
	        d.token
	    FROM
	        public.devices d
	    JOIN
	        public.users u ON d.userId = u.id
	    JOIN
	        public.user_agenda ua ON ua.userId = u.id
	    WHERE
	        ua.eventId = $1
	        AND d.deviceType = 'ios'
	)
	SELECT DISTINCT
	    token
	FROM
	    user_tokens;
	`

	rows, err := db.Query(query, userid)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %v", err)
	}
	defer rows.Close()

	var tokens []string
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			return nil, fmt.Errorf("failed to scan row: %v", err)
		}
		tokens = append(tokens, token)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %v", err)
	}

	return tokens, nil
}

func GetUsers(db *sql.DB, searchTerm string) ([]User, error) {
	var rows *sql.Rows
	var err error
	
	if searchTerm != "" {
		// Case insensitive search on fullname and shortname
		query := `
			SELECT id, fullname, shortname, schoolid 
			FROM users 
			WHERE 
				LOWER(fullname) LIKE LOWER($1) OR 
				LOWER(shortname) LIKE LOWER($1)
		`
		searchParam := "%" + searchTerm + "%"
		rows, err = db.Query(query, searchParam)
	} else {
		rows, err = db.Query("SELECT id, fullname, shortname, schoolid FROM users")
	}
	
	if err != nil {
		log.Printf("Error querying users: %v", err)
		return nil, err
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.FullName, &user.ShortName, &user.SchoolID); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}
		users = append(users, user)
	}

	return users, nil
}

func GetSchools(db *sql.DB, searchTerm string) ([]School, error) {
	var rows *sql.Rows
	var err error
	
	if searchTerm != "" {
		// Case insensitive search on school name
		query := `
			SELECT id, schoolname, privatecode 
			FROM school 
			WHERE LOWER(schoolname) LIKE LOWER($1)
		`
		searchParam := "%" + searchTerm + "%"
		rows, err = db.Query(query, searchParam)
	} else {
		rows, err = db.Query("SELECT id, schoolname, privatecode FROM school")
	}
	
	if err != nil {
		log.Printf("Error querying schools: %v", err)
		return nil, err
	}
	defer rows.Close()

	schools := make([]School, 0)
	for rows.Next() {
		var school School
		if err := rows.Scan(&school.ID, &school.Name, &school.PrivateCode); err != nil {
			log.Printf("Error scanning school: %v", err)
			continue
		}
		schools = append(schools, school)
	}

	return schools, nil
}

func GetAllAppleDeviceTokens(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT token FROM devices WHERE devicetype = 'ios'")
	if err != nil {
		log.Printf("Error querying device tokens: %v", err)
		return nil, err // Return nil and the error if the query fails
	}
	
	defer rows.Close()
	
	tokens := []string{}
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			log.Printf("Error scanning token: %v", err)
			continue
		}
		tokens = append(tokens, token)
	}

	return tokens, nil
}

func GetAllEvents(db *sql.DB, searchTerm string) ([]Event, error) {
	var rows *sql.Rows
	var err error
	
	if searchTerm != "" {
		query := `
			SELECT id, name
			FROM event
			WHERE LOWER(name) LIKE LOWER($1)
		`
		searchParam := "%" + searchTerm + "%"
		rows, err = db.Query(query, searchParam)
	} else {
		rows, err = db.Query("SELECT id, name FROM event")
	}
	
	if err != nil {
		log.Printf("Error querying events: %v", err)
		return nil, err
	}
	defer rows.Close()

	events := make([]Event, 0)
	for rows.Next() {
		var evt Event
		if err := rows.Scan(&evt.ID, &evt.Name); err != nil {
			log.Printf("Error scanning events: %v", err)
			continue
		}
		events = append(events, evt)
	}

	return events, nil
}