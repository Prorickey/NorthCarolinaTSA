/*
    This table contains data about all the schools.

    id: A unique identifier for the school.
    tsaId: The unique identifier for the school in the TSA database.
    schoolName: The name of the school.
    privateCode: A unique code that is used to identify the school in the app.
 */
CREATE TABLE IF NOT EXISTS public.school (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tsaId           INTEGER UNIQUE,
    schoolName      TEXT NOT NULL,
    privateCode     TEXT NOT NULL UNIQUE
);

/*
    This table contains data about all the events.

    id: A unique identifier for the event.
    name: The name of the event.
 */
CREATE TABLE IF NOT EXISTS public.event (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name    TEXT NOT NULL,
    location TEXT NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table contains data about all the users.

    id: A unique identifier for the user.
    tsaId: The unique identifier for the user in the TSA database.
    shortName: The short name of the user.
    fullName: The full name of the user.
    email: The email address of the user.
    schoolId: The unique identifier of the school the user belongs to.
 */
CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tsaId           INTEGER UNIQUE,
    shortName       TEXT NOT NULL,
    fullName        TEXT NOT NULL,
    email           TEXT,
    schoolId        UUID REFERENCES public.school(id)
);

/*
    This table contains data about all the user tokens.

    id: A unique identifier for the user key.
    userId: The unique identifier of the user the key belongs to.
    key: The key of the user.
    createdAt: The date and time the key was created.
 */
CREATE TABLE IF NOT EXISTS public.user_tokens (
    id              SERIAL PRIMARY KEY,
    userId          UUID REFERENCES public.users(id),
    key             UUID NOT NULL DEFAULT gen_random_uuid(),
    expires         TIMESTAMP,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table contains data about all the user events.

    userId: The unique identifier of the user.
    eventId: The unique identifier of the event.
 */
CREATE TABLE IF NOT EXISTS public.user_event (
    userId     UUID REFERENCES public.users(id),
    eventId    UUID REFERENCES public.event(id),

    PRIMARY KEY (userId, eventId)
);

/*
    This table contains data about all the agenda items.

    id: A unique identifier for the agenda item.
    eventId: The unique identifier of the event the agenda item belongs to. Can be null if its the general agenda.
    title: The title of the agenda item.
    description: The description of the agenda item.
    date: The date of the agenda item.
    location: The location of the agenda item.
    icon: The icon of the agenda item.
    createdAt: The date and time the agenda item was created.
 */
CREATE TABLE IF NOT EXISTS public.agenda (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eventId     UUID REFERENCES public.event(id),
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    date        TIMESTAMP NOT NULL,
    endtime         TIMESTAMP NOT NULL,
    location    TEXT NOT NULL,
    published   BOOLEAN DEFAULT FALSE,
    icon        BYTEA,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table links users to events that they want to follow
    on their schedule. This can then be used to pull the events
    agenda from the agenda table. 

    userId: The unique identifier of the user.
    eventId: The unique identifier of the event.

    The primary key is a composite key of userId and eventId.
*/
CREATE TABLE IF NOT EXISTS public.user_agenda (
    userId     UUID REFERENCES public.users(id),
    eventId   UUID REFERENCES public.event(id),

    PRIMARY KEY (userId, eventId)
);

/*
    This table contains data about all the notifications.

    id: A unique identifier for the notification.
    title: The title of the notification.
    description: The description of the notification.
    date: The date of the notification.
    createdAt: The date and time the notification was created.
 */
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    date        TIMESTAMP NOT NULL,
    published   BOOLEAN DEFAULT FALSE,

    private   BOOLEAN DEFAULT FALSE,
    type      TEXT DEFAULT 'general', -- can be 'general', 'event', 'chapter'
    userids   UUID[] DEFAULT ARRAY[]::UUID[], -- array of user ids to send the notification to

    createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table contains the api keys for the admins and backend.

    id: A unique identifier for the api key.
    key: The api key.
    purpose: The purpose of the api key.
    createdAt: The date and time the api key was created.
 */
CREATE TABLE IF NOT EXISTS public.api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL,
    purpose     TEXT NOT NULL,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table contains data about all the admins.

    id: A unique identifier for the admin.
    shortName: The short name of the admin.
    fullName: The full name of the admin.
    role: The role of the admin.
    email: The email address of the admin.
    password: The password of the admin.
    apiKeyId: The unique identifier of the api key the admin belongs to.
 */
CREATE TABLE IF NOT EXISTS public.admins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortName   TEXT NOT NULL,
    fullName    TEXT NOT NULL,
    role        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password     TEXT NOT NULL,
    apiKeyId    UUID REFERENCES public.api_keys(id)
);

/*
    This table contains data about all the devices.

    id: A unique identifier for the device.
    deviceType: The type of the device.
    userId: The unique identifier of the user the device belongs to.
    token: The token of the device.
    createdAt: The date and time the device was created.
 */
CREATE TABLE IF NOT EXISTS public.devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deviceType  TEXT NOT NULL, 
    userId      UUID REFERENCES public.users(id),
    token       TEXT NOT NULL UNIQUE,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/*
    This table contains data about all the finalists.

    userid: The unique identifier of the user.
    eventid: The unique identifier of the event.
 */
CREATE TABLE IF NOT EXISTS public.finalists (
    userid UUID REFERENCES public.users(id),
    eventid UUID REFERENCES public.event(id)
);