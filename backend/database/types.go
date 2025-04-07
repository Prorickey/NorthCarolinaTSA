package database

import (
	"time"
)

// Agenda represents the structure of the agenda table
type Agenda struct {
	ID          string       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	EndTime     time.Time  `json:"endTime"`
	EventId   	string       `json:"eventId,omitempty"` // This is optional, used for linking to events
	Location    string    `json:"location"`
	Icon        []byte    `json:"icon,omitempty"`
	Published   bool      `json:"published"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Notification represents the structure of the notifications table
type Notification struct {
	ID          string       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	Published   bool	  `json:"published"`

	// Optional fields
	Private   bool      `json:"private"` // If true, only certain users can see it
	UserIDS   []string  `json:"userids,omitempty"` // List of user IDs that can see this notification
	Type 	  string    `json:"type,omitempty"`    // Type of notification (e.g., "info", "alert", etc.)

	CreatedAt   time.Time `json:"createdAt"`
}

type ApiKey struct {
	ID        	string      `json:"id"`
	Key       	string    	`json:"key"`
	Purpose 	string  	`json:"purpose"`
	CreatedAt 	time.Time 	`json:"createdAt"`
}

type Finalist struct {
	Name   string `json:"name"`
	School string `json:"school"`
}

type Event struct {
	ID          string       `json:"id"`
	Name 	    string       `json:"name"`
	Location    string       `json:"location,omitempty"`
	StartTime   time.Time    `json:"startTime,omitempty"`
	EndTime     time.Time    `json:"endTime,omitempty"`
	CreatedAt   time.Time    `json:"createdAt,omitempty"`
	Semifinalists   []string `json:"semifinalists,omitempty"`
}

type User struct {
	ID        string `json:"id"`
	ShortName string    `json:"shortName"`
	FullName  string    `json:"fullName"`
	SchoolID  string `json:"school_id"`
}

type School struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PrivateCode string `json:"privateCode"`
}