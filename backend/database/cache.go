package database

import (
	"database/sql"
	"errors"
	"log"
	"sync"
	"time"

	"github.com/lib/pq"
)

/*
I decided to keep this file with some functionality because it
doesn't make sense to store the notifiations and agenda in the
redis database and querying the database everytime a request
is made is not efficient. So I will keep this in memory
cache in the backend application.

In the future finding ways to store this in redis would be
optimal for scalability and redundancy.

- Trevor Besdson
*/

var cache sync.Map

// StartCachingScheduler starts a scheduler that runs every 5 seconds to load data into the cache
//
// I do this in this way to allow for the backend application to be scaled to increase redundancy
func StartCachingScheduler(db *sql.DB) {
	// Initial load should hold the thread up
	loadNotificationData(db)
	loadAgendaData(db)
	loadEventData(db)

	go func() {
		ticker := time.NewTicker(1000)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// Run these every second asynchronously
				loadNotificationData(db)
				loadAgendaData(db)
				loadEventData(db)
			}
		}
	}()
}

// loadNotificationData loads notification data into the cache from the database
func loadNotificationData(db *sql.DB) {
	rows, err := db.Query(`SELECT id, title, description, date, createdAt, published, private, type, userids FROM "notifications"`)
	if err != nil {
		log.Printf("Error querying notifications: %v", err)
		return
	}

	defer rows.Close()

	notifications := make([]Notification, 0)
	for rows.Next() {
		var notif Notification
		var userIDs pq.StringArray
		err := rows.Scan(&notif.ID, &notif.Title, &notif.Description, &notif.Date, &notif.CreatedAt, &notif.Published, &notif.Private, &notif.Type, &userIDs)
		if err != nil {
			log.Printf("Error scanning notifications: %v", err)
			return
		}
		notif.UserIDS = make([]string, 0)
        for _, id := range userIDs {
            notif.UserIDS = append(notif.UserIDS, id)
        }
		notifications = append(notifications, notif)
	}

	// Check for any errors encountered during the iteration
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating notifications: %v", err)
		return
	}

	cache.Store("notification_data", notifications)
}

// loadAgendaData loads agenda data into the cache from the database
func loadAgendaData(db *sql.DB) {
	rows, err := db.Query(`SELECT id, title, description, date, endtime, location, published, icon, createdAt FROM "agenda" WHERE eventid IS NULL`)
	if err != nil {
		log.Printf("Error querying agenda: %v", err)
		return
	}

	defer rows.Close()

	agendas := make([]Agenda, 0)
	for rows.Next() {
		var agenda Agenda
		err := rows.Scan(&agenda.ID, &agenda.Title, &agenda.Description, &agenda.Date, &agenda.EndTime, &agenda.Location, &agenda.Published, &agenda.Icon, &agenda.CreatedAt)
		if err != nil {
			log.Printf("Error scanning agenda: %v", err)
			return
		}
		agendas = append(agendas, agenda)
	}

	// Check for any errors encountered during the iteration
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating agenda: %v", err)
		return
	}

	cache.Store("agenda_data", agendas)
}

func loadEventData(db *sql.DB) {
	rows, err := db.Query(`SELECT id, name, location, "startTime", "endTime", createdAt FROM "event"`)
	if err != nil {
		log.Printf("Error querying events: %v", err)
		return
	}

	events := make([]Event, 0)
	for rows.Next() {
		var event Event
		err := rows.Scan(&event.ID, &event.Name, &event.Location, &event.StartTime, &event.EndTime, &event.CreatedAt)
		if err != nil {
			log.Printf("Error scanning event: %v", err)
			return
		}
		events = append(events, event)
	}

	rows.Close()

	rows, err = db.Query(`
		SELECT 
			finalists.userid, 
			finalists.eventid, 
			users.fullName, 
			school.schoolName 
		FROM 
			finalists 
		INNER JOIN 
			users ON finalists.userid = users.id
		INNER JOIN 
			school ON users.schoolId = school.id
	`)
	if err != nil {
		log.Printf("Error querying finalists: %v", err)
		return
	}

	finalists := make(map[string][]Finalist)
	for rows.Next() {
		var userid, eventid, fullName, schoolName string
		err := rows.Scan(&userid, &eventid, &fullName, &schoolName)
		if err != nil {
			log.Printf("Error scanning finalists: %v", err)
			return
		}
		finalists[eventid] = append(finalists[eventid], Finalist{
			Name:   fullName,
			School: schoolName, 
		})
	}

	rows.Close()
	
	for i, event := range events {
		if finalists[event.ID] != nil {
			events[i].Semifinalists = []string{}
		}
	}

	// Check for any errors encountered during the iteration
	if err := rows.Err(); err != nil {
		log.Printf("Error iterating events: %v", err)
		return
	}

	cache.Store("event_data", events)
}

func GetNotificationsCache() ([]Notification, error) {
	if val, ok := cache.Load("notification_data"); ok {
		return val.([]Notification), nil
	}

	return nil, errors.New("notification cache not loaded")
}

func GetAgendaCache() ([]Agenda, error) {
	if val, ok := cache.Load("agenda_data"); ok {
		return val.([]Agenda), nil
	}

	return nil, errors.New("agenda cache not loaded")
}

func GetEventCache() ([]Event, error) {
	if val, ok := cache.Load("event_data"); ok {
		return val.([]Event), nil
	}

	return nil, errors.New("event cache not loaded")
}

func AddAgendaItemToCache(agenda Agenda) {
	if val, ok := cache.Load("agenda_data"); ok {
		agendas := val.([]Agenda)
		agendas = append(agendas, agenda)
		cache.Store("agenda_data", agendas)
	}
}

func UpdateAgendaItemInCache(agenda Agenda) {
	if val, ok := cache.Load("agenda_data"); ok {
		agendas := val.([]Agenda)
		for i, a := range agendas {
			if a.ID == agenda.ID {
				agendas[i] = agenda
				cache.Store("agenda_data", agendas)
				return
			}
		}
	}

	c, _ := GetAgendaCache()
	log.Printf("Agenda cache: %v", c)
}

func DeleteAgendaItemFromCache(id string) {
	if val, ok := cache.Load("agenda_data"); ok {
		agendas := val.([]Agenda)
		for i, a := range agendas {
			if a.ID == id {
				agendas = append(agendas[:i], agendas[i+1:]...)
				cache.Store("agenda_data", agendas)
				return
			}
		}
	}
}

func AddEventToCache(event Event) {
	if val, ok := cache.Load("event_data"); ok {
		events := val.([]Event)
		events = append(events, event)
		cache.Store("event_data", events)
	}
}

func UpdateEventInCache(event Event) {
	if val, ok := cache.Load("event_data"); ok {
		events := val.([]Event)
		for i, e := range events {
			if e.ID == event.ID {
				events[i] = event
				cache.Store("event_data", events)
				return
			}
		}
	}
}

func DeleteEventFromCache(id string) {
	if val, ok := cache.Load("event_data"); ok {
		events := val.([]Event)
		for i, e := range events {
			if e.ID == id {
				events = append(events[:i], events[i+1:]...)
				cache.Store("event_data", events)
				return
			}
		}
	}
}

// AddNotificationToCache adds a new notification to the cache
func AddNotificationToCache(notification Notification) {
	if val, ok := cache.Load("notification_data"); ok {
		notifications := val.([]Notification)
		notifications = append(notifications, notification)
		cache.Store("notification_data", notifications)
	}
}

// UpdateNotificationInCache updates an existing notification in the cache
func UpdateNotificationInCache(notification Notification) {
	if val, ok := cache.Load("notification_data"); ok {
		notifications := val.([]Notification)
		for i, n := range notifications {
			if n.ID == notification.ID {
				notifications[i] = notification
				cache.Store("notification_data", notifications)
				return
			}
		}
	}
}

// DeleteNotificationFromCache removes a notification from the cache
func DeleteNotificationFromCache(id string) {
	if val, ok := cache.Load("notification_data"); ok {
		notifications := val.([]Notification)
		for i, n := range notifications {
			if n.ID == id {
				notifications = append(notifications[:i], notifications[i+1:]...)
				cache.Store("notification_data", notifications)
				return
			}
		}
	}
}