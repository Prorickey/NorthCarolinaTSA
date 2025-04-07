# NCTSA Backend Routes

The api url is https://nctsa-api.bedson.tech

All example data is data gathered from the server through testing with development generated data. The format you see here is the
exact format that you will be working with. For example, it's important to note how the dates are formatted, and how you can extract 
the time from it. 

## Login Routes

These routes do not pass through the authorization middleware, you may access these without an authorization header. 

### POST /login

To gather the refresh token and the user id. The refresh token is required to create short lived tokens and it lasts 7 days. 

The school code is not case sensisitive. 

Post Body:
```json
{
    "tsaId": "2001", 
    "schoolCode": "NCSSM2025"
}
```
\* It's important to node that this is the only time we will use the tsaId, so there is no need
to store it on the client

Response Body:
```json
{
    "refreshToken": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiJlMD",
    "expiration": "2025-03-26T19:46:25.4661203-04:00",
    "userId": "e03a2edf-9bca-4696-9904-16f8a2755774"
}
```
\* This user id is the servers assigned id for the user, it must be stored on the client and will be used. This is not a private value, and should be 
displayed in an about section in case debugging is required

### POST /token

This creates the short lived tokens for general requests. This token lasts 15 minutes.

Post Body:
```json
{
    "userId": "e03a2edf-9bca-4696-9904-16f8a2755774",
    "refreshToken": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiJlMD"
}
```

Response Body: 
```json
{
    "token": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiIiLCJ0b2",
    "expiration": "2025-03-25T19:52:53.5213768-04:00"
}
```

### POST /token/refresh

This refreshed the refresh token... it expires too so we need to. It expires after 7 days currently, which may be extended to be about
a month or so, but that is the length of time that a user can go without opening the app, and still be logged in. 

Post Body: 
```
{
    "userId": "e03a2edf-9bca-4696-9904-16f8a2755774",
    "refreshToken": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiJlMD"
}
```

Response Body:
```json
{
    "refreshToken": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiJlMD",
    "expiration": "2025-03-26T19:46:25.4661203-04:00",
    "userId": "e03a2edf-9bca-4696-9904-16f8a2755774"
}
```

## User Routes - prefixed by /user

All these routes must contain the `Authorization` header. This token can be acquired through 
the /login and /token route. The token passed in Authorization is always the short lived token. 

### GET /user/ping

Check if the backend server is up

### GET /user/notifications

Get all previous notifications, will also include the users personal notifications

The valid types are `general`, `event`, and `chapter`.

Response Body: ```json
[
        {
        "id": "0d8b03fd-ca32-4c6a-a323-99a7cdb182fc",
        "title": "General Notification 2",
        "description": "This is another general notification.",
        "date": "2025-03-31T15:00:00Z",
        "published": true,
        "private": false,
        "type": "general",
        "createdAt": "2025-03-31T14:51:55.725582Z"
    },
    {
        "id": "7f245a73-6976-4014-8d20-889981c84335",
        "title": "Event Notification 1",
        "description": "This is an event notification.",
        "date": "2025-03-31T16:00:00Z",
        "published": true,
        "private": true,
        "type": "event",
        "createdAt": "2025-03-31T14:51:55.725582Z"
    }
]
```

### GET /user/agenda

Get the current agenda, will also include the users personal agenda

Response Body:
```json
[
    {
        "id": "3e1c2fe8-63ff-4d1e-ab35-4af3eb263701",
        "title": "test",
        "description": "test",
        "date": "2025-03-27T00:40:00Z",
        "location": "test",
        "published": true,
        "createdAt": "2025-03-26T20:40:35.094299Z"
    }
]
```

### GET /user/agenda/events

Get a list of events that are currently on the users agenda

Reponse Body:
```json
[
    {
        "id": "4c69bf4b-f90c-416c-b7d3-1d9be3d81eaa",
        "name": "HS Webmaster Team 1"
    }
]
```

### POST /user/agenda/events

To add an event to the users personal agenda.

Request Body:
```json
{
    "eventId": "4c69bf4b-f90c-416c-b7d3-1d9be3d81eaa"
}
```

Response Body:
```json
{
    "message": "Event added to personal agenda"
}
```

### DELETE /user/agenda/events/{id}

Delete an event from the users personal agenda

Response Body: 
```json
{
    "message": "Event removed from personal agenda"
}
```

### GET /user/events

Get all of the events at the conference


finalists might not exist

Reponse Body:
```json
[
    {
        "id": "a70c4d21-2785-407e-b1cf-424ce212f348",
        "name": "test",
        "location": "test",
        "startTime": "2025-03-27T15:17:08.973012Z",
        "endTime": "2025-03-27T16:16:59.415989Z",
        "createdAt": "2025-03-27T15:08:50.15202Z",
        "finalists": [
            {
                "name": "Trevor Bedson",
                "school": "North Carolina School of Science and Math"
            },
            {
                "name": "Josh Chilukuri",
                "school": "North Carolina School of the Goons"
            }
        ]
    }
]
```

## Admin Routes - prefixed by /admin

All of the admins routes require authentication with a token. This token is only given to admins on the webpanel.

### GET /admin/agenda

Gets the agenda with specific indicators that the admin panel needs. 

### POST /admin/agenda

Create an agenda item

### PUT /admin/agenda/{id}

Update an agenda item

### DELETE /admin/agenda/{id}

Delete an agenda item

### POST /admin/notifications

Create a notification